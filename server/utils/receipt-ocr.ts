/**
 * OCR service for receipt photos.
 *
 * Three things matter here, all driven by the VPS having ~1.2 GB free:
 *
 *  1. Scans are SERIALISED by an awaited mutex. A second concurrent scan waits
 *     rather than being rejected. Serialising is what pins peak memory around
 *     300 MB instead of 600 MB+.
 *  2. The session is kept WARM for `receiptIdleMs` after a scan, because the
 *     real usage pattern is a batch of slips. Initialising costs ~1.3s, so a
 *     destroy-per-scan would pay that on every slip in the pile.
 *  3. Images are DOWNSCALED before recognition. A raw 12MP photo peaks at
 *     771 MB; at 1200px it peaks around 300 MB with no loss of accuracy.
 *
 * IMPORTANT: import `ppu-paddle-ocr/web` (WASM), never `ppu-paddle-ocr`. The
 * latter pulls in `onnxruntime-node`, which is glibc-only and fails on the
 * node:22-alpine image with `ld-linux-x86-64.so.2: No such file`.
 */
import sharp from 'sharp'
import type { OcrLine } from '~~/shared/utils/receipt-types'

interface PaddleService {
  initialize: () => Promise<void>
  recognize: (image: ArrayBuffer, options?: { noCache?: boolean }) => Promise<{
    text: string
    confidence: number
    lines: Array<Array<{ text: string, box: { x: number, y: number, width: number, height: number }, confidence: number }>>
  }>
  destroy: () => Promise<void>
}

let service: PaddleService | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null

/** Tail of the scan queue. Each waiter chains onto the previous one. */
let lockTail: Promise<void> = Promise.resolve()

/**
 * Acquire the scan lock, waiting for any in-flight scan. Returns a release fn.
 * Rejects if the wait exceeds `timeoutMs`, so a wedged scan surfaces as one
 * clear error rather than an unbounded pile of hung requests.
 */
async function acquire(timeoutMs: number): Promise<() => void> {
  let release!: () => void
  const mine = new Promise<void>((resolve) => { release = resolve })
  const ahead = lockTail
  lockTail = lockTail.then(() => mine)

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      ahead,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out waiting for the scan lock')), timeoutMs)
      }),
    ])
  } catch (error) {
    release() // never strand the queue behind us
    throw error
  } finally {
    if (timer) clearTimeout(timer)
  }
  return release
}

async function getService(modelDir: string): Promise<PaddleService> {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  if (service) return service

  // `/web` = WASM runtime (musl-safe); ppu-ocv/canvas re-registers the Node
  // canvas over the browser one so image decoding works outside a browser.
  const { PaddleOcrService, MODEL_PRESETS } = await import('ppu-paddle-ocr/web')
  await import('ppu-ocv/canvas')

  // Baked into the image (see Dockerfile) so the first scan after a container
  // restart doesn't need internet or pay the GitHub download cold start.
  // Local dev has no baked dir, so it falls back to the library's own
  // download-and-cache-to-~/.cache behaviour.
  const model = modelDir
    ? {
        detection: `${modelDir}/PP-OCRv6_tiny_det.ort`,
        recognition: `${modelDir}/PP-OCRv6_tiny_rec.ort`,
        charactersDictionary: `${modelDir}/ppocrv6_tiny_dict.txt`,
      }
    : MODEL_PRESETS['v6-tiny']

  const created = new PaddleOcrService({ model }) as unknown as PaddleService
  await created.initialize()
  service = created
  return created
}

/** Release the warm session after the idle window so the RAM goes back. */
function scheduleRelease(idleMs: number): void {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    const stale = service
    service = null
    idleTimer = null
    void stale?.destroy().catch(() => { /* nothing useful to do on teardown */ })
  }, idleMs)
  // Don't hold the process open purely for a teardown timer.
  idleTimer.unref?.()
}

export interface OcrOptions {
  maxDimension: number
  idleMs: number
  lockTimeoutMs: number
  modelDir: string
}

export interface OcrResult {
  lines: OcrLine[]
  confidence: number
}

/**
 * Downscale an image and recognise its text.
 *
 * `.rotate()` applies EXIF orientation — without it a sideways phone photo
 * recognises badly. `withoutEnlargement` means an already-small image (a
 * WhatsApp-compressed slip, say) is passed through untouched.
 */
export async function recogniseImage(input: Buffer, options: OcrOptions): Promise<OcrResult> {
  const prepared = await sharp(input)
    .rotate()
    .resize(options.maxDimension, options.maxDimension, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer()

  const release = await acquire(options.lockTimeoutMs)
  try {
    const ocr = await getService(options.modelDir)
    const result = await ocr.recognize(
      prepared.buffer.slice(prepared.byteOffset, prepared.byteOffset + prepared.byteLength) as ArrayBuffer,
      { noCache: true },
    )
    return {
      lines: result.lines.map(line => (Array.isArray(line) ? line : [line])),
      confidence: result.confidence,
    }
  } finally {
    scheduleRelease(options.idleMs)
    release()
  }
}
