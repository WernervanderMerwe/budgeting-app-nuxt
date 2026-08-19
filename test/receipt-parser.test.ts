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
