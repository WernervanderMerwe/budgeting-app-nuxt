-- CreateEnum
CREATE TYPE "budgeting"."ExpenseCategory" AS ENUM ('GROCERIES', 'EATING_OUT', 'FUEL', 'TRANSPORT', 'UTILITIES', 'MEDICAL', 'PERSONAL_CARE', 'ENTERTAINMENT', 'BICYCLE', 'CLOTHING', 'HOME', 'GENERAL_RETAIL', 'OTHER');

-- AlterTable
ALTER TABLE "budgeting"."transaction_categories" ADD COLUMN     "expense_category" "budgeting"."ExpenseCategory";

-- CreateTable
CREATE TABLE "budgeting"."vendor_mappings" (
    "id" SERIAL NOT NULL,
    "profile_token" TEXT,
    "vendor" TEXT NOT NULL,
    "expense_category" "budgeting"."ExpenseCategory" NOT NULL,
    "times_seen" INTEGER NOT NULL DEFAULT 1,
    "last_seen_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "vendor_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."receipt_text_corrections" (
    "id" SERIAL NOT NULL,
    "profile_token" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "corrected_to" TEXT NOT NULL,
    "times_seen" INTEGER NOT NULL DEFAULT 1,
    "last_seen_at" INTEGER NOT NULL,
    "resolved_at" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "receipt_text_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_mappings_profile_token_vendor_idx" ON "budgeting"."vendor_mappings"("profile_token", "vendor");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_mappings_profile_token_vendor_expense_category_key" ON "budgeting"."vendor_mappings"("profile_token", "vendor", "expense_category");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_text_corrections_profile_token_raw_text_key" ON "budgeting"."receipt_text_corrections"("profile_token", "raw_text");

-- AddForeignKey
ALTER TABLE "budgeting"."vendor_mappings" ADD CONSTRAINT "vendor_mappings_profile_token_fkey" FOREIGN KEY ("profile_token") REFERENCES "budgeting"."profiles"("profile_token") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."receipt_text_corrections" ADD CONSTRAINT "receipt_text_corrections_profile_token_fkey" FOREIGN KEY ("profile_token") REFERENCES "budgeting"."profiles"("profile_token") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: Postgres treats NULLs as distinct in a normal unique
-- index, so the @@unique([profileToken, vendor, expenseCategory]) above does
-- NOT prevent duplicate shipped-default rows (profile_token IS NULL). This
-- index enforces uniqueness among defaults specifically. Prisma cannot express
-- a partial index, so it is hand-added here.
CREATE UNIQUE INDEX "vendor_mappings_default_key"
  ON "budgeting"."vendor_mappings" ("vendor", "expense_category")
  WHERE "profile_token" IS NULL;

-- Seed shipped-default vendor -> expense category mappings, derived from the
-- BRANDS table in shared/utils/receipt-merchants.ts (kind field, now removed
-- from that file per docs/plans/2026-08-22-vendor-expense-category-design.md).
-- profile_token IS NULL marks these as defaults, overridden by any learned
-- user-specific row for the same vendor.
INSERT INTO "budgeting"."vendor_mappings" ("profile_token", "vendor", "expense_category", "times_seen", "last_seen_at", "created_at", "updated_at")
SELECT NULL, v.vendor, v.expense_category::"budgeting"."ExpenseCategory", 0, EXTRACT(EPOCH FROM NOW())::int, EXTRACT(EPOCH FROM NOW())::int, EXTRACT(EPOCH FROM NOW())::int
FROM (VALUES
  ('Ackermans', 'GENERAL_RETAIL'),
  ('Afrihost', 'UTILITIES'),
  ('Alpha Pharm', 'MEDICAL'),
  ('Astron Energy', 'FUEL'),
  ('BP', 'FUEL'),
  ('Bike Addict', 'BICYCLE'),
  ('Bike shop', 'BICYCLE'),
  ('Bolt Food', 'EATING_OUT'),
  ('Bootlegger', 'EATING_OUT'),
  ('Boxer', 'GROCERIES'),
  ('Builders', 'HOME'),
  ('Burger King', 'EATING_OUT'),
  ('Cajees Cycles', 'BICYCLE'),
  ('Caltex', 'FUEL'),
  ('Cambridge Food', 'GROCERIES'),
  ('Cape Union Mart', 'GENERAL_RETAIL'),
  ('Cell C', 'UTILITIES'),
  ('Checkers', 'GROCERIES'),
  ('Chicken Licken', 'EATING_OUT'),
  ('Chris Willemse Cycles', 'BICYCLE'),
  ('Cinema Nouveau', 'ENTERTAINMENT'),
  ('City of Cape Town', 'UTILITIES'),
  ('Clicks', 'PERSONAL_CARE'),
  ('Col''Cacchio', 'EATING_OUT'),
  ('Computicket', 'ENTERTAINMENT'),
  ('Cycle Lab', 'BICYCLE'),
  ('DStv', 'ENTERTAINMENT'),
  ('Debonairs', 'EATING_OUT'),
  ('Dis-Chem', 'MEDICAL'),
  ('Domino''s', 'EATING_OUT'),
  ('Engen', 'FUEL'),
  ('Eskom', 'UTILITIES'),
  ('Evobikes', 'BICYCLE'),
  ('Fishaways', 'EATING_OUT'),
  ('Food Lover''s Market', 'GROCERIES'),
  ('FreshStop', 'GROCERIES'),
  ('Game', 'GENERAL_RETAIL'),
  ('HiFi Corp', 'GENERAL_RETAIL'),
  ('Incredible Connection', 'GENERAL_RETAIL'),
  ('John Dory''s', 'EATING_OUT'),
  ('KFC', 'EATING_OUT'),
  ('Kauai', 'EATING_OUT'),
  ('Krispy Kreme', 'EATING_OUT'),
  ('Le Peloton', 'BICYCLE'),
  ('Leroy Merlin', 'HOME'),
  ('MTN', 'UTILITIES'),
  ('Makro', 'GENERAL_RETAIL'),
  ('McDonald''s', 'EATING_OUT'),
  ('Medirite', 'MEDICAL'),
  ('Mr D', 'EATING_OUT'),
  ('Mr Price', 'GENERAL_RETAIL'),
  ('Mugg & Bean', 'EATING_OUT'),
  ('Municipality', 'UTILITIES'),
  ('Nando''s', 'EATING_OUT'),
  ('Netflix', 'ENTERTAINMENT'),
  ('Nintendo', 'ENTERTAINMENT'),
  ('Nu Metro', 'ENTERTAINMENT'),
  ('OK Foods', 'GROCERIES'),
  ('Ocean Basket', 'EATING_OUT'),
  ('Olympic Cycles', 'BICYCLE'),
  ('PEP', 'GENERAL_RETAIL'),
  ('Panarottis', 'EATING_OUT'),
  ('Pick n Pay', 'GROCERIES'),
  ('Pizza Hut', 'EATING_OUT'),
  ('PlayStation', 'ENTERTAINMENT'),
  ('Puma Energy', 'FUEL'),
  ('Rain', 'UTILITIES'),
  ('RocoMamas', 'EATING_OUT'),
  ('Roman''s Pizza', 'EATING_OUT'),
  ('Sasol', 'FUEL'),
  ('Seattle Coffee', 'EATING_OUT'),
  ('Shell', 'FUEL'),
  ('Shoprite', 'GROCERIES'),
  ('Showmax', 'ENTERTAINMENT'),
  ('Simply Asia', 'EATING_OUT'),
  ('Solomon''s Cycles', 'BICYCLE'),
  ('Spar', 'GROCERIES'),
  ('Sportsmans Warehouse', 'GENERAL_RETAIL'),
  ('Spotify', 'ENTERTAINMENT'),
  ('Spur', 'EATING_OUT'),
  ('Starbucks', 'EATING_OUT'),
  ('Steam', 'ENTERTAINMENT'),
  ('Steers', 'EATING_OUT'),
  ('Ster-Kinekor', 'ENTERTAINMENT'),
  ('Takealot', 'GENERAL_RETAIL'),
  ('Telkom', 'UTILITIES'),
  ('TotalEnergies', 'FUEL'),
  ('Truworths', 'GENERAL_RETAIL'),
  ('Uber Eats', 'EATING_OUT'),
  ('Usave', 'GROCERIES'),
  ('Vida e Caffè', 'EATING_OUT'),
  ('Vodacom', 'UTILITIES'),
  ('Webafrica', 'UTILITIES'),
  ('Wimpy', 'EATING_OUT'),
  ('Woolworths', 'GROCERIES'),
  ('Xbox', 'ENTERTAINMENT')
) AS v(vendor, expense_category);
