# Vendor → Expense Category Mapping

**Date:** 2026-08-22
**Status:** Implemented on `dev`, uncommitted.

The body below is the design **as originally approved** and is superseded in
three places. Read all three trailing sections before trusting it:

- "Corrections found during implementation" — two defects in this spec, found
  while building it. They supersede the `VendorMapping` block and the "On save"
  key rule.
- "Amendment: brand canonicalisation on the mapping key" — a refinement Werner
  asked for after approval. It supersedes the mapping-key rule again and
  changes what triggers a review-queue entry.
- "Amendment: the taxonomy is COICOP, not habits" — replaces the
  `ExpenseCategory` value list wholesale. The old values in the body below no
  longer exist.

**Branch:** `dev`

## Problem

A Shell fuel slip was scanned and filed under Groceries. Two separate failures
caused it:

1. **The brand was never recognised.** OCR read the logo as `SHEL1`, which does
   not match `/\bSHELL\b/i` (`shared/utils/receipt-merchants.ts:66`). The parser
   fell through to its "no known brand" path
   (`shared/utils/receipt-parser.ts:243`) and returned `merchantKind: null`.
2. **Nothing auto-picks a category anyway.** `ReceiptScanModal.vue:389` always
   resets the selection to whichever card launched the scan. Brand knowledge
   only ever drove a *warning*, never a selection — and with a null kind, even
   the warning stayed silent.

Neither is fixed by tightening one regex. The system has no memory: correcting a
slip teaches it nothing, so the same mistake recurs indefinitely.

## Design principles

Two rules decide where every piece of knowledge lives.

**Patterns in code. Facts in the database.**

Regexes stay in `receipt-merchants.ts`. They carry ordering semantics (first
match wins), the `headOnly` flag, and hard-won traps — the `DANGER: never add a
bare /TOTAL/` note at line 41 is exactly the knowledge that dies if the table
moves into a DB grid. A bad regex breaks parsing for every slip, so that layer
wants review, fixture tests, and a deploy.

**Classification is a budgeting decision, not a fact about the shop.**

Whether Dis-Chem books to `MEDICAL` or `PERSONAL_CARE` is a property of *this
user's budget*, not of Dis-Chem. Same for Woolworths (groceries or clothing),
Makro, Game. That belongs in editable data, not a shipped constant.

So: **the code answers "which brand is this?" and the table answers "what does
that brand book to?"**

## Terminology

Named after the accounting term. The thing an expense is booked to is an
*expense account* within a *chart of accounts*; card networks classify the
merchant side with a *Merchant Category Code* ([ISO 18245][iso]), and consumer
fintech calls the user-facing version a *personal finance category*
([Plaid][plaid]).

`expenseCategory` was chosen because it is the accounting-correct concept minus
the word `account`, which is already a better-auth model in this schema
(`prisma/schema.prisma:262`). Deliberately **not** named `mcc` — an MCC is
specifically the four-digit ISO code, and naming a hand-rolled enum `mcc` would
make the next reader expect `5541` and find `FUEL`. Real MCCs are not
recoverable from a paper slip; they live on the card transaction.

[iso]: https://www.iso.org/standard/33365.html
[plaid]: https://plaid.com/docs/transactions/pfc-migration/

## Data model

### `ExpenseCategory` enum

> **Superseded.** The value list below was replaced wholesale — see
> "Amendment: the taxonomy is COICOP, not habits" at the end of this document.
> Everything else in this section still holds.

Replaces `MerchantKind`. The existing eight values, with `pharmacy` split
because Dis-Chem is genuinely ambiguous, plus the gaps that split exposed:

```
GROCERIES  EATING_OUT  FUEL  TRANSPORT  UTILITIES
MEDICAL  PERSONAL_CARE  ENTERTAINMENT  BICYCLE
CLOTHING  HOME  GENERAL_RETAIL  OTHER
```

Mapping from the current `MerchantKind` values, used to seed defaults:

