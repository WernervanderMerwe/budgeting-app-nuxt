import sharp from 'sharp'
import { recogniseImage } from '~~/server/utils/receipt-ocr'
import { extractPdf } from '~~/server/utils/receipt-pdf'
import { errors } from '~~/server/utils/errors'
import { parseReceipt } from '~~/shared/utils/receipt-parser'
import type { ParsedReceipt } from '~~/shared/utils/receipt-types'

/** Raster formats sharp can decode that a phone or scanner realistically produces. */
const ALLOWED_IMAGE_FORMATS = ['jpeg', 'png', 'webp', 'tiff', 'avif', 'heif', 'gif']

function isPdf(data: Buffer): boolean {
  // Magic bytes, not the client-supplied MIME type or filename.
  return data.length > 4 && data.subarray(0, 4).toString('latin1') === '%PDF'
}

export interface ScanResponse extends ParsedReceipt {
  /** 'pdf' when read from a text layer, 'ocr' when recognised from pixels. */
  source: 'pdf' | 'ocr'
}

/**
 * Scan an uploaded till slip or invoice and return prefilled transaction fields.
 *
 * Reads nothing from and writes nothing to the database — the client submits the
 * confirmed values through the existing POST /api/transactions. The uploaded
 * bytes are held in memory for the duration of the request only, never stored.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const maxBytes = config.receiptMaxSizeMb * 1024 * 1024

  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename)

  if (!file?.data?.length) {
    return errors.badRequest(event, 'No file uploaded')
  }

  if (file.data.byteLength > maxBytes) {
    const actual = (file.data.byteLength / 1024 / 1024).toFixed(1)
    return errors.badRequest(
      event,
      `File too large (${actual}MB). Maximum is ${config.receiptMaxSizeMb}MB`,
    )
  }

  const ocrOptions = {
    maxDimension: config.receiptMaxDimension,
    idleMs: config.receiptIdleMs,
    lockTimeoutMs: config.receiptLockTimeoutMs,
    modelDir: config.receiptModelDir,
  }

  try {
    // ── PDF: read the text layer; only fall back to OCR for a scanned bill ──
    if (isPdf(file.data)) {
      const extracted = await extractPdf(file.data)

      if (extracted.lines) {
        const parsed = parseReceipt(extracted.lines)
        return { ...parsed, source: 'pdf' }
      }

      const recognised = await recogniseImage(extracted.imageToOcr!, ocrOptions)
      const parsed = parseReceipt(recognised.lines)
      parsed.evidence.unshift('pdf: no text layer, fell back to OCR of page 1')
      return { ...parsed, source: 'ocr' }
    }

    // ── Image: validate by decoding, not by trusting the MIME type ──────────
    let format: string | undefined
    try {
      format = (await sharp(file.data).metadata()).format
    } catch {
      return errors.badRequest(event, 'Could not read that file as an image or PDF')
    }

    if (!format || !ALLOWED_IMAGE_FORMATS.includes(format)) {
      return errors.badRequest(
        event,
        `Unsupported image format "${format ?? 'unknown'}". Use JPEG, PNG, WebP, HEIC or a PDF`,
      )
    }

    const recognised = await recogniseImage(file.data, ocrOptions)
    const parsed = parseReceipt(recognised.lines)
    return { ...parsed, source: 'ocr' }
  } catch (error) {
    const message = (error as Error).message
    // The scan mutex timed out — something is wedged rather than merely busy.
    if (message.includes('scan lock')) {
      return errors.serverError(event, 'Scanner is busy, please try again', error as Error)
    }
    return errors.serverError(event, 'Failed to scan the receipt', error as Error)
  }
})
