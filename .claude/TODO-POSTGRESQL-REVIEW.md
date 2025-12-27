# PostgreSQL Schema Review - TODO

Based on the `postgresql` skill guidelines. Review and apply as needed.

## Priority: High - Missing FK Indexes (COMPLETED)

PostgreSQL does NOT auto-index foreign key columns. These are critical for join performance and preventing lock contention.

- [x] `TransactionFixedPayment` - add `@@index([monthId])`
- [x] `TransactionCategory` - add `@@index([monthId])`
- [x] `TransactionEntry` - add `@@index([categoryId])`
- [x] `YearlyIncomeSource` - add `@@index([yearlyBudgetId])`
- [x] `YearlyIncomeEntry` - add `@@index([incomeSourceId])`
- [x] `YearlyDeduction` - add `@@index([incomeEntryId])`
- [x] `YearlySection` - add `@@index([yearlyBudgetId])`
- [x] `YearlyCategory` - add `@@index([sectionId])` and `@@index([parentId])`
- [x] `YearlyCategoryEntry` - add `@@index([categoryId])`

> Applied via migration `20251227000000_add_fk_indexes`

## Priority: Medium - Data Type Considerations

### Timestamps
Current: Unix timestamps as `Int`
Recommendation: `TIMESTAMPTZ` is PostgreSQL best practice

```prisma
// Current
createdAt Int @map("created_at")

// Recommended
createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
```

**Trade-off:** Your current approach (unix ints + dayjs) is consistent and works. Migration would require data conversion. Consider for new projects or major refactor.

### Primary Keys
Current: `Int @id @default(autoincrement())`
Recommendation: `BIGINT GENERATED ALWAYS AS IDENTITY`

```prisma
// Prisma equivalent
id BigInt @id @default(autoincrement())
```

**Trade-off:** Int is fine for your scale. BigInt prevents future overflow on high-volume tables.

## Priority: Low - Nice to Have

### Money Fields
Current: `Int` (cents) - this works fine
Alternative: `Decimal @db.Decimal(10,2)` for exact arithmetic

Your approach is actually common and avoids floating point issues. No change needed.

### Section Type Enum (COMPLETED)
~~Current: `type String // LIVING, NON_ESSENTIAL, SAVINGS`~~

Now uses proper PostgreSQL enum via Prisma:
```prisma
enum SectionType {
  LIVING
  NON_ESSENTIAL
  SAVINGS
  @@schema("budgeting")
}
```

> Applied via migration `20251227000001_add_section_type_enum`

## Questions to Consider

1. **FK Indexes** - Apply these? Low risk, improves query performance.
2. **Timestamps** - Stick with unix ints (consistent with dayjs preference) or migrate to TIMESTAMPTZ?
3. **BigInt IDs** - Worth the migration effort at current scale?

## How to Apply FK Indexes

Add to each model in `prisma/schema.prisma`:

```prisma
model TransactionFixedPayment {
  // ... existing fields ...

  @@index([monthId])  // ADD THIS
  @@map("transaction_fixed_payments")
  @@schema("budgeting")
}
```

Then run:
```bash
npx prisma migrate dev --name add_fk_indexes
```