| `MerchantKind` | `ExpenseCategory` |
| --- | --- |
| `groceries` | `GROCERIES` |
| `fuel` | `FUEL` |
| `eating-out` | `EATING_OUT` |
| `entertainment` | `ENTERTAINMENT` |
| `bicycle` | `BICYCLE` |
| `pharmacy` | `PERSONAL_CARE` for Clicks; `MEDICAL` for Dis-Chem, Medirite, Alpha Pharm |
| `retail` | `GENERAL_RETAIL`, except Builders / Leroy Merlin → `HOME` |
| `utilities` | `UTILITIES` |

### `TransactionCategory.expenseCategory` — new, nullable

Nullable is load-bearing. Every existing category on every past month keeps
working untouched, and tagging happens incrementally as the user edits
categories rather than in one big backfill. An untagged category means no
auto-select and no warning — precisely today's behaviour, so nothing regresses.

### `VendorMapping` — new table

```prisma
model VendorMapping {
  id              Int             @id @default(autoincrement())
  profileToken    String?         @map("profile_token") // NULL = shipped default
  vendor          String                                // canonical brand, "Shell"
  expenseCategory ExpenseCategory @map("expense_category")
  timesSeen       Int             @default(1) @map("times_seen")
  lastSeenAt      Int             @map("last_seen_at")
  createdAt       Int             @map("created_at")
  updatedAt       Int             @map("updated_at")

  profile Profile? @relation(fields: [profileToken], references: [profileToken], onDelete: Cascade)

  @@unique([profileToken, vendor, expenseCategory])
  @@index([profileToken, vendor])
  @@map("vendor_mappings")
  @@schema("budgeting")
}
```

**One-to-many, not one-to-one.** A vendor may carry several tags:

```
Shell      → FUEL       ×14
Shell      → GROCERIES  ×2
Woolworths → GROCERIES  ×9
Woolworths → CLOTHING   ×3
```

One row per vendor would be last-write-wins: file one Woolworths clothing slip
and the next grocery slip preselects `CLOTHING`; correcting it overwrites it
back. It ping-pongs forever and the feature becomes a nuisance. Counting each
*pair* avoids that entirely.

**Two unique constraints are required.** Postgres treats NULLs as distinct in
unique indexes, so `@@unique([profileToken, vendor, expenseCategory])` does not
prevent duplicate shipped-default rows. The migration must add a partial index
by hand:

```sql
CREATE UNIQUE INDEX vendor_mappings_default_key
  ON budgeting.vendor_mappings (vendor, expense_category)
  WHERE profile_token IS NULL;
```

**Precedence:** if the user has any rows for a vendor, they win wholesale and
the `NULL` default is ignored. Otherwise the default applies. This stops learned
data competing confusingly with a shipped guess.

### `ReceiptTextCorrection` — new table

The review queue for regex gaps.

```prisma
model ReceiptTextCorrection {
  id           Int     @id @default(autoincrement())
  profileToken String  @map("profile_token")
  rawText      String  @map("raw_text")     // "SHEL1 VREDEKLOOF"
  correctedTo  String  @map("corrected_to") // "Shell"
  timesSeen    Int     @default(1) @map("times_seen")
  lastSeenAt   Int     @map("last_seen_at")
  resolvedAt   Int?    @map("resolved_at")  // set once the regex is fixed
  createdAt    Int     @map("created_at")
  updatedAt    Int     @map("updated_at")

  profile Profile @relation(fields: [profileToken], references: [profileToken], onDelete: Cascade)

  @@unique([profileToken, rawText])
  @@map("receipt_text_corrections")
  @@schema("budgeting")
}
```

`rawText` is normalised (uppercased, whitespace collapsed, trailing punctuation
stripped) so repeat garbles from the same store land on one row and `timesSeen`
climbs. That count is the queue's sort order: it says which regex is worth
fixing first instead of leaving it to guesswork.

**A row is written only when the parser actually failed.** No brand matched and
the user retyped the description → regex gap, queue it. `Shell` matched and the
user edited it to `Shell Vredekloof` → that is labelling, not a bug, skip it.

OCR errors are not random: the same store's slips come off the same printer,
logo, font and thermal fade, so a garble that appears once tends to recur
verbatim. Learned corrections therefore have real lookup value, not just
harvest value.

