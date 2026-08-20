/**
 * Receipt / invoice parser.
 *
 * Pure and runtime-agnostic: takes recognised text lines and returns the three
 * fields a TransactionEntry needs. Runs identically under Nitro and in the
 * browser, which is what keeps the server -> client move cheap.
 *
 * Deliberately NOT an LLM. The heuristics below are tuned against real South
 * African till slips; extend the fixtures in test/fixtures/receipts/ as new
 * retailer layouts turn up. See docs/plans/2026-08-19-receipt-scanning-design.md
 */
import dayjs from 'dayjs'
// The `.js` is load-bearing. Nitro leaves dayjs external, so Node's ESM
// resolver handles this import at runtime and dayjs publishes no `exports`
// map for plugin subpaths — extensionless it crashes the built server on
// boot with ERR_MODULE_NOT_FOUND. Dev and tests resolve it either way,
// so only `pnpm qa:up` catches this.
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import type { OcrLine, OcrSegment, ParsedReceipt } from './receipt-types'
import { BRANDS, type MerchantKind } from './receipt-merchants'

dayjs.extend(customParseFormat)

/** Lines that are never part of a store name (registration numbers, contact details). */
const NAME_NOISE = /^(VAT|TEL|FAX|REG|CO|TAX|NPWP|R)\b|^[\d\s.,:/*=-]+$/i

/**
 * An amount, SA formatting: `303.93`, `1 234.56`, `1,234.56`, `R 51.99`, `-13.00`.
 * Anchored so that `19.08.26` (a date) and bare integers can never match.
 */
const AMOUNT = /^-?R?\s?\d{1,3}(?:[ ,]\d{3})*[.,]\d{2}$/

/** `19.08.26`, `19/08/2026`, `19-08-2026`. SA order is always day-first. */
const NUMERIC_DATE = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2}(?:\d{2})?)\b/

/** `2026-08-17`. Unambiguous, so it is read year-first rather than day-first. */
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/

/**
 * Month names as they appear on SA receipts, English and Afrikaans.
 *
 * Delivery and invoice receipts (Sixty60, Mr D, Takealot) never print dd/mm/yy —
 * they spell the month out, so without this their date field came back blank.
 * Spelled in full rather than matched as a 3-letter prefix + `[A-Z]*`, which
 * would let "MARKET 17, 2026" read as a March date.
 */
const MONTHS: Record<string, number> = {
  JANUARY: 1, JANUARIE: 1, JAN: 1,
  FEBRUARY: 2, FEBRUARIE: 2, FEB: 2,
  MARCH: 3, MAART: 3, MAR: 3, MRT: 3,
  APRIL: 4, APR: 4,
  MAY: 5, MEI: 5,
  JUNE: 6, JUNIE: 6, JUN: 6,
  JULY: 7, JULIE: 7, JUL: 7,
  AUGUST: 8, AUGUSTUS: 8, AUG: 8,
  SEPTEMBER: 9, SEPT: 9, SEP: 9,
  OCTOBER: 10, OKTOBER: 10, OCT: 10, OKT: 10,
  NOVEMBER: 11, NOV: 11,
  DECEMBER: 12, DESEMBER: 12, DEC: 12, DES: 12,
}

/**
 * Longest alternative first so `MAART` is preferred over `MAR`.
 *
 * Interpolated raw into `new RegExp`, which is safe only because every key
 * above is plain `[A-Z]`. Keep it that way — a key containing `.` or `(`
 * would become regex syntax.
 */
const MONTH_WORD = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')
const ORDINAL = '(?:ST|ND|RD|TH)?'

/**
 * Separator between the parts of a spelled-out date. Municipal and emailed
 * invoices use hyphens and slashes as readily as spaces: `17-Aug-2026`.
 */
const SEP = '[\\s./-]+'

/** `17 Aug, 2026`, `3 May 2026`, `21st Jul 26`, `17-Aug-2026`. */
const TEXT_DATE_DMY = new RegExp(
  `\\b(\\d{1,2})${ORDINAL}${SEP}(${MONTH_WORD})\\b\\.?,?${SEP}(\\d{4}|\\d{2})\\b`, 'i',
)

/** `Aug 17, 2026` — the order Takealot and some emailed invoices use. */
const TEXT_DATE_MDY = new RegExp(
  `\\b(${MONTH_WORD})\\b\\.?${SEP}(\\d{1,2})${ORDINAL},?${SEP}(\\d{4}|\\d{2})\\b`, 'i',
)

