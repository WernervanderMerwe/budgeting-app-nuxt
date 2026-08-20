/**
 * Parser tests. Pure — no model, no image decoding, no network, no DB.
 *
 * Two halves:
 *  1. Every JSON fixture in test/fixtures/receipts/ is replayed through the
 *     parser and checked against its `expected` block. Adding a real slip means
 *     adding one file (see `pnpm receipt:fixture`), not writing new test code.
 *  2. Hand-built cases for traps that real slips only occasionally exhibit.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import dayjs from 'dayjs'
import { parseReceipt } from '../shared/utils/receipt-parser'
import type { OcrLine } from '../shared/utils/receipt-types'

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures/receipts')

interface Fixture {
  source: string
  overallConfidence: number
  expected: { merchant: string | null, amountCents: number | null, dateText: string | null }
  lines: OcrLine[]
}

/** Build rows from plain strings; `|` separates segments within a row. */
function rows(...spec: string[]): OcrLine[] {
  return spec.map((line, y) =>
    line.split('|').map((text, i) => ({
      text: text.trim(),
      box: { x: i * 100, y: y * 20, width: 90, height: 18 },
      confidence: 0.95,
    })),
  )
}

describe('captured slip fixtures', () => {
  const files = readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.json'))
  assert.ok(files.length > 0, 'expected at least one fixture')

  for (const file of files) {
    const fixture: Fixture = JSON.parse(readFileSync(join(FIXTURE_DIR, file), 'utf8'))
    test(`${file} (${fixture.source})`, () => {
      const result = parseReceipt(fixture.lines)
      assert.equal(result.merchant, fixture.expected.merchant, 'merchant')
      assert.equal(result.amountCents, fixture.expected.amountCents, 'amountCents')
      assert.equal(result.dateText, fixture.expected.dateText, 'dateText')
      // transactionDate must agree with the human-readable date it came from
      if (fixture.expected.dateText) {
        assert.equal(
          result.transactionDate,
          dayjs(fixture.expected.dateText, 'DD/MM/YYYY').unix(),
          'transactionDate matches dateText',
        )
      }
    })
  }
})

describe('total extraction', () => {
  test('takes the LAST amount on the row, not the first number after TOTAL', () => {
    // The Spar trap: a naive regex returns 7.
    const r = parseReceipt(rows('TOTAL | FOR 7 ITEMS | 303.93'))
    assert.equal(r.amountCents, 30393)
  })

  test('ignores SUBTOTAL', () => {
    const r = parseReceipt(rows('SUBTOTAL | 221.97', 'TOTAL | 255.27'))
    assert.equal(r.amountCents, 25527)
  })

  test('ignores the "saved you" decoy', () => {
    const r = parseReceipt(rows('TOTAL | FOR 7 ITEMS | 303.93', 'Today SPAR Saved You | 13.00'))
    assert.equal(r.amountCents, 30393)
  })

  test('voided item pairs do not become the total', () => {
    const r = parseReceipt(rows(
      '*L/STAR SHRED TUN 170G | 25.99',
      '*L/STAR SHRED TUN 170G | -25.99',
      'TOTAL | 303.93',
    ))
    assert.equal(r.amountCents, 30393)
  })

  test('falls back to TENDERED when TOTAL is unreadable', () => {
    const r = parseReceipt(rows('T0TAI | FOR 7 ITEMS | 303.93', 'TENDERED Credit Card | 303.93'))
    assert.equal(r.amountCents, 30393)
  })

  test('corroboration across rows raises confidence', () => {
    const alone = parseReceipt(rows('TOTAL | 303.93'))
    const agreeing = parseReceipt(rows('TOTAL | 303.93', 'TENDERED Credit Card | 303.93'))
    assert.ok(agreeing.confidence > alone.confidence,
      `expected ${agreeing.confidence} > ${alone.confidence}`)
  })

  test('no total found returns null rather than guessing', () => {
    const r = parseReceipt(rows('SPAR', 'VREDEKLOOF', 'thanks for shopping'))
    assert.equal(r.amountCents, null)
    assert.equal(r.confidence, 0)
  })

  test('handles thousands separators', () => {
    assert.equal(parseReceipt(rows('TOTAL | 1 234.56')).amountCents, 123456)
    assert.equal(parseReceipt(rows('TOTAL | R 1,234.56')).amountCents, 123456)
  })
})