## Parser changes

`ParsedReceipt` gains one structured field:

```ts
merchantSource: 'brand' | 'fallback' | null
```

Today that distinction exists only as prose inside `evidence[]`
(`receipt-parser.ts:219-243`), which is not machine-readable. The correction
queue needs it.

> **2026-08-22 addendum:** `merchantSource` was removed as dead code. Nothing
> ever came to read it — the review-queue trigger it was built for was
> superseded before anything consumed it (see "Review-queue trigger changed"
> below). Left as history; not reinstated.

`ParsedReceipt.merchantKind` is **removed**. The parser answers "which brand",
full stop; classification is a DB lookup performed server-side after parsing.
This keeps `pnpm test` pure and DB-free as `.claude/CLAUDE.md` requires. The six
`merchantKind` assertions in `test/receipt-parser.test.ts` move to a
classification test with a stubbed mapping table.

## Code this deletes

`classifyCategoryName` and its `CATEGORY_PATTERNS` regex list
(`receipt-merchants.ts:173-189`) are removed outright. The mismatch warning
becomes an exact enum comparison between the resolved tag and the selected
category's tag — no more guessing that "Bike stuff" means bicycle, and no more
false warnings when the guess is wrong.

`Brand.kind` is removed from the `BRANDS` entries; the values move into the
seeded `NULL` rows of `VendorMapping`. The knowledge is not lost, it changes
form from constant to data.

## Runtime flow

**On scan:**

1. Parse → `merchant`, `merchantSource`.
2. Server resolves `expenseCategory` from `VendorMapping` (user rows if any,
   else the `NULL` default), taking the highest `timesSeen`, tiebreak
   `lastSeenAt`.
3. Response carries `merchant`, `merchantSource`, `expenseCategory`, and the
   full set of tags known for that vendor.
4. Modal finds this month's categories carrying that tag:
   - **exactly one** → preselect it
   - **zero, or two or more** → keep the launch category, show a hint

Two categories may legitimately share a tag ("Date nights" and "Takeaways" both
`EATING_OUT`), so the map cannot always disambiguate. It must not guess.

**Warning:** fires only when the selected category's tag matches *none* of the
vendor's known tags — not merely when it isn't the top one. The first Woolworths
clothing slip warns once; saving it teaches the pair; it never warns again. The
warning self-silences rather than nagging, which was the stated intent of
`isCategoryMismatch` ("never cry wolf", `receipt-merchants.ts:192`). It still
never blocks saving.

**On save:**

1. Upsert `VendorMapping` — key on the canonical brand when one matched, else
   the user's corrected description, normalised (uppercase, collapse
   whitespace, strip trailing punctuation) so `Shell`, `Shell garage` and
   `shell` do not fragment the counts. Increment `timesSeen`, set `lastSeenAt`.
2. If `merchantSource === 'fallback'` and the description was edited, upsert
   `ReceiptTextCorrection`.

Learning is silent — no prompts, no checkboxes. A wrong row is fixable from the
management screen.

## UI changes

- **`BudgetCategoryCard.vue`** — the inline edit form (around line 32, beside
  `editedCategory.name`) gains an `expenseCategory` dropdown. Optional; blank
  is valid.
- **Category create** — same dropdown wherever categories are added
  (`useBudget.ts:294` call site).
- **`ReceiptScanModal.vue`** — preselect logic and the rewritten warning.
- **Settings → Vendors** — lists mappings with counts, editable and deletable;
  a second section lists unresolved `ReceiptTextCorrection` rows sorted by
  `timesSeen` as the regex to-do list.

## Validation

`categorySchema` (`server/utils/validation.ts:18`) gains
`expenseCategory: z.nativeEnum(ExpenseCategory).nullable().optional()`.

## Out of scope (YAGNI)

- **Real ISO 18245 MCCs on brands.** Not recoverable from paper; no benefit at
  this app's scale.
- **A "promote this alias" button.** The description edit already teaches the
  mapping; a manual promote path is redundant UI.
