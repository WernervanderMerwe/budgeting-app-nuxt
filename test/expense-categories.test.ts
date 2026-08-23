/**
 * Guards the one duplication the design knowingly accepts.
 *
 * `shared/utils/expense-categories.ts` restates the `ExpenseCategory` enum from
 * `prisma/schema.prisma`, because importing the Prisma client into a Vue
 * component would drag the query engine into the browser bundle. Two copies of
 * anything drift, so this test reads the schema and fails the moment they do.
 *
 * Reading a repo file keeps this pure — no DB, no network — which `pnpm test`
 * requires.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_HINTS,
  EXPENSE_CATEGORY_LABELS,
  expenseCategoryLabel,
  isExpenseCategory,
} from '../shared/utils/expense-categories'

const here = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(here, '..', 'prisma', 'schema.prisma'), 'utf8')

/** Pull the value list out of `enum ExpenseCategory { ... }`. */
function schemaEnumValues(): string[] {
  const block = /enum ExpenseCategory \{([\s\S]*?)\}/.exec(schema)
  assert.ok(block, 'enum ExpenseCategory not found in prisma/schema.prisma')
  return block[1]!
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^[A-Z][A-Z_]*$/.test(line))
}

describe('ExpenseCategory stays in sync with the Prisma enum', () => {
  it('has exactly the same values, in the same order', () => {
    assert.deepEqual(schemaEnumValues(), [...EXPENSE_CATEGORIES])
  })

  it('gives every value a display label', () => {
    for (const value of EXPENSE_CATEGORIES) {
      const label = EXPENSE_CATEGORY_LABELS[value]
      assert.ok(label && label.trim().length > 0, `${value} has no label`)
    }
  })

  it('has no orphan labels left behind by a removed value', () => {
    assert.deepEqual(
      Object.keys(EXPENSE_CATEGORY_LABELS).sort(),
      [...EXPENSE_CATEGORIES].sort(),
    )
  })

  it('gives every value a non-empty dropdown hint', () => {
    for (const value of EXPENSE_CATEGORIES) {
      const hint = EXPENSE_CATEGORY_HINTS[value]
      assert.ok(hint && hint.trim().length > 0, `${value} has no hint`)
    }
  })

  it('has no orphan hints left behind by a removed value', () => {
    assert.deepEqual(
      Object.keys(EXPENSE_CATEGORY_HINTS).sort(),
      [...EXPENSE_CATEGORIES].sort(),
    )
  })
})

describe('isExpenseCategory', () => {
  it('accepts every real value', () => {
    for (const value of EXPENSE_CATEGORIES) assert.equal(isExpenseCategory(value), true)
  })

  it('rejects near-misses and non-strings', () => {
    // Lowercase is the shape the OLD MerchantKind used ('fuel', 'eating-out'),
    // so a stale value must not sneak through during the migration.
    for (const value of ['fuel', 'eating-out', 'PHARMACY', '', null, undefined, 7, {}]) {
      assert.equal(isExpenseCategory(value), false, `${String(value)} should be rejected`)
    }
  })
})

describe('expenseCategoryLabel', () => {
  it('labels a known value', () => {
    assert.equal(expenseCategoryLabel('RESTAURANTS_AND_TAKEAWAYS'), 'Restaurants & Takeaways')
  })

  it('passes an unknown value through rather than showing nothing', () => {
    // A category tagged before an enum change should still render *something*.
    assert.equal(expenseCategoryLabel('SOMETHING_NEW'), 'SOMETHING_NEW')
  })

  it('is null for an untagged category', () => {
    assert.equal(expenseCategoryLabel(null), null)
    assert.equal(expenseCategoryLabel(undefined), null)
    assert.equal(expenseCategoryLabel(''), null)
  })
})