describe('date extraction', () => {
  test('SA day-first dd.mm.yy', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'SLIP / TILL / DATE / TIME', '8816 | 005 | 19.08.26 17:54'))
    assert.equal(r.dateText, '19/08/2026')
  })

  test('prefers a DATE-labelled row over a bare match', () => {
    const r = parseReceipt(rows('Promo valid 01.01.26', 'TOTAL | 10.00', 'DATE: 19/08/2026'))
    assert.equal(r.dateText, '19/08/2026')
  })

  test('rejects an impossible date', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'DATE: 32/13/2026'))
    assert.equal(r.dateText, null)
  })

  test('rejects a future date', () => {
    const future = dayjs().add(2, 'year').format('DD/MM/YYYY')
    const r = parseReceipt(rows('TOTAL | 10.00', `DATE: ${future}`))
    assert.equal(r.dateText, null)
  })

  test('an amount is never mistaken for a date', () => {
    const r = parseReceipt(rows('TOTAL | 303.93'))
    assert.equal(r.dateText, null)
  })

  // Delivery and invoice receipts (Sixty60, Mr D, Takealot) never use dd/mm/yy;
  // they spell the month out. Without these the date field came back blank.
  test('day-first text month: "17 Aug, 2026"', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Delivered 17 Aug, 2026'))
    assert.equal(r.dateText, '17/08/2026')
  })

  test('day-first text month, full name and no comma', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Invoice date 3 May 2026'))
    assert.equal(r.dateText, '03/05/2026')
  })

  test('day-first text month with an ordinal suffix', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Placed on 21st Jul 2026'))
    assert.equal(r.dateText, '21/07/2026')
  })

  test('month-first text month: "Aug 17, 2026"', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Order date Aug 17, 2026'))
    assert.equal(r.dateText, '17/08/2026')
  })

  test('Afrikaans month abbreviations', () => {
    assert.equal(parseReceipt(rows('TOTAL | 10.00', '9 Okt 2025')).dateText, '09/10/2025')
    assert.equal(parseReceipt(rows('TOTAL | 10.00', '9 Des 2025')).dateText, '09/12/2025')
    assert.equal(parseReceipt(rows('TOTAL | 10.00', '9 Mrt 2026')).dateText, '09/03/2026')
  })

  test('ISO yyyy-mm-dd is read year-first, not day-first', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Invoice date: 2026-08-17'))
    assert.equal(r.dateText, '17/08/2026')
  })

  test('a numeric date on the slip beats a text date further down', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', '8816 005 251 19.08.26 17:54', 'Printed 20 Aug, 2026'))
    assert.equal(r.dateText, '19/08/2026')
  })

  test('a DATE-labelled text month still beats an unlabelled one', () => {
    const r = parseReceipt(rows('Promo ends 1 Jan 2026', 'TOTAL | 10.00', 'Date: 17 Aug 2026'))
    assert.equal(r.dateText, '17/08/2026')
  })

  test('rejects a future text date', () => {
    const future = dayjs().add(2, 'year').format('D MMM YYYY')
    const r = parseReceipt(rows('TOTAL | 10.00', `Delivered ${future}`))
    assert.equal(r.dateText, null)
  })

  test('rejects an impossible text date', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Delivered 31 Jun 2026'))
    assert.equal(r.dateText, null)
  })

  test('a month word without a day is not a date', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'AUGUST SPECIALS ON NOW'))
    assert.equal(r.dateText, null)
  })
})