- ~~**Plaid's full 18-primary taxonomy.** Broader than a personal budgeting app
  needs, and folding `FUEL` into `TRANSPORTATION` loses a distinction that
  matters here.~~ **Reversed** — see the COICOP amendment. Folding fuel into
  transport was the correct call and this reasoning was wrong.
- **Splitting one slip across categories by line item.** Real, but a much
  larger feature.

## Testing

- `pnpm test` stays pure and DB-free. Parser tests assert `merchant` and
  `merchantSource` only.
- New classification tests cover the mapping resolver with a stubbed table:
  precedence, multi-tag ranking, and the "matches none" warning condition.
- A fixture for the Shell slip is still outstanding — the file was not available
  when this was designed. Capture with `pnpm receipt:fixture <img>` once
  available, and use it to verify whether `SHEL1` was the actual failure or
  whether something upstream in OCR went wrong first.
- `pnpm qa:up` before any merge to `main`, per `docs/devops/lifecycle.md`.

---

## Corrections found during implementation

Two defects surfaced after the design was approved. Both were invisible to
`pnpm test` — which is pure and DB-free by deliberate policy — and both only
appeared when checked against real Postgres semantics and real parser output.
Recording them here because each was a flaw in *this document*, not in the code
written from it.

### 1. The normalised key was never actually stored

The spec said to normalise the vendor key on upsert so `Shell`, `Shell garage`
and `shell` would not fragment the counts. It did not say **where** the
normalised form lives. The implementation looked rows up by
`normaliseVendorKey(vendor)` using case-insensitive matching, but stored the raw
`vendor.trim()`. Case survives that round trip; whitespace and punctuation do
not:

```
'Shell  Garage.' ILIKE 'SHELL GARAGE'  ->  false
'Shell'          ILIKE 'SHELL'         ->  true
'Shell,'         ILIKE 'SHELL'         ->  false
```

Saving `Shell  Garage.` twice therefore created two rows, and
`resolveVendorTags('Shell Garage')` never found either. The unique constraint
did not catch it, being exact and case-sensitive.

**Fix:** `VendorMapping` gains a `vendorKey` column holding the normalised form.
Matching and both unique indexes moved onto it; `vendor` remains purely a
display label. The uppercased key is deliberately NOT stored in `vendor` —
`PICK N PAY` and `DIS-CHEM` do not title-case back cleanly, which would have
degraded the Settings screen.

`normaliseVendorKey` also gained a trailing `.trim()`: it strips punctuation
after trimming, so `"Shell ."` previously normalised to `"SHELL "` with a
trailing space.

### 2. Display name and identity key were the same field

The more serious one. `findMerchant` appends the branch when it finds one
(`receipt-parser.ts:219`), so a Spar slip yields `merchant: "Spar Vredekloof"`.
That display string was then used as the mapping key — but the shipped defaults
are seeded with bare brand names:

```
defaults matching 'spar%' / 'shell%'      ->  Shell, Spar
rows matching upper(vendor) = 'SPAR VREDEKLOOF'  ->  0
```

On any slip carrying a suburb line — most South African till slips, including
the Shell slip that motivated this whole design — the lookup missed entirely.
No preselect, and the warning could never fire because `vendorTags` came back
empty. Each branch also learned as its own vendor, so `Spar Vredekloof` and
`Spar Somerset West` never accumulated together. All 96 shipped defaults were
effectively inert.

This document's "On save" section already prescribed the correct rule — *key on
the canonical brand when one matched, else the user's corrected description* —
but no field carried the bare brand, so there was nothing to key on. The spec
named something that did not exist.

**Fix:** `ParsedReceipt` gains `brand: string | null` — the canonical name with
no branch suffix, null on the fallback path. `merchant` keeps the branch for
display and prefills the description box; `brand` is the mapping key. The two
must never be re-merged.

### Lesson for the next feature here

A pure, DB-free test suite is fast and worth keeping, but it cannot see
collation, index semantics, or whether two layers agree on what a key *is*.
Anything that joins across a real database boundary needs verifying against a
live one before it is believed.

## Amendment: brand canonicalisation on the mapping key

Added after the original design was approved, at Werner's request:

> you can add a silent (not visible to user) field on the table for vendor and
> we input vendor name and a matcher will match the substrings to vendors in
> our list and we can put any non matches in the table. otherwise its too much
> to maintain for the user and too much noise.

### What changed

`canonicaliseVendor(text: string): string | null` in
`shared/utils/receipt-merchants.ts` runs the free-text vendor string through the
same `BRANDS` table the receipt parser uses, first pattern wins, and returns the
bare brand name or `null`.

Both `resolveVendorTags` and `learnVendorMapping` now key on
`normaliseVendorKey(canonicaliseVendor(vendor) ?? vendor)` — one shared helper,
`vendorLookupKey`, so a resolve that canonicalises and a learn that does not
can never write rows nothing reads back.

`normaliseVendorKey` alone only collapsed case, whitespace and trailing
punctuation. It could not collapse `Shell Vredekloof` → `Shell`, so a
branch-qualified or hand-typed vendor still fragmented into its own row and
missed every shipped default. That is fix #2 from the corrections above,
generalised: `brand` fixes it for scans, canonicalisation fixes it for anything
the user types or edits by hand.

**`headOnly` brands ARE eligible in `canonicaliseVendor`, unlike in
`findMerchant`.** `headOnly` exists to stop generic-word aliases (PNP, BP, Spur,
Clicks, Rain, Game, PEP, MTN) from false-matching in the body of a full OCR'd
invoice. A short user-typed vendor string is effectively all header — there is
no invoice body to false-match against — so excluding them would reject exactly
the inputs this function exists to canonicalise. The function carries a comment
saying not to "fix" this later.

### Review-queue trigger changed

Was: `merchantSource === 'fallback'` (what the OCR parser managed on the image).
Now: `canonicaliseVendor` returns `null` (the brand table does not know this
vendor).

The string being learned is whatever the user *finally saved*, which they may
have typed or corrected by hand — so the parser's own outcome is the wrong
signal. An unrecognised vendor is a brand-table gap regardless of how the scan
went. `merchantSource` was consequently removed from the learn payload
(`learnVendorMappingSchema`, `LearnVendorMappingInput`, the modal's `save`
emit); it survives on `ParsedReceipt`, where it is still a true parser fact.
>
> **2026-08-22 addendum:** it did not survive long — nothing ever ended up
> reading `ParsedReceipt.merchantSource` once this trigger change landed, so
> it was removed from `ParsedReceipt` too as dead code.

Unrecognised vendors still get a `VendorMapping` row *and* a queue entry: the
row makes the next identical slip preselect, the queue keeps the gap visible
without the user curating anything.

### Verified against the local dev DB

`profile_token IS NULL` defaults, resolved through the real code path:

| input | canonical | key | tags |
| --- | --- | --- | --- |
| `Shell Vredekloof` | Shell | `SHELL` | FUEL |
| `shell garage` | Shell | `SHELL` | FUEL |
| `SUPERSPAR TYGERVALLEY` | Spar | `SPAR` | GROCERIES |
| `Dischem Bellville` | Dis-Chem | `DIS-CHEM` | MEDICAL |
| `BP garage` | BP | `BP` | FUEL |
| `PNP Express` | Pick n Pay | `PICK N PAY` | GROCERIES |
| `SHEL1 VREDEKLOOF` | *(null)* | `SHEL1 VREDEKLOOF` | — |
| `Joe's Corner Cafe` | *(null)* | `JOE'S CORNER CAFE` | — |

`SHEL1` — the slip that started this whole feature — deliberately does **not**
match. A fuzzy matcher that let it through would hide the gap from the review
queue and the missing regex would never get written. Failing loudly there is
the feature, and `test/receipt-merchants.test.ts` asserts it.

## Amendment: the taxonomy is COICOP, not habits

Added 2026-08-22 after Werner reviewed the dropdown:

> The dropdown needs to be a real financial list of expenditure categories, not
> my expenditure habits. So don't put `BICYCLE` as a valid category. It's a
> leisure/sport/lifestyle item, not "bicycle". Same with fuel and transport —
> transport can be anything car related, or getting around by bus.