/**
 * Rows whose amount is never the transaction total, even though they sit near
 * it and often contain the word "total". Checked before the TOTAL heuristic.
 */
const DECOY = /SAVED|SAVING|CHANGE|KEMBALIAN|ROUNDING|DISCOUNT|PROMO|POINTS|BALANCE(?! DUE)|SUB-?TOTAL|TOTAL ITEMS|TOTAL ?ITEM\b|VAT RATE/i

/** Rows that corroborate or substitute for the total when TOTAL is unreadable. */
const FALLBACK_TOTAL = /TENDER|AMOUNT DUE|BALANCE DUE|CARD|CASH|PAID/i

function parseAmountToCents(raw: string): number {
  const cleaned = raw
    .replace(/[R\s]/g, '')
    .replace(/,(?=\d{3}\b)/g, '') // thousands separator
    .replace(',', '.') // decimal comma
  return Math.round(parseFloat(cleaned) * 100)
}

function titleCase(input: string): string {
  return input.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())
}

/** Accept either grouped rows or a flat segment list (PDF text layers give the latter). */
function toRows(lines: OcrLine[] | OcrSegment[]): OcrLine[] {
  return (lines as Array<OcrLine | OcrSegment>).map(line =>
    Array.isArray(line) ? line : [line],
  )
}

interface Row {
  segments: OcrLine
  text: string
  confidence: number
  amounts: number[]
}

function toRow(segments: OcrLine): Row {
  const amounts = segments
    .map(s => s.text.trim())
    .filter(t => AMOUNT.test(t))
    .map(parseAmountToCents)
  return {
    segments,
    text: segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim(),
    confidence: Math.min(...segments.map(s => s.confidence ?? 1)),
    amounts,
  }
}

interface MerchantResult { name: string | null, kind: MerchantKind | null }

interface BrandHit { name: string, kind: MerchantKind, row: Row }

/**
 * A quantity marker: `2 x Clover Fresh Milk`, `Not available: ... x2`. Only ever
 * appears on a line item, never in a store name.
 */
const LINE_ITEM = /^\s*\d+\s*[x*]\s|\bx\s?\d+\b/i

/**
 * Rows that could plausibly BE the store's identity.
 *
 * Drops anything carrying a price or a quantity, so a shelf item ("SPAR LONG
 * LIFE MILK 1L  21.99", "Not available: SPAR LONG LIFE MILK 1L x2") is not read
 * as the store you are standing in.
 *
 * The price half only catches an amount the OCR split into its own segment; a
 * merged "SPAR LONG LIFE MILK 1L 21.99" segment, or one carrying a VAT marker
 * ("21.99 A"), still looks unpriced. It is a filter, not a guarantee — which is
 * why the widened search below is also position-restricted.
 */
function identityRows(rows: Row[]): Row[] {
  return rows.filter(r => !r.amounts.length && !LINE_ITEM.test(r.text))
}

/** First brand in table order. Used for the head, where the top line wins. */
function matchBrandInOrder(rows: Row[]): BrandHit | null {
  for (const { pattern, name, kind } of BRANDS) {
    for (const row of rows) {
      if (pattern.test(row.text)) return { name, kind, row }
    }
  }
  return null
}

/**
 * LOWEST brand match, i.e. closest to the foot of the receipt.
 *
 * Table order must not decide this one. An invoice listing a Spar product and
 * signed off "Delivered by Checkers Sixty60" would otherwise resolve to Spar
 * purely because Spar sits first in BRANDS — the footer line is the logo, the
 * one further up is stock. `headOnly` brands are skipped entirely here.
 */
function matchBrandLowest(rows: Row[]): BrandHit | null {
  let best: BrandHit | null = null
  let bestIndex = -1
  for (const { pattern, name, kind, headOnly } of BRANDS) {
    if (headOnly) continue
    for (const [index, row] of rows.entries()) {
      if (index > bestIndex && pattern.test(row.text)) {
        best = { name, kind, row }
        bestIndex = index
      }
    }
  }
  return best
}