describe('merchant extraction', () => {
  test('combines brand and branch', () => {
    const r = parseReceipt(rows('SPAR', 'VREDEKLOOF', 'VAT: 4910175696', 'TOTAL | 10.00'))
    assert.equal(r.merchant, 'Spar Vredekloof')
  })

  test('skips registration and contact noise', () => {
    const r = parseReceipt(rows('SHELL', 'VAT: 123456', 'TEL: 0219810720/1', 'TOTAL | 10.00'))
    assert.equal(r.merchant, 'Shell')
  })

  test('unknown brand falls back to the first clean line', () => {
    const r = parseReceipt(rows('JOE BLOGGS BUTCHERY', 'VAT: 999', 'TOTAL | 10.00'))
    assert.equal(r.merchant, 'JOE BLOGGS BUTCHERY')
  })

  test('does not pick up marketing footers', () => {
    const r = parseReceipt(rows(
      'SPAR', 'VREDEKLOOF', 'TOTAL | 10.00', 'NOW ON UBER EATS', 'EXCHANGES ONLY ALLOWED',
    ))
    assert.equal(r.merchant, 'Spar Vredekloof')
  })

  // Emailed invoices put the logo in the footer, so the top third finds nothing.
  // Falling back to the whole document beats falling back to "Tax Invoice".
  test('finds a brand below the top third when the head has none', () => {
    const r = parseReceipt(rows(
      'TAX INVOICE', 'Order 62213904', 'Delivered to 12 Kloof Street',
      '2 x Clover Fresh Milk 2L | 45.98', '1 x Albany White Bread | 21.99',
      '1 x Rooibos Tea 80s | 39.99', '3 x Bananas loose | 24.50',
      'Subtotal | 402.85', 'TOTAL | 437.85',
      'Thank you for shopping with Checkers Sixty60',
    ))
    assert.equal(r.merchant, 'Checkers')
    assert.equal(r.merchantKind, 'groceries')
  })

  test('the whole-document fallback does not glue on an unrelated header line', () => {
    const r = parseReceipt(rows(
      'TAX INVOICE', 'ORDER CONFIRMATION', 'blah', 'blah', 'blah', 'blah',
      'TOTAL | 437.85', 'Delivered by Checkers Sixty60',
    ))
    assert.equal(r.merchant, 'Checkers')
  })

  test('a brand in the head still wins over one in the footer', () => {
    const r = parseReceipt(rows(
      'SHELL', 'BELLVILLE', 'TOTAL | 10.00', 'NOW ON UBER EATS',
    ))
    assert.equal(r.merchant, 'Shell Bellville')
    assert.equal(r.merchantKind, 'fuel')
  })

  test('a priceless line item naming another brand is not the store', () => {
    // Sixty60 lists out-of-stock items with no price, so the amount filter
    // alone does not exclude them — the quantity marker is what catches it.
    const r = parseReceipt(rows(
      'TAX INVOICE', 'Order number | 62213904', 'Delivered 17 Aug, 2026',
      '2 x Clover Fresh Milk 2L | 45.98',
      'Not available: SPAR LONG LIFE MILK 1L x2',
      'Subtotal | 402.85', 'TOTAL | 437.85',
      'Delivered by Checkers SIXTY6O',
    ))
    assert.equal(r.merchant, 'Checkers')
    assert.equal(r.merchantKind, 'groceries')
  })

  test('a brand glued to its price in one segment is not the store', () => {
    const r = parseReceipt(rows(
      'TAX INVOICE', 'Order 991', 'a', 'b', 'c', 'd',
      'SPAR LONG LIFE MILK 1L 21.99',
      'TOTAL | 21.99', 'Takealot Online (Pty) Ltd',
    ))
    assert.equal(r.merchant, 'Takealot')
  })

  test('a price with a VAT marker still does not make a line item the store', () => {
    // "249.99 A" is not a clean amount segment, so the row looks unpriced.
    const r = parseReceipt(rows(
      'TAX INVOICE', 'Order 991', 'a', 'b', 'c', 'd',
      'SHELL HELIX 5W40 | 249.99 A',
      'TOTAL | 249.99', 'Takealot Online (Pty) Ltd',
    ))
    assert.equal(r.merchant, 'Takealot')
    assert.notEqual(r.merchantKind, 'fuel', 'would fire a false fuel mismatch warning')
  })

  test('the lowest brand near the foot wins, not the first in the table', () => {
    // Spar is BRANDS[0] and Checkers BRANDS[1]; position must decide, not order.
    const r = parseReceipt(rows(
      'TAX INVOICE', 'Order 991', 'a', 'b', 'c', 'd', 'e',
      'Substituted from SPAR range', 'TOTAL | 99.00', 'Delivered by Checkers Sixty60',
    ))
    assert.equal(r.merchant, 'Checkers')
  })

  test('marketing copy containing a generic brand word is not the store', () => {
    const r = parseReceipt(rows(
      'TAX INVOICE', 'Order 991', 'a', 'b', 'c', 'd', 'TOTAL | 199.00',
      'Reorder your favourites in two clicks',
      'Takealot Online (Pty) Ltd',
    ))
    assert.equal(r.merchant, 'Takealot')
    assert.notEqual(r.merchant, 'Clicks')
  })

  test('the whole-document fallback ignores priced line items', () => {
    // "SPAR LONG LIFE MILK" is stock on the shelf, not the store you are in.
    const r = parseReceipt(rows(
      'JOE BLOGGS CAFE', 'Order 12', 'blah', 'blah', 'blah', 'blah',
      'SPAR LONG LIFE MILK 1L | 21.99',
      'TOTAL | 21.99',
    ))
    assert.equal(r.merchant, 'JOE BLOGGS CAFE')
    assert.equal(r.merchantKind, null)
  })
})