### What was wrong

The original list was assembled bottom-up from the `MerchantKind` values that
happened to already exist, so it inherited their shape. Two kinds of value had
no business being there:

- **Habit-shaped.** `BICYCLE` is one household's hobby, not a division of
  consumption. By the same logic the list would eventually grow `COFFEE`,
  `PADEL`, `DOG`. There is no stopping rule.
- **Retailer-shaped.** `GENERAL_RETAIL` describes a kind of *shop*, not a
  purpose. A Makro slip's purpose is household goods; the retailer is
  incidental. `FUEL` as a peer of `TRANSPORT` is the same error one level down:
  fuel is a means of transport, not an alternative to it.

The list also had no authority behind it, so every addition was arguable and
every boundary was a judgement call made fresh.

### The list

The divisions of **COICOP 2018** — the UN Classification of Individual
Consumption According to Purpose — which Stats SA also uses as the division
structure of the CPI basket. COICOP classifies by *purpose*, which is exactly
the question a budget category answers, and it settles the arguments above by
construction: fuel is 07.2.2, inside Transport; bicycles and their gear are 09,
Recreation.

Eleven values, in division order:

| Value | COICOP |
| --- | --- |
| `FOOD_AND_GROCERIES` | 01 |
| `CLOTHING_AND_FOOTWEAR` | 03 |
| `HOUSING_AND_UTILITIES` | 04 |
| `HOUSEHOLD_AND_MAINTENANCE` | 05 |
| `HEALTH` | 06 |
| `TRANSPORT` | 07 |
| `COMMUNICATION` | 08 |
| `RECREATION_AND_SPORT` | 09 |
| `RESTAURANTS_AND_TAKEAWAYS` | 11 |
| `PERSONAL_CARE` | 13.1 |
| `OTHER` | 13 remainder, plus folded-in 02 / 10 / 12 |

Divisions 02 (alcohol and tobacco), 10 (education) and 12 (insurance and
financial services) are folded into `OTHER` at Werner's call: nothing in this
app's slip flow files to them often enough to earn a dropdown row. They are
real divisions, so if a bottle-store or school-fees slip ever becomes routine,
promoting one out of `OTHER` is an additive enum change and a data-only
migration — not a redesign.

### Granularity lives in the category name

The user's own `TransactionCategory.name` is free text and always was. A
category named "Petrol" tags `TRANSPORT`; "Bike stuff" tags
`RECREATION_AND_SPORT`; "Woolies run" tags `FOOD_AND_GROCERIES`. The enum is
the accounting bucket, the name is the household's language for it. Adding an
enum value to describe how one person spends is the mistake this amendment
exists to prevent — `shared/utils/expense-categories.ts` carries that rule as a
comment at the top of the file.

### Migration

`20260822140000_coicop_expense_categories`. Postgres cannot drop enum values,
so it creates the new type, swaps both columns (`transaction_categories`,
`vendor_mappings`) with a `CASE` remap, drops the old type and renames.

The generic remap is lossless except for two buckets that had collapsed
distinctions the enum alone cannot recover, so the shipped-default rows
(`profile_token IS NULL`) get hand corrections after the swap:

- **`UTILITIES` held two divisions.** Municipality/Eskom are housing (04);
  MTN/Vodacom/Telkom/Rain/Afrihost/Cell C/Webafrica are communication (08).
- **`GENERAL_RETAIL` held whatever the shop sold.** Game and Makro →
  household; HiFi Corp and Incredible Connection → communication (08.1, ICT
  equipment); Sportsmans Warehouse → recreation. Takealot stays `OTHER` — a
  general marketplace genuinely has no single purpose, and guessing one would
  file every Takealot slip wrong in a different way each time.

The collapse can also merge two rows onto one key (a user with both `FUEL` and
`TRANSPORT` rows for the same vendor, or `ENTERTAINMENT` and `BICYCLE`), which
would violate the vendor-mapping unique constraints. The migration dedupes by
keeping the lowest `id` per key, summing `times_seen` and taking the maximum
`last_seen_at`, so learned counts survive the merge instead of being discarded.
