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
  /**
   * The canonical brand name with NO branch/suburb suffix, e.g. "Spar" (never
   * "Spar Vredekloof"). Null when no known brand matched and the parser fell
   * back to raw OCR text, or when nothing was found at all — a fallback
   * string is one OCR'd store's own words, not a brand identity, so there is
   * nothing canonical to carry.
   *
   * `merchant` is a DISPLAY string: it is deliberately branch-qualified because
   * that reads better in the description box and users like seeing which Spar
   * they were at. `brand` exists because a display string must never double as
   * a mapping key — every shipped VendorMapping default is seeded with the
   * bare brand name ("Shell", "Spar"), so keying a lookup on `merchant` instead
   * misses on every slip that carries a branch/suburb line, which is most real
   * South African till slips. Use `brand` (falling back to `merchant` only
   * when `brand` is null) anywhere a vendor is being matched against
   * VendorMapping — resolving tags on scan, and as the learn key on save. Do
   * NOT re-merge these two fields into one; that is exactly the bug this field
   * exists to prevent.
   */
  brand: string | null
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
