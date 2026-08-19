/**
 * PDF handling for delivery and utility invoices (Sixty60, Mr D, Takealot,
 * municipal bills).
 *
 * These are NOT an OCR problem. They carry a real embedded text layer, which
 * reads out exactly and ~40x faster than recognising pixels. Routing them
 * through OCR would turn perfect text into a guess.
 *
 * The exception is a scanned bill — a PDF that is really just a photo. Those
 * have no meaningful text layer, so we render page 1 and fall through to OCR.
 */
import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf'
import type { OcrLine } from '~~/shared/utils/receipt-types'

/** Below this many non-whitespace characters, assume there is no real text layer. */
const MIN_TEXT_LAYER_CHARS = 24

/** A trailing amount that got glued to its label, e.g. "TOTAL R 255.27". */
const TRAILING_AMOUNT = /\s(-?R?\s?\d{1,3}(?:[ ,]\d{3})*[.,]\d{2})$/

/**
 * Turn extracted text into the same line/segment shape the OCR engine emits, so
 * both inputs converge on one parser.
 *
 * Columns in a PDF text layer are usually separated by runs of whitespace; a
 * trailing amount is split off explicitly so the parser's "last amount on the
 * row" rule works the same way it does for a till slip.
 */
export function textToLines(text: string): OcrLine[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((line, index) => {
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean)

      if (parts.length === 1) {
        const match = parts[0]!.match(TRAILING_AMOUNT)
        if (match) {
          parts[0] = parts[0]!.slice(0, match.index).trim()
          parts.push(match[1]!.trim())
        }
      }

      // PDFs have no pixel geometry; y ordering is all the parser needs.
      return parts.map((part, column) => ({
        text: part,
        box: { x: column * 100, y: index * 20, width: 90, height: 18 },
        confidence: 1, // a text layer is exact, not recognised
      }))
    })
    .filter(segments => segments.length > 0)
}

export interface PdfExtraction {
  /** Populated when the PDF had a usable text layer. */
  lines: OcrLine[] | null
  /** Populated instead when the PDF is a scan and must go through OCR. */
  imageToOcr: Buffer | null
  pages: number
}

export async function extractPdf(input: Buffer): Promise<PdfExtraction> {
  const pdf = await getDocumentProxy(new Uint8Array(input))
  const { text, totalPages } = await extractText(pdf, { mergePages: true })

  if (text.replace(/\s/g, '').length >= MIN_TEXT_LAYER_CHARS) {
    return { lines: textToLines(text), imageToOcr: null, pages: totalPages }
  }

  // Scanned bill: render page 1 and let the caller run OCR over it.
  // scale 2 because invoice type is small; the caller downscales anyway.
  const rendered = await renderPageAsImage(pdf, 1, { scale: 2 })
  return { lines: null, imageToOcr: Buffer.from(rendered), pages: totalPages }
}
