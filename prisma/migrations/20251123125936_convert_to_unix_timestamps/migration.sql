/*
  Warnings:

  - You are about to alter the column `created_at` on the `budget_categories` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `updated_at` on the `budget_categories` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `created_at` on the `fixed_payments` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `updated_at` on the `fixed_payments` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `created_at` on the `months` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `updated_at` on the `months` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `created_at` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `transaction_date` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `updated_at` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `created_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.
  - You are about to alter the column `updated_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `DateTime` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_budget_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "allocated_amount" INTEGER NOT NULL DEFAULT 0,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "budget_categories_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "months" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_budget_categories" ("allocated_amount", "created_at", "id", "month_id", "name", "order_index", "updated_at") SELECT "allocated_amount", "created_at", "id", "month_id", "name", "order_index", "updated_at" FROM "budget_categories";
DROP TABLE "budget_categories";
ALTER TABLE "new_budget_categories" RENAME TO "budget_categories";
CREATE TABLE "new_fixed_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "fixed_payments_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "months" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_fixed_payments" ("amount", "created_at", "id", "month_id", "name", "order_index", "updated_at") SELECT "amount", "created_at", "id", "month_id", "name", "order_index", "updated_at" FROM "fixed_payments";
DROP TABLE "fixed_payments";
ALTER TABLE "new_fixed_payments" RENAME TO "fixed_payments";
CREATE TABLE "new_months" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "month_name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "income" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "months_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_months" ("created_at", "id", "income", "month_name", "updated_at", "user_id", "year") SELECT "created_at", "id", "income", "month_name", "updated_at", "user_id", "year" FROM "months";
DROP TABLE "months";
ALTER TABLE "new_months" RENAME TO "months";
CREATE UNIQUE INDEX "months_user_id_month_name_year_key" ON "months"("user_id", "month_name", "year");
CREATE TABLE "new_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "transaction_date" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budget_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("amount", "category_id", "created_at", "description", "id", "transaction_date", "updated_at") SELECT "amount", "category_id", "created_at", "description", "id", "transaction_date", "updated_at" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL
);
INSERT INTO "new_users" ("created_at", "email", "id", "name", "updated_at") SELECT "created_at", "email", "id", "name", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
