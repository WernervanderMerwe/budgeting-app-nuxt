/**
 * Shared receipt/invoice scanning types.
 *
 * These live in `shared/` because they are consumed by BOTH the Nitro server
 * (current) and potentially the browser (if OCR ever moves client-side).
 * Nothing in this directory may import `fs`, `Buffer`, `sharp`, or a file path.
 */

/** Bounding box of a recognised text segment, in pixels of the scanned image. */
export interface OcrBox {
  x: number
  y: number
  width: number
  height: number
}

/** One recognised chunk of text. A till slip row is usually several of these. */
export interface OcrSegment {
  text: string
  box: OcrBox
  /** 0..1 as reported by the OCR engine. PDF text layers are always 1. */
  confidence: number
}

/**
 * One visual row of the receipt, split into segments.
 *
 * The split matters: `TOTAL FOR 7 ITEMS 303.93` arrives as three separate
 * segments, which is what lets us take the LAST amount on the row rather than
 * the first number after the word TOTAL (which would be `7`).
 */
export type OcrLine = OcrSegment[]

export interface ParsedReceipt {
  /** e.g. "Spar Vredekloof". Null when nothing usable was found. */
  merchant: string | null
  /** Total in cents, per the project-wide money convention. */
  amountCents: number | null
  /** Unix timestamp in seconds, per the project-wide date convention. */
  transactionDate: number | null
  /** Human-readable date as parsed, for display in the confirm dialog. */
  dateText: string | null
  /** 0..1 confidence in `amountCents` specifically. Drives the confirm UI. */
  confidence: number
  /** Human-readable trace of how each field was derived. For debugging. */
  evidence: string[]
}
