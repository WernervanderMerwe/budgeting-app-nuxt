-- CreateTable
CREATE TABLE "yearly_budgets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "year" INTEGER NOT NULL,
    "spend_target" INTEGER NOT NULL DEFAULT 500000,
    "show_warnings" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "yearly_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "yearly_income_sources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "yearly_budget_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "yearly_income_sources_yearly_budget_id_fkey" FOREIGN KEY ("yearly_budget_id") REFERENCES "yearly_budgets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "yearly_income_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "income_source_id" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "gross_amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "yearly_income_entries_income_source_id_fkey" FOREIGN KEY ("income_source_id") REFERENCES "yearly_income_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "yearly_deductions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "income_entry_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "yearly_deductions_income_entry_id_fkey" FOREIGN KEY ("income_entry_id") REFERENCES "yearly_income_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "yearly_sections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "yearly_budget_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_percent" INTEGER NOT NULL DEFAULT 70,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "yearly_sections_yearly_budget_id_fkey" FOREIGN KEY ("yearly_budget_id") REFERENCES "yearly_budgets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "yearly_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "section_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "yearly_categories_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "yearly_sections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "yearly_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "yearly_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "yearly_category_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "yearly_category_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "yearly_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "yearly_budgets_user_id_year_key" ON "yearly_budgets"("user_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "yearly_income_entries_income_source_id_month_key" ON "yearly_income_entries"("income_source_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "yearly_category_entries_category_id_month_key" ON "yearly_category_entries"("category_id", "month");
