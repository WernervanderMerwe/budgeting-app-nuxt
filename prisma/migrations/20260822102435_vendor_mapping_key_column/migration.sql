-- Adds a normalised `vendor_key` match/uniqueness column to vendor_mappings,
-- separate from the `vendor` display column. `vendor` is shown as-is on the
-- Settings screen (brand names like "Pick n Pay" / "Dis-Chem" don't
-- title-case back cleanly from an uppercased key), so it must not be
-- overwritten with the normalised form. `vendor_key` is what matching and
-- uniqueness are keyed on going forward (see server/utils/vendor-mapping.ts).
--
-- Previously, lookups matched `vendor` case-insensitively (ILIKE) via Prisma
-- `mode: 'insensitive'`, but new rows stored raw trimmed text. Case-only
-- differences matched by luck; whitespace/punctuation differences ('Shell,'
-- vs 'Shell') did not, silently fragmenting counts. The existing
-- @@unique([profile_token, vendor, expense_category]) is exact/case-sensitive
-- so it never caught this either.

-- Step 1: add the column nullable, for backfill.
ALTER TABLE "budgeting"."vendor_mappings" ADD COLUMN "vendor_key" TEXT;

-- Step 2: backfill using the exact same expression as
-- shared/utils/receipt-merchants.ts's normaliseVendorKey (uppercase, collapse
-- internal whitespace, strip trailing punctuation, trim).
UPDATE "budgeting"."vendor_mappings"
SET "vendor_key" = btrim(regexp_replace(regexp_replace(btrim(upper("vendor")), '\s+', ' ', 'g'), '[.,;:!?]+$', ''));

-- Step 3: collapse any duplicate rows the backfill exposes (same
-- profile_token, vendor_key, expense_category) BEFORE adding the unique
-- constraint below. In practice there should be none — shipped defaults come
-- from a de-duplicated brand list — but this must be handled defensively.
-- GROUP BY treats NULL profile_token values as one group, which matches the
-- desired "NULL groups with NULL" semantics for the default rows.
--
-- 3a: fold counts/timestamps onto the surviving (lowest id) row.
WITH dupes AS (
  SELECT
    "profile_token",
    "vendor_key",
    "expense_category",
    MIN("id") AS keep_id,
    SUM("times_seen") AS total_times_seen,
    MAX("last_seen_at") AS max_last_seen_at
  FROM "budgeting"."vendor_mappings"
  GROUP BY "profile_token", "vendor_key", "expense_category"
  HAVING COUNT(*) > 1
)
UPDATE "budgeting"."vendor_mappings" vm
SET "times_seen" = dupes.total_times_seen,
    "last_seen_at" = dupes.max_last_seen_at,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::int
FROM dupes
WHERE vm."id" = dupes.keep_id;

-- 3b: delete the now-redundant rows.
WITH dupes AS (
  SELECT
    "profile_token",
    "vendor_key",
    "expense_category",
    MIN("id") AS keep_id
  FROM "budgeting"."vendor_mappings"
  GROUP BY "profile_token", "vendor_key", "expense_category"
  HAVING COUNT(*) > 1
)
DELETE FROM "budgeting"."vendor_mappings" vm
USING dupes
WHERE vm."profile_token" IS NOT DISTINCT FROM dupes."profile_token"
  AND vm."vendor_key" = dupes."vendor_key"
  AND vm."expense_category" = dupes."expense_category"
  AND vm."id" <> dupes.keep_id;

-- Step 4: now safe to enforce NOT NULL.
ALTER TABLE "budgeting"."vendor_mappings" ALTER COLUMN "vendor_key" SET NOT NULL;

-- Step 5: drop the old vendor-keyed constraints/index.
DROP INDEX "budgeting"."vendor_mappings_profile_token_vendor_idx";
DROP INDEX "budgeting"."vendor_mappings_profile_token_vendor_expense_category_key";
DROP INDEX "budgeting"."vendor_mappings_default_key";

-- Step 6: recreate them against vendor_key instead of vendor.
CREATE INDEX "vendor_mappings_profile_token_vendor_key_idx" ON "budgeting"."vendor_mappings"("profile_token", "vendor_key");

CREATE UNIQUE INDEX "vendor_mappings_profile_token_vendor_key_expense_category_key" ON "budgeting"."vendor_mappings"("profile_token", "vendor_key", "expense_category");

-- Partial unique index: Postgres treats NULLs as distinct in a normal unique
-- index, so the @@unique([profileToken, vendorKey, expenseCategory]) above
-- does NOT prevent duplicate shipped-default rows (profile_token IS NULL).
-- This index enforces uniqueness among defaults specifically. Prisma cannot
-- express a partial index, so it is hand-added here (same precedent as
-- 20260822100639_vendor_expense_category).
CREATE UNIQUE INDEX "vendor_mappings_default_key"
  ON "budgeting"."vendor_mappings" ("vendor_key", "expense_category")
  WHERE "profile_token" IS NULL;
