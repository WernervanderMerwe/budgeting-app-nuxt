-- Data-only fix: the shipped defaults incorrectly seeded these clothing
-- retailers as GENERAL_RETAIL. Corrects only the profile_token IS NULL
-- (shipped default) rows — never touches any user-learned row.
UPDATE "budgeting"."vendor_mappings"
SET "expense_category" = 'CLOTHING', "updated_at" = EXTRACT(EPOCH FROM NOW())::int
WHERE "profile_token" IS NULL
  AND "vendor" IN ('Mr Price', 'Ackermans', 'PEP', 'Truworths', 'Cape Union Mart')
  AND "expense_category" = 'GENERAL_RETAIL';
