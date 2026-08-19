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
import customParseFormat from 'dayjs/plugin/customParseFormat'
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
const DATE = /\b(\d{2})[./-](\d{2})[./-](\d{2}(?:\d{2})?)\b/

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

function findMerchant(rows: Row[], evidence: string[]): MerchantResult {
  // Store identity is always at the top; searching further down picks up
  // marketing footers ("NOW ON UBER EATS") instead.
  const head = rows.slice(0, Math.max(6, Math.ceil(rows.length / 3)))

  let brand: string | null = null
  let kind: MerchantKind | null = null
  let brandRow = -1
  outer: for (const { pattern, name, kind: brandKind } of BRANDS) {
    for (const [index, row] of head.entries()) {
      if (pattern.test(row.text)) {
        brand = name
        kind = brandKind
        brandRow = index
        evidence.push(`merchant: brand "${name}" (${brandKind}) matched in "${row.text}"`)
        break outer
      }
    }
  }

  // A nearby all-caps line that isn't the brand itself is usually the suburb.
  let branch: string | null = null
  for (const [index, row] of head.entries()) {
    const text = row.text.trim()
    if (NAME_NOISE.test(text)) continue
    // The row the brand matched is the brand itself, not a suburb. Comparing
    // strings here is unreliable ("Nando's" vs "NANDOS"), so use the index.
    if (index === brandRow) continue
    if (/^[A-Z][A-Z\s'&.-]{2,}$/.test(text)) {
      branch = titleCase(text.replace(/\s+/g, ' ').trim())
      evidence.push(`merchant: branch "${branch}" from "${text}"`)
      break
    }
  }

  if (!brand) {
    const first = head.find(r => !NAME_NOISE.test(r.text) && r.text.length > 2)
    if (!first) return { name: null, kind: null }
    evidence.push(`merchant: no known brand, fell back to "${first.text}"`)
    return { name: first.text.trim(), kind: null }
  }

  return { name: branch ? `${brand} ${branch}` : brand, kind }
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

function findDate(rows: Row[], evidence: string[]): { unix: number | null, text: string | null } {
  // A DATE-labelled row beats a bare match: slips carry other dd.mm.yy-shaped
  // numbers (loyalty expiry, promo windows).
  const labelled = rows.find(r => /\bDATE\b|\bTGL\b|\bDATUM\b/i.test(r.text) && DATE.test(r.text))
  const source = labelled ?? rows.find(r => DATE.test(r.text))
  if (!source) {
    evidence.push('date: none found')
    return { unix: null, text: null }
  }

  const match = source.text.match(DATE)!
  const [, dd, mm, yy] = match
  const year = yy!.length === 2 ? `20${yy}` : yy!
  const text = `${dd}/${mm}/${year}`

  // Strict parse rejects impossible dates (32/13/2026) that a loose parse rolls over.
  const parsed = dayjs(text, 'DD/MM/YYYY', true)
  if (!parsed.isValid()) {
    evidence.push(`date: "${text}" is not a valid date, ignored`)
    return { unix: null, text: null }
  }
  // A till slip cannot be from the future; a match that is means we grabbed
  // the wrong number (an expiry date, a phone number).
  if (parsed.isAfter(dayjs().add(1, 'day'))) {
    evidence.push(`date: "${text}" is in the future, ignored`)
    return { unix: null, text: null }
  }

  evidence.push(`date: from "${source.text}"${labelled ? ' (DATE-labelled)' : ''}`)
  return { unix: parsed.unix(), text }
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
