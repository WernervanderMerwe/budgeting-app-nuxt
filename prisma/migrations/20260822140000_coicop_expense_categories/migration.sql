-- Replaces the ad-hoc ExpenseCategory value list with a COICOP 2018-anchored
-- taxonomy (see shared/utils/expense-categories.ts for the full reasoning).
-- Postgres cannot drop enum values in place, so this uses the standard
-- create-new-type-and-swap pattern: build the new type, repoint every column
-- at it via a CASE remap, drop the old type, then rename the new one over it.
--
-- Two columns use ExpenseCategory: transaction_categories.expense_category
-- (nullable — tagging is incremental) and vendor_mappings.expense_category
-- (NOT NULL).

-- Step 1: drop the unique indexes that cover expense_category on
-- vendor_mappings. The CASE remap below collapses several old values onto a
-- single new value (FUEL and TRANSPORT both become TRANSPORT; ENTERTAINMENT
-- and BICYCLE both become RECREATION_AND_SPORT), which can make two existing
-- rows collide on (profile_token, vendor_key, expense_category). Leaving
-- these indexes in place would make the ALTER COLUMN TYPE below fail with a
-- duplicate-key error the moment it tries to rebuild them. They are recreated
-- with the exact same names in Step 6, after the dedupe in Step 5 has removed
-- the collisions.
DROP INDEX "budgeting"."vendor_mappings_profile_token_vendor_key_expense_category_key";
DROP INDEX "budgeting"."vendor_mappings_default_key";

-- Step 2: build the new type alongside the old one.
CREATE TYPE "budgeting"."ExpenseCategory_new" AS ENUM (
  'FOOD_AND_GROCERIES',
  'CLOTHING_AND_FOOTWEAR',
  'HOUSING_AND_UTILITIES',
  'HOUSEHOLD_AND_MAINTENANCE',
  'HEALTH',
  'TRANSPORT',
  'COMMUNICATION',
  'RECREATION_AND_SPORT',
  'RESTAURANTS_AND_TAKEAWAYS',
  'PERSONAL_CARE',
  'OTHER'
);

-- Step 3: repoint both columns at the new type via the generic old->new
-- mapping. This is also the mapping applied to every user-learned row — there
-- is no way to ask the user which of two collapsed old buckets they meant, so
-- the generic mapping is the best available default for their data too:
--   GROCERIES         -> FOOD_AND_GROCERIES        (COICOP 01)
--   EATING_OUT         -> RESTAURANTS_AND_TAKEAWAYS  (COICOP 11)
--   FUEL                -> TRANSPORT                  (COICOP 07.2.2 is part of transport, not a peer of it)
--   TRANSPORT          -> TRANSPORT
--   UTILITIES          -> HOUSING_AND_UTILITIES       (COICOP 04; connectivity utilities are fixed for shipped defaults in Step 4)
--   MEDICAL             -> HEALTH                      (COICOP 06)
--   PERSONAL_CARE      -> PERSONAL_CARE               (COICOP 13.1)
--   ENTERTAINMENT      -> RECREATION_AND_SPORT        (COICOP 09)
--   BICYCLE             -> RECREATION_AND_SPORT        (a hobby, not its own division; COICOP 09)
--   CLOTHING            -> CLOTHING_AND_FOOTWEAR       (COICOP 03)
--   HOME                -> HOUSEHOLD_AND_MAINTENANCE  (COICOP 05)
--   GENERAL_RETAIL     -> OTHER                        ("kind of shop" was never a purpose; shipped defaults split by what was actually sold in Step 4)
--   OTHER               -> OTHER
--
-- transaction_categories.expense_category is nullable and a CASE over a NULL
-- input already yields NULL, so untagged categories stay untagged here
-- without any special-casing.
ALTER TABLE "budgeting"."transaction_categories"
  ALTER COLUMN "expense_category" TYPE "budgeting"."ExpenseCategory_new"
  USING (
    CASE "expense_category"::text
      WHEN 'GROCERIES' THEN 'FOOD_AND_GROCERIES'
      WHEN 'EATING_OUT' THEN 'RESTAURANTS_AND_TAKEAWAYS'
      WHEN 'FUEL' THEN 'TRANSPORT'
      WHEN 'TRANSPORT' THEN 'TRANSPORT'
      WHEN 'UTILITIES' THEN 'HOUSING_AND_UTILITIES'
      WHEN 'MEDICAL' THEN 'HEALTH'
      WHEN 'PERSONAL_CARE' THEN 'PERSONAL_CARE'
      WHEN 'ENTERTAINMENT' THEN 'RECREATION_AND_SPORT'
      WHEN 'BICYCLE' THEN 'RECREATION_AND_SPORT'
      WHEN 'CLOTHING' THEN 'CLOTHING_AND_FOOTWEAR'
      WHEN 'HOME' THEN 'HOUSEHOLD_AND_MAINTENANCE'
      WHEN 'GENERAL_RETAIL' THEN 'OTHER'
      WHEN 'OTHER' THEN 'OTHER'
    END
  )::"budgeting"."ExpenseCategory_new";