/** A nearby all-caps line that isn't the brand itself is usually the suburb. */
function findBranch(head: Row[], brandRow: Row, evidence: string[]): string | null {
  for (const row of head) {
    const text = row.text.trim()
    if (NAME_NOISE.test(text)) continue
    // The row the brand matched is the brand itself, not a suburb.
    if (row === brandRow) continue
    if (/^[A-Z][A-Z\s'&.-]{2,}$/.test(text)) {
      const branch = titleCase(text.replace(/\s+/g, ' ').trim())
      evidence.push(`merchant: branch "${branch}" from "${text}"`)
      return branch
    }
  }
  return null
}

function findMerchant(rows: Row[], evidence: string[]): MerchantResult {
  const window = Math.max(6, Math.ceil(rows.length / 3))
  const head = rows.slice(0, window)

  // Store identity is normally at the top.
  const inHead = matchBrandInOrder(identityRows(head))
  if (inHead) {
    evidence.push(
      `merchant: brand "${inHead.name}" (${inHead.kind}) matched in "${inHead.row.text}"`,
    )
    const branch = findBranch(head, inHead.row, evidence)
    return { name: branch ? `${inHead.name} ${branch}` : inHead.name, kind: inHead.kind }
  }

  // Emailed invoices (Sixty60, Mr D, Takealot) carry an order header at the top
  // and the brand only in the footer, so the head finds nothing. Widen to the
  // TAIL — not the whole document, which would expose every line item in the
  // middle of the slip to a brand-name false positive.
  const tail = rows.slice(-window)
  const inTail = matchBrandLowest(identityRows(tail))
  if (inTail) {
    evidence.push(
      `merchant: no brand in the top third; "${inTail.name}" (${inTail.kind}) matched `
      + `near the foot in "${inTail.row.text}"`,
    )
    // No branch: an all-caps line in the head ("TAX INVOICE", "ORDER
    // CONFIRMATION") has nothing to do with a brand found in the footer.
    return { name: inTail.name, kind: inTail.kind }
  }

  const first = head.find(r => !NAME_NOISE.test(r.text) && r.text.length > 2)
  if (!first) return { name: null, kind: null }
  evidence.push(`merchant: no known brand, fell back to "${first.text}"`)
  return { name: first.text.trim(), kind: null }
}

function findAmount(rows: Row[], evidence: string[]): { cents: number | null, confidence: number } {
  const candidates: Array<{ cents: number, kind: string, confidence: number, text: string }> = []

  for (const row of rows) {
    if (!row.amounts.length) continue
    if (DECOY.test(row.text)) continue

    const hasTotal = row.segments.some(s => /^\**\s*TOTAA?L\b/i.test(s.text.trim()))
    const isFallback = FALLBACK_TOTAL.test(row.text)
    if (!hasTotal && !isFallback) continue

    // Last amount on the row: `TOTAL | FOR 7 ITEMS | 303.93`.
    candidates.push({
      cents: row.amounts[row.amounts.length - 1]!,
      kind: hasTotal ? 'TOTAL' : 'TENDERED',
      confidence: row.confidence,
      text: row.text,
    })
  }

  if (!candidates.length) {
    evidence.push('amount: no TOTAL or tendered row found')
    return { cents: null, confidence: 0 }
  }

  const primary = candidates.find(c => c.kind === 'TOTAL') ?? candidates[0]!
  const agreeing = candidates.filter(c => c.cents === primary.cents).length

  // Corroboration across rows is the strongest signal a slip offers: on a Spar
  // slip TOTAL, TENDERED and the VAT "incl." column all carry the same value.
  const confidence = Math.min(1, primary.confidence * (agreeing > 1 ? 1 : 0.9))
  evidence.push(
    `amount: from ${primary.kind} row "${primary.text}"; ${agreeing} row(s) agree`,
  )
  return { cents: primary.cents, confidence }
}

interface DateParts { dd: string, mm: string, yyyy: string }

/** Rows that announce a date, which outrank a bare match wherever they sit. */
const DATE_LABEL = /\bDATE\b|\bTGL\b|\bDATUM\b/i

/** Two-digit years on a receipt are always this century. */
function fourDigitYear(year: string): string {
  return year.length === 2 ? `20${year}` : year
}

/**
 * Cheap range check, so an implausible reading falls through to the NEXT format
 * in the same row rather than being returned and rejected later. `Ref 1234-56-78`
 * is ISO-shaped but month 56; without this it would shadow a real date sitting
 * further along the same line.
 */
function plausible(parts: DateParts): boolean {
  const mm = Number(parts.mm)
  const dd = Number(parts.dd)
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31
}

function textDateParts(day: string, month: string, year: string): DateParts {
  return {
    dd: day.padStart(2, '0'),
    mm: String(MONTHS[month.toUpperCase()]!).padStart(2, '0'),
    yyyy: fourDigitYear(year),
  }
}

/**
 * First plausible date in a row, in order of how unambiguous the format is.
 *
 * ISO is checked first because `2026-08-17` is year-first; every other supported
 * form is day-first, which is the SA convention.
 */
function matchDate(text: string): DateParts | null {
  const iso = text.match(ISO_DATE)
  if (iso) {
    const parts = { dd: iso[3]!, mm: iso[2]!, yyyy: iso[1]! }
    if (plausible(parts)) return parts
  }

  const numeric = text.match(NUMERIC_DATE)
  if (numeric) {
    const parts = { dd: numeric[1]!.padStart(2, '0'), mm: numeric[2]!.padStart(2, '0'), yyyy: fourDigitYear(numeric[3]!) }
    if (plausible(parts)) return parts
  }

  const dmy = text.match(TEXT_DATE_DMY)
  if (dmy) {
    const parts = textDateParts(dmy[1]!, dmy[2]!, dmy[3]!)
    if (plausible(parts)) return parts
  }

  const mdy = text.match(TEXT_DATE_MDY)
  if (mdy) {
    const parts = textDateParts(mdy[2]!, mdy[1]!, mdy[3]!)
    if (plausible(parts)) return parts
  }

  return null
}

function findDate(rows: Row[], evidence: string[]): { unix: number | null, text: string | null } {
  // EVERY date-shaped row is a candidate, not just the first.
  //
  // Slips carry plenty of other dates — loyalty-point expiry, "best before",
  // promo windows, Takealot's estimated delivery — and they frequently sit
  // ABOVE the real one. Committing to the first match and giving up when it
  // fails validation loses the date entirely on those layouts.
  const matched = rows
    .map(row => ({ row, parts: matchDate(row.text) }))
    .filter((c): c is { row: Row, parts: DateParts } => c.parts !== null)

  // A DATE-labelled row wins wherever it sits; otherwise top-down order.
  const candidates = [
    ...matched.filter(c => DATE_LABEL.test(c.row.text)),
    ...matched.filter(c => !DATE_LABEL.test(c.row.text)),
  ]

  if (!candidates.length) {
    evidence.push('date: none found')
    return { unix: null, text: null }
  }

  const rejected: string[] = []
  for (const { row, parts } of candidates) {
    const text = `${parts.dd}/${parts.mm}/${parts.yyyy}`

    // Strict parse rejects impossible dates (32/13/2026, 31 Jun) that a loose
    // parse rolls over into the following month.
    const parsed = dayjs(text, 'DD/MM/YYYY', true)
    if (!parsed.isValid()) {
      rejected.push(`"${text}" is not a real date`)
      continue
    }
    // A till slip cannot be from the future; a match that is means we grabbed
    // the wrong number (an expiry date, a phone number).
    if (parsed.isAfter(dayjs().add(1, 'day'))) {
      rejected.push(`"${text}" is in the future`)
      continue
    }

    const labelled = DATE_LABEL.test(row.text)
    if (rejected.length) evidence.push(`date: skipped ${rejected.join(', ')}`)
    evidence.push(`date: from "${row.text}"${labelled ? ' (DATE-labelled)' : ''}`)
    return { unix: parsed.unix(), text }
  }

  evidence.push(`date: no usable date — rejected ${rejected.join(', ')}`)
  return { unix: null, text: null }
}

/**
 * Parse recognised receipt text into the fields a TransactionEntry needs.
 *
 * Never throws: an unparseable receipt returns nulls so the confirm dialog can
 * open with blank fields rather than a wrong guess.
 */
export function parseReceipt(lines: OcrLine[] | OcrSegment[]): ParsedReceipt {
  const evidence: string[] = []
  const rows = toRows(lines).map(toRow).filter(r => r.text.length > 0)

  if (!rows.length) {
    return {
      merchant: null,
      merchantKind: null,
      amountCents: null,
      transactionDate: null,
      dateText: null,
      confidence: 0,
      evidence: ['no text recognised'],
    }
  }

  const merchant = findMerchant(rows, evidence)
  const { cents, confidence } = findAmount(rows, evidence)
  const { unix, text } = findDate(rows, evidence)

  return {
    merchant: merchant.name,
    merchantKind: merchant.kind,
    amountCents: cents,
    transactionDate: unix,
    dateText: text,
    confidence: Number(confidence.toFixed(3)),
    evidence,
  }
}
