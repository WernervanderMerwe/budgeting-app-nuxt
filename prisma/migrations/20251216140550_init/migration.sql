-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "budgeting";

-- CreateTable
CREATE TABLE "budgeting"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."transaction_months" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "month_name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL DEFAULT 1,
    "income" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "transaction_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."transaction_fixed_payments" (
    "id" SERIAL NOT NULL,
    "month_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "transaction_fixed_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."transaction_categories" (
    "id" SERIAL NOT NULL,
    "month_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "allocated_amount" INTEGER NOT NULL DEFAULT 0,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."transaction_entries" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "transaction_date" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "transaction_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."yearly_budgets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "year" INTEGER NOT NULL,
    "spend_target" INTEGER NOT NULL DEFAULT 500000,
    "show_warnings" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "yearly_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."yearly_income_sources" (
    "id" SERIAL NOT NULL,
    "yearly_budget_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "yearly_income_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."yearly_income_entries" (
    "id" SERIAL NOT NULL,
    "income_source_id" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "gross_amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "yearly_income_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."yearly_deductions" (
    "id" SERIAL NOT NULL,
    "income_entry_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "yearly_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."yearly_sections" (
    "id" SERIAL NOT NULL,
    "yearly_budget_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_percent" INTEGER NOT NULL DEFAULT 70,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "yearly_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."yearly_categories" (
    "id" SERIAL NOT NULL,
    "section_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "yearly_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."yearly_category_entries" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "yearly_category_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "budgeting"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_months_user_id_month_name_year_key" ON "budgeting"."transaction_months"("user_id", "month_name", "year");

-- CreateIndex
CREATE UNIQUE INDEX "yearly_budgets_user_id_year_key" ON "budgeting"."yearly_budgets"("user_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "yearly_income_entries_income_source_id_month_key" ON "budgeting"."yearly_income_entries"("income_source_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "yearly_category_entries_category_id_month_key" ON "budgeting"."yearly_category_entries"("category_id", "month");

-- AddForeignKey
ALTER TABLE "budgeting"."transaction_months" ADD CONSTRAINT "transaction_months_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "budgeting"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."transaction_fixed_payments" ADD CONSTRAINT "transaction_fixed_payments_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "budgeting"."transaction_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."transaction_categories" ADD CONSTRAINT "transaction_categories_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "budgeting"."transaction_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."transaction_entries" ADD CONSTRAINT "transaction_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budgeting"."transaction_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_budgets" ADD CONSTRAINT "yearly_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "budgeting"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_income_sources" ADD CONSTRAINT "yearly_income_sources_yearly_budget_id_fkey" FOREIGN KEY ("yearly_budget_id") REFERENCES "budgeting"."yearly_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_income_entries" ADD CONSTRAINT "yearly_income_entries_income_source_id_fkey" FOREIGN KEY ("income_source_id") REFERENCES "budgeting"."yearly_income_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_deductions" ADD CONSTRAINT "yearly_deductions_income_entry_id_fkey" FOREIGN KEY ("income_entry_id") REFERENCES "budgeting"."yearly_income_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_sections" ADD CONSTRAINT "yearly_sections_yearly_budget_id_fkey" FOREIGN KEY ("yearly_budget_id") REFERENCES "budgeting"."yearly_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_categories" ADD CONSTRAINT "yearly_categories_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "budgeting"."yearly_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_categories" ADD CONSTRAINT "yearly_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "budgeting"."yearly_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_category_entries" ADD CONSTRAINT "yearly_category_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budgeting"."yearly_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
