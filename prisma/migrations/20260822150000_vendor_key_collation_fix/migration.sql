-- Data-only fix: the vendor_key backfill in 20260822102435 derived vendor_key
-- via SQL upper(), which is collation-dependent for non-ASCII characters.
-- Verified locally (en_US.utf8): upper('Vida e Caffè') = 'VIDA E CAFFÈ',
-- matching JS String.toUpperCase() as used by
-- shared/utils/receipt-merchants.ts's normaliseVendorKey at lookup time. But
-- under a C-collated database — this repo does not pin the collation of the
-- shared infra-postgres instance production runs against — upper() folds
-- accented letters differently ('Vida e Caffè' COLLATE "C" -> 'VIDA E CAFFè',
-- lowercase è retained), so the shipped default would never match a
-- JS-normalised lookup key. That migration itself must not be edited: it is
-- already applied to the dev DB and Prisma checksums applied migrations, so
-- editing it would cause drift.
--
-- This is a no-op on an en_US.utf8 database (dev already has the correct
-- value) and a real fix on a C-collated one (as production may be). Corrects
-- only the profile_token IS NULL (shipped default) row — never touches any
-- user-learned row.
UPDATE "budgeting"."vendor_mappings"
SET "vendor_key" = 'VIDA E CAFFÈ', "updated_at" = EXTRACT(EPOCH FROM NOW())::int
WHERE "profile_token" IS NULL
  AND "vendor" = 'Vida e Caffè'
  AND "vendor_key" IS DISTINCT FROM 'VIDA E CAFFÈ';
