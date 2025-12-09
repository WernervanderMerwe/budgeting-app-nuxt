-- Rename Transaction Tracker tables with 'Transaction' prefix to match Yearly table naming convention
-- Using ALTER TABLE RENAME to preserve existing data

-- Rename months table to transaction_months
ALTER TABLE "months" RENAME TO "transaction_months";

-- Rename fixed_payments table to transaction_fixed_payments
ALTER TABLE "fixed_payments" RENAME TO "transaction_fixed_payments";

-- Rename budget_categories table to transaction_categories
ALTER TABLE "budget_categories" RENAME TO "transaction_categories";

-- Rename transactions table to transaction_entries
ALTER TABLE "transactions" RENAME TO "transaction_entries";
