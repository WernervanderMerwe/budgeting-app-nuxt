/**
 * Brand table and category classification.
 *
 * The dangerous cases here are false POSITIVES: a pattern that matches text
 * appearing on every slip would silently mislabel everything.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { BRANDS, classifyCategoryName, isCategoryMismatch } from '../shared/utils/receipt-merchants'
import { parseReceipt } from '../shared/utils/receipt-parser'
import type { OcrLine } from '../shared/utils/receipt-types'

function rows(...spec: string[]): OcrLine[] {
  return spec.map((line, y) =>
    line.split('|').map((text, i) => ({
      text: text.trim(),
      box: { x: i * 100, y: y * 20, width: 90, height: 18 },
      confidence: 0.95,
    })),
  )
}

const merchantOf = (...lines: string[]) => parseReceipt(rows(...lines, 'TOTAL | 10.00'))

describe('brand recognition', () => {
  const cases: Array<[string, string, string]> = [
    ['SHOPRITE BRACKENFELL', 'Shoprite', 'groceries'],
    ['FOOD LOVERS MARKET', "Food Lover's Market", 'groceries'],
    ['SUPERSPAR TYGERVALLEY', 'Spar', 'groceries'],
    ['KWIKSPAR', 'Spar', 'groceries'],
    ['USAVE', 'Usave', 'groceries'],
    ['CHECKERS HYPER', 'Checkers', 'groceries'],
    ['SHELL VREDEKLOOF', 'Shell', 'fuel'],
    ['ENGEN 1 STOP', 'Engen', 'fuel'],
    ['NANDOS BRACKENFELL', "Nando's", 'eating-out'],
    ['STEERS', 'Steers', 'eating-out'],
    ['MUGG & BEAN', 'Mugg & Bean', 'eating-out'],
    ['UBER EATS', 'Uber Eats', 'eating-out'],
    ['STER-KINEKOR CANAL WALK', 'Ster-Kinekor', 'entertainment'],
    ['NETFLIX.COM', 'Netflix', 'entertainment'],
    ['CYCLE LAB', 'Cycle Lab', 'bicycle'],
    ['CHRIS WILLEMSE CYCLES', 'Chris Willemse Cycles', 'bicycle'],
    ['DIS-CHEM PHARMACY', 'Dis-Chem', 'pharmacy'],
    ['TAKEALOT.COM', 'Takealot', 'retail'],
    ['CITY OF CAPE TOWN', 'City of Cape Town', 'utilities'],
  ]

  for (const [text, expectedName, expectedKind] of cases) {
    test(`${text} -> ${expectedName} (${expectedKind})`, () => {
      const result = merchantOf(text)
      assert.equal(result.merchant, expectedName)
      assert.equal(result.merchantKind, expectedKind)
    })
  }
})

describe('false positive traps', () => {
  test('the word TOTAL on every slip is never TotalEnergies', () => {
    // This is why there is no bare /TOTAL/ pattern in the table.
    const result = parseReceipt(rows('TOTAL | FOR 7 ITEMS | 303.93'))
    assert.notEqual(result.merchant, 'TotalEnergies')
    assert.equal(result.merchantKind, null)
  })

  test('no brand pattern matches the bare word TOTAL', () => {
    const matching = BRANDS.filter(b => b.pattern.test('TOTAL'))
    assert.deepEqual(matching.map(b => b.name), [],
      'a pattern matches "TOTAL" and will mislabel every slip')
  })

  test('no brand pattern matches common slip boilerplate', () => {
    const boilerplate = [
      'TAX INVOICE', 'VAT RATE', 'CASHIER NAME', 'TENDERED', 'SUBTOTAL',
      'THANK YOU', 'EXCHANGES ONLY ALLOWED', 'CHANGE', 'BALANCE DUE',
    ]
    for (const text of boilerplate) {
      const hits = BRANDS.filter(b => b.pattern.test(text)).map(b => b.name)
      assert.deepEqual(hits, [], `"${text}" matched ${hits.join(', ')}`)
    }
  })
})

describe('category name classification', () => {
  const cases: Array<[string, string | null]> = [
    ['Groceries', 'groceries'],
    ['Fuel', 'fuel'],
    ['Fuel & Transport', 'fuel'],
    ['Eating Out', 'eating-out'],
    ['Entertainment', 'entertainment'],
    ['Bicycle Expenses', 'bicycle'],
    ['Bike stuff', 'bicycle'],
    ['Werner misc', null],
    ['Savings', null],
  ]
  for (const [name, expected] of cases) {
    test(`"${name}" -> ${expected}`, () => {
      assert.equal(classifyCategoryName(name), expected)
    })
  }

  test('"Car" is not classified as fuel (car repairs are not petrol)', () => {
    assert.equal(classifyCategoryName('Car'), null)
  })
})

describe('mismatch warning', () => {
  test('warns on a fuel slip going into groceries', () => {
    assert.equal(isCategoryMismatch('fuel', 'Groceries'), true)
  })

  test('silent when they agree', () => {
    assert.equal(isCategoryMismatch('fuel', 'Fuel'), false)
    assert.equal(isCategoryMismatch('groceries', 'Groceries'), false)
  })

  test('silent when the merchant is unknown', () => {
    assert.equal(isCategoryMismatch(null, 'Groceries'), false)
  })

  test('silent when the category name is unclassifiable', () => {
    assert.equal(isCategoryMismatch('fuel', 'Werner misc'), false)
  })
})
