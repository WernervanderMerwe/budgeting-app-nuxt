/**
 * Brand table.
 *
 * The dangerous cases here are false POSITIVES: a pattern that matches text
 * appearing on every slip would silently mislabel everything.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { BRANDS, canonicaliseVendor, normaliseVendorKey } from '../shared/utils/receipt-merchants'
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
  const cases: Array<[string, string]> = [
    ['SHOPRITE BRACKENFELL', 'Shoprite'],
    ['FOOD LOVERS MARKET', "Food Lover's Market"],
    ['SUPERSPAR TYGERVALLEY', 'Spar'],
    ['KWIKSPAR', 'Spar'],
    ['USAVE', 'Usave'],
    ['CHECKERS HYPER', 'Checkers'],
    ['CHECKERS SIXTY60', 'Checkers'],
    // OCR reads the stylised Sixty60 logo's zero as a capital O.
    ['CHECKERS SIXTY6O', 'Checkers'],
    ['SIXTY6O DELIVERY', 'Checkers'],
    ['SHELL VREDEKLOOF', 'Shell'],
    ['ENGEN 1 STOP', 'Engen'],
    ['NANDOS BRACKENFELL', "Nando's"],
    ['STEERS', 'Steers'],
    ['MUGG & BEAN', 'Mugg & Bean'],
    ['UBER EATS', 'Uber Eats'],
    ['STER-KINEKOR CANAL WALK', 'Ster-Kinekor'],
    ['NETFLIX.COM', 'Netflix'],
    ['CYCLE LAB', 'Cycle Lab'],
    ['CHRIS WILLEMSE CYCLES', 'Chris Willemse Cycles'],
    ['DIS-CHEM PHARMACY', 'Dis-Chem'],
    ['TAKEALOT.COM', 'Takealot'],
    ['CITY OF CAPE TOWN', 'City of Cape Town'],
  ]

  for (const [text, expectedName] of cases) {
    test(`${text} -> ${expectedName}`, () => {
      const result = merchantOf(text)
      assert.equal(result.merchant, expectedName)
    })
  }
})

describe('false positive traps', () => {
  test('the word TOTAL on every slip is never TotalEnergies', () => {
    // This is why there is no bare /TOTAL/ pattern in the table.
    const result = parseReceipt(rows('TOTAL | FOR 7 ITEMS | 303.93'))
    assert.notEqual(result.merchant, 'TotalEnergies')
  })

  test('no brand pattern matches the bare word TOTAL', () => {
    const matching = BRANDS.filter(b => b.pattern.test('TOTAL'))
    assert.deepEqual(matching.map(b => b.name), [],
      'a pattern matches "TOTAL" and will mislabel every slip')
  })

  test('a person\'s title and initial is not the Mr D delivery brand', () => {
    // "Mr D Nkosi" in a billing address used to match the bare \bMR ?D\b alias.
    const hits = BRANDS.filter(b => b.pattern.test('Mr D Nkosi')).map(b => b.name)
    assert.deepEqual(hits, [], `matched ${hits.join(', ')}`)
    assert.equal(merchantOf('MR D FOOD').merchant, 'Mr D')
  })

  test('generic single-word aliases are marked headOnly', () => {
    // These are ordinary English words; matched against a whole OCR'd invoice
    // rather than six header rows they would fire constantly.
    const generic = ['Clicks', 'Spur', 'Boxer', 'Rain', 'Game', 'PEP', 'BP', 'MTN']
    for (const name of generic) {
      const brand = BRANDS.find(b => b.name === name)
      assert.ok(brand, `${name} missing from the table`)
      assert.equal(brand!.headOnly, true, `${name} must be headOnly`)
    }
  })

  test('full brand names stay matchable outside the head', () => {
    // Splitting the risky aliases out must not cost the full names their reach.
    for (const [text, expected] of [
      ['PICK N PAY FAMILY', 'Pick n Pay'],
      ['MR PRICE HOME', 'Mr Price'],
      ['CITY OF CAPE TOWN', 'City of Cape Town'],
      ['PLAYSTATION NETWORK', 'PlayStation'],
      ['CHRIS WILLEMSE CYCLES', 'Chris Willemse Cycles'],
    ] as Array<[string, string]>) {
      const brand = BRANDS.find(b => b.pattern.test(text))
      assert.equal(brand?.name, expected, text)
      assert.notEqual(brand?.headOnly, true, `${expected} should not be headOnly`)
    }
  })

  test('BUILDERS does not match inside a longer word', () => {
    const hits = BRANDS.filter(b => b.pattern.test('REBUILDERSHIP')).map(b => b.name)
    assert.deepEqual(hits, [], `matched ${hits.join(', ')}`)
    assert.equal(merchantOf('BUILDERS WAREHOUSE').merchant, 'Builders')
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

describe('normaliseVendorKey', () => {
  test('uppercases', () => {
    assert.equal(normaliseVendorKey('shell'), 'SHELL')
  })

  test('collapses internal whitespace', () => {
    assert.equal(normaliseVendorKey('Shell   Vredekloof'), 'SHELL VREDEKLOOF')
  })

  test('trims leading and trailing whitespace', () => {
    assert.equal(normaliseVendorKey('  Shell  '), 'SHELL')
  })

  test('strips trailing punctuation', () => {
    assert.equal(normaliseVendorKey('Shell.'), 'SHELL')
    assert.equal(normaliseVendorKey('Shell,'), 'SHELL')
    assert.equal(normaliseVendorKey('Shell!'), 'SHELL')
  })

  test('leaves no trailing space after stripping trailing punctuation preceded by whitespace', () => {
    // "Shell ." previously normalised to "SHELL " (trailing space) because the
    // punctuation strip ran before the whitespace collapse could remove the
    // space that punctuation left behind. A final .trim() fixes this.
    const result = normaliseVendorKey('Shell .')
    assert.equal(result, 'SHELL')
    assert.equal(result.endsWith(' '), false)

    const result2 = normaliseVendorKey('Shell , ')
    assert.equal(result2, 'SHELL')
    assert.equal(result2.endsWith(' '), false)
  })

  test('"Shell", "Shell garage" and "shell" do not collide, but consistent variants do', () => {
    // The whole point: identical modulo case/whitespace/punctuation collapses
    // to one key so counts do not fragment.
    assert.equal(normaliseVendorKey('Shell'), normaliseVendorKey('shell'))
    assert.equal(normaliseVendorKey('Shell'), normaliseVendorKey('  SHELL.  '))
    assert.notEqual(normaliseVendorKey('Shell'), normaliseVendorKey('Shell garage'))
  })
})

describe('canonicaliseVendor', () => {
  test('collapses branch-qualified and hand-typed vendors onto the bare brand', () => {
    // The whole point: these are the strings a user actually saves, and every
    // shipped VendorMapping default is seeded on the bare brand name.
    assert.equal(canonicaliseVendor('Shell Vredekloof'), 'Shell')
    assert.equal(canonicaliseVendor('shell garage'), 'Shell')
    assert.equal(canonicaliseVendor('SHELL'), 'Shell')
    assert.equal(canonicaliseVendor('SUPERSPAR TYGERVALLEY'), 'Spar')
    assert.equal(canonicaliseVendor('Dischem Bellville'), 'Dis-Chem')
  })

  test('matches headOnly brands, unlike the parser', () => {
    // A user-typed vendor string is effectively all header — there is no
    // invoice body for a generic word to false-match against. See the
    // DELIBERATE DIFFERENCE note on canonicaliseVendor.
    assert.equal(canonicaliseVendor('BP garage'), 'BP')
    assert.equal(canonicaliseVendor('Clicks Tygervalley'), 'Clicks')
    assert.equal(canonicaliseVendor('PNP Express'), 'Pick n Pay')
  })

  test('returns null for a vendor no pattern knows', () => {
    assert.equal(canonicaliseVendor("Joe's Corner Cafe"), null)
    assert.equal(canonicaliseVendor(''), null)
  })

  test('does NOT match an OCR garble — that is the gap the review queue exists for', () => {
    // If a fuzzy match let "SHEL1" through, the review queue would never see
    // it and the missing regex would never get written. Failing loudly here is
    // the feature.
    assert.equal(canonicaliseVendor('SHEL1 VREDEKLOOF'), null)
  })

  test('first pattern wins, matching the parser ordering rule', () => {
    // BRANDS order is load-bearing in findMerchant; canonicaliseVendor must
    // not quietly disagree with it.
    const first = BRANDS.find(b => b.pattern.test('SUPERSPAR'))
    assert.equal(canonicaliseVendor('SUPERSPAR'), first?.name)
  })

  test('no pattern carries the /g flag, which would make .test() stateful', () => {
    // A global regex advances lastIndex between calls, so the same input would
    // match, then not match, then match again.
    for (const brand of BRANDS) {
      assert.equal(brand.pattern.global, false, String(brand.pattern))
    }
  })
})
