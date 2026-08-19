#!/usr/bin/env node
/**
 * Capture a receipt image as a parser test fixture.
 *
 *   pnpm receipt:fixture <image> [name]
 *
 * Runs the image through the real OCR pipeline once and writes the recognised
 * lines to test/fixtures/receipts/<name>.json, together with the parser's
 * current guess. Fill in the `expected` block by hand, then `pnpm test` will
 * replay it forever — no model, no image, no network needed at test time.
 *
 * See docs/dev-workflow.md and docs/plans/2026-08-19-receipt-scanning-design.md
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { basename, join, extname } from 'node:path'
import sharp from 'sharp'

const [imagePath, nameArg] = process.argv.slice(2)

if (!imagePath) {
  console.error('usage: pnpm receipt:fixture <image> [name]')
  process.exit(1)
}

// Must match server-side preprocessing, or the fixture won't reflect reality.
const MAX_DIMENSION = Number(process.env.NUXT_RECEIPT_MAX_DIMENSION ?? 1200)

// `/web` = WASM ONNX runtime. onnxruntime-node is glibc-only and breaks the
// Alpine image; ppu-ocv/canvas re-registers the Node canvas over the web one.
const { PaddleOcrService, MODEL_PRESETS } = await import('ppu-paddle-ocr/web')
await import('ppu-ocv/canvas')

const name = (nameArg ?? basename(imagePath, extname(imagePath)))
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const outDir = join(process.cwd(), 'test/fixtures/receipts')
const outPath = join(outDir, `${name}.json`)

console.log(`Reading  ${imagePath}`)
const source = await readFile(imagePath)
const meta = await sharp(source).metadata()

const prepared = await sharp(source)
  .rotate() // honour EXIF orientation, else sideways phone photos OCR badly
  .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 90 })
  .toBuffer()
const after = await sharp(prepared).metadata()
console.log(`Resized  ${meta.width}x${meta.height} -> ${after.width}x${after.height}`)

const service = new PaddleOcrService({ model: MODEL_PRESETS['v6-tiny'] })
await service.initialize()
const started = performance.now()
let result
try {
  result = await service.recognize(
    prepared.buffer.slice(prepared.byteOffset, prepared.byteOffset + prepared.byteLength),
    { noCache: true },
  )
} finally {
  await service.destroy()
}
const elapsed = performance.now() - started

const round = n => Math.round(n)
const lines = result.lines.map(line => (Array.isArray(line) ? line : [line]).map(segment => ({
  text: segment.text,
  box: {
    x: round(segment.box.x),
    y: round(segment.box.y),
    width: round(segment.box.width),
    height: round(segment.box.height),
  },
  confidence: Number(segment.confidence.toFixed(4)),
})))

// Show the parser's current guess so the expected block is easy to fill in.
const { parseReceipt } = await import('../shared/utils/receipt-parser.ts')
  .catch(() => ({ parseReceipt: null }))
const guess = parseReceipt ? parseReceipt(lines) : null

await mkdir(outDir, { recursive: true })
await writeFile(outPath, JSON.stringify({
  source: basename(imagePath),
  capturedAt: new Date().toISOString().slice(0, 10),
  engine: `ppu-paddle-ocr v6-tiny @${MAX_DIMENSION}px`,
  overallConfidence: Number(result.confidence.toFixed(4)),
  expected: guess
    ? { merchant: guess.merchant, amountCents: guess.amountCents, dateText: guess.dateText }
    : { merchant: null, amountCents: null, dateText: null },
  lines,
}, null, 2) + '\n')

console.log(`OCR      ${lines.length} lines, confidence ${result.confidence.toFixed(3)}, ${elapsed.toFixed(0)}ms`)
if (guess) {
  console.log('\nParser guess (pre-filled into "expected" — CHECK IT against the slip):')
  console.log(`  merchant   : ${guess.merchant}`)
  console.log(`  amountCents: ${guess.amountCents}  (R ${(guess.amountCents / 100).toFixed(2)})`)
  console.log(`  dateText   : ${guess.dateText}`)
  for (const line of guess.evidence) console.log(`  · ${line}`)
}
console.log(`\nWrote ${outPath}`)
console.log('Next: correct the "expected" block if the guess is wrong, then run `pnpm test`.')