// The layout that drove the text-month, footer-brand and O-for-zero fixes.
// TODO: replace with a captured fixture (`pnpm receipt:fixture`) once a real
// Sixty60 invoice is to hand — this is modelled on one, not taken from one.
describe('Sixty60-style delivery invoice', () => {
  const invoice = rows(
    'TAX INVOICE',
    'Order number | 62213904',
    'Delivered 17 Aug, 2026',
    '2 x Clover Fresh Milk 2L | 45.98',
    '1 x Albany White Bread | 21.99',
    'Subtotal | 402.85',
    'Delivery fee | 35.00',
    'TOTAL | 437.85',
    'Paid by Visa ending 4242 | 437.85',
    'Delivered by Checkers SIXTY6O',
  )

  test('merchant, total and date all come out', () => {
    const r = parseReceipt(invoice)
    assert.equal(r.merchant, 'Checkers')
    assert.equal(r.merchantKind, 'groceries')
    assert.equal(r.amountCents, 43785)
    assert.equal(r.dateText, '17/08/2026')
  })

  test('the subtotal and delivery fee are not mistaken for the total', () => {
    // Same money, totals block in the other order — some layouts print the
    // breakdown BELOW the total, where "last amount wins" would pick the fee.
    const reordered = rows(
      'TAX INVOICE',
      'Delivered 17 Aug, 2026',
      'TOTAL | 437.85',
      'Subtotal | 402.85',
      'Delivery fee | 35.00',
      'Delivered by Checkers SIXTY6O',
    )
    const r = parseReceipt(reordered)
    assert.equal(r.amountCents, 43785)
    assert.notEqual(r.amountCents, 40285, 'picked the subtotal')
    assert.notEqual(r.amountCents, 3500, 'picked the delivery fee')
  })
})

describe('date candidates beyond the first', () => {
  // Text months made loyalty-expiry and best-before lines visible to the date
  // matcher for the first time, and they usually sit ABOVE the real date.
  test('a future expiry above the real date does not blank the date', () => {
    const r = parseReceipt(rows(
      'SPAR', 'VREDEKLOOF', 'Points expire 31 Dec 2027',
      'TOTAL | 303.93', '8816 005 251 19.08.26 17:54',
    ))
    assert.equal(r.dateText, '19/08/2026')
  })

  test('an impossible date above a real one is skipped', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Best before 31 Jun 2026', 'Sold 17 Aug 2026'))
    assert.equal(r.dateText, '17/08/2026')
  })

  test('every candidate unusable still returns null', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Expires 31 Dec 2027', 'Valid to 1 Jan 2030'))
    assert.equal(r.dateText, null)
  })

  test('an ISO-shaped reference number does not shadow a real date on the same row', () => {
    // Ref 1234-56-78 is ISO-shaped but month 56, so it must fall through.
    const r = parseReceipt(rows('TOTAL | 10.00', 'Ref 1234-56-78 dated 19/08/2026'))
    assert.equal(r.dateText, '19/08/2026')
  })

  test('ISO wins over a numeric date in the SAME row', () => {
    const r = parseReceipt(rows('TOTAL | 10.00', 'Issued 2026-08-17 ref 03.05.26'))
    assert.equal(r.dateText, '17/08/2026')
  })
})

describe('more real date formats', () => {
  test('hyphenated text month', () => {
    assert.equal(parseReceipt(rows('TOTAL | 10.00', 'Date: 17-Aug-2026')).dateText, '17/08/2026')
  })

  test('slash-separated text month', () => {
    assert.equal(parseReceipt(rows('TOTAL | 10.00', 'Date: 17/Aug/2026')).dateText, '17/08/2026')
  })

  test('single-digit day and month', () => {
    assert.equal(parseReceipt(rows('TOTAL | 10.00', 'Date: 1/8/2026')).dateText, '01/08/2026')
  })

  test('Afrikaans full month name beats the 3-letter prefix', () => {
    // MAART must not truncate to MAR — this is what the longest-first sort is for.
    assert.equal(parseReceipt(rows('TOTAL | 10.00', '9 Maart 2026')).dateText, '09/03/2026')
  })

  test('September in all three spellings', () => {
    for (const month of ['Sep', 'Sept', 'September']) {
      assert.equal(
        parseReceipt(rows('TOTAL | 10.00', `3 ${month} 2025`)).dateText, '03/09/2025', month,
      )
    }
  })
})

describe('robustness', () => {
  test('empty input does not throw', () => {
    const r = parseReceipt([])
    assert.equal(r.merchant, null)
    assert.equal(r.amountCents, null)
    assert.equal(r.confidence, 0)
  })

  test('garbage input does not throw', () => {
    const r = parseReceipt(rows('EE2E | EEE5S44EREEE', '=========='))
    assert.equal(r.amountCents, null)
  })
})