ALTER TABLE "budgeting"."vendor_mappings"
  ALTER COLUMN "expense_category" TYPE "budgeting"."ExpenseCategory_new"
  USING (
    CASE "expense_category"::text
      WHEN 'GROCERIES' THEN 'FOOD_AND_GROCERIES'
      WHEN 'EATING_OUT' THEN 'RESTAURANTS_AND_TAKEAWAYS'
      WHEN 'FUEL' THEN 'TRANSPORT'
      WHEN 'TRANSPORT' THEN 'TRANSPORT'
      WHEN 'UTILITIES' THEN 'HOUSING_AND_UTILITIES'
      WHEN 'MEDICAL' THEN 'HEALTH'
      WHEN 'PERSONAL_CARE' THEN 'PERSONAL_CARE'
      WHEN 'ENTERTAINMENT' THEN 'RECREATION_AND_SPORT'
      WHEN 'BICYCLE' THEN 'RECREATION_AND_SPORT'
      WHEN 'CLOTHING' THEN 'CLOTHING_AND_FOOTWEAR'
      WHEN 'HOME' THEN 'HOUSEHOLD_AND_MAINTENANCE'
      WHEN 'GENERAL_RETAIL' THEN 'OTHER'
      WHEN 'OTHER' THEN 'OTHER'
    END
  )::"budgeting"."ExpenseCategory_new";

-- Step 4: drop the old type and rename the new one into its place.
DROP TYPE "budgeting"."ExpenseCategory";
ALTER TYPE "budgeting"."ExpenseCategory_new" RENAME TO "ExpenseCategory";

-- Step 5: fix the shipped-default rows (profile_token IS NULL) that the
-- generic mapping above cannot get right, because two old buckets folded
-- together information the mapping alone can't recover: GENERAL_RETAIL and
-- UTILITIES were both retailer/biller shaped, not purpose shaped, and each
-- bucket actually spanned more than one COICOP division. Never touches a
-- user-learned row (profile_token IS NOT NULL) — those keep whatever the
-- generic mapping gave them.

-- 5a: connectivity billers were seeded as UTILITIES (now HOUSING_AND_UTILITIES
-- via the generic map), but airtime/data/fibre is COICOP 08 (communication),
-- not COICOP 04 (housing). City of Cape Town, Eskom and Municipality are
-- genuine housing utilities and are intentionally left alone.
UPDATE "budgeting"."vendor_mappings"
SET "expense_category" = 'COMMUNICATION', "updated_at" = EXTRACT(EPOCH FROM NOW())::int
WHERE "profile_token" IS NULL
  AND "vendor" IN ('Afrihost', 'Cell C', 'MTN', 'Rain', 'Telkom', 'Vodacom', 'Webafrica')
  AND "expense_category" = 'HOUSING_AND_UTILITIES';

-- 5b: Game and Makro are general household/hardware retailers — what they're
-- actually selling in this app's slip flow is COICOP 05 (household equipment
-- and maintenance), not "other".
UPDATE "budgeting"."vendor_mappings"
SET "expense_category" = 'HOUSEHOLD_AND_MAINTENANCE', "updated_at" = EXTRACT(EPOCH FROM NOW())::int
WHERE "profile_token" IS NULL
  AND "vendor" IN ('Game', 'Makro')
  AND "expense_category" = 'OTHER';

-- 5c: HiFi Corp and Incredible Connection sell ICT/electronics equipment,
-- which COICOP 08.1 (communication) covers alongside connectivity services.
UPDATE "budgeting"."vendor_mappings"
SET "expense_category" = 'COMMUNICATION', "updated_at" = EXTRACT(EPOCH FROM NOW())::int
WHERE "profile_token" IS NULL
  AND "vendor" IN ('HiFi Corp', 'Incredible Connection')
  AND "expense_category" = 'OTHER';

-- 5d: Sportsmans Warehouse sells sport/recreation equipment, COICOP 09.
UPDATE "budgeting"."vendor_mappings"
SET "expense_category" = 'RECREATION_AND_SPORT', "updated_at" = EXTRACT(EPOCH FROM NOW())::int
WHERE "profile_token" IS NULL
  AND "vendor" IN ('Sportsmans Warehouse')
  AND "expense_category" = 'OTHER';

-- 5e: Takealot is a general marketplace with no single purpose to book to —
-- unlike Game/Makro/HiFi Corp/Sportsmans Warehouse it has no dominant product
-- category, so it is intentionally left on OTHER. No UPDATE for it.
--
-- Mr Price, Ackermans, PEP, Truworths and Cape Union Mart were already moved
-- off GENERAL_RETAIL onto CLOTHING by migration
-- 20260822101758_clothing_default_fix, so the generic map in Step 3 already
-- carried them to CLOTHING_AND_FOOTWEAR correctly and they need no fixup here.

-- Step 6: dedupe vendor_mappings. The generic remap in Step 3 can make two
-- rows collapse onto the same (profile_token, vendor_key, expense_category) —
-- e.g. a user who had learned both a FUEL and a TRANSPORT mapping for the
-- same vendor now has two TRANSPORT rows for it, and likewise for an
-- ENTERTAINMENT/BICYCLE pair collapsing onto RECREATION_AND_SPORT. This must
-- run before the unique indexes are recreated in Step 7. Same two-step
-- fold-then-delete pattern as 20260822102435_vendor_mapping_key_column: keep
-- the lowest id, sum times_seen onto it, take the max last_seen_at, then
-- delete the rest. GROUP BY treats NULL profile_token as one group, which
-- matches the desired "defaults dedupe against defaults" semantics — though
-- as established in Step 5, the shipped-default fixups above cannot actually
-- create a new default collision, since defaults are one row per vendor and
-- vendor_key is unchanged by an expense_category update.
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

-- Step 7: recreate the unique indexes dropped in Step 1, same names as
-- before — nothing about their shape changed, only the type of the column
-- they cover.
CREATE UNIQUE INDEX "vendor_mappings_profile_token_vendor_key_expense_category_key" ON "budgeting"."vendor_mappings"("profile_token", "vendor_key", "expense_category");

CREATE UNIQUE INDEX "vendor_mappings_default_key"
  ON "budgeting"."vendor_mappings" ("vendor_key", "expense_category")
  WHERE "profile_token" IS NULL;
