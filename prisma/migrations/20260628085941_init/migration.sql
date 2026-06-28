-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "budgeting";

-- CreateEnum
CREATE TYPE "budgeting"."SectionType" AS ENUM ('LIVING', 'NON_ESSENTIAL', 'SAVINGS');

-- CreateTable
CREATE TABLE "budgeting"."profiles" (
    "id" SERIAL NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "profile_token" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."transaction_months" (
    "id" SERIAL NOT NULL,
    "profile_token" TEXT,
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
    "profile_token" TEXT,
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
    "type" "budgeting"."SectionType" NOT NULL,
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

-- CreateTable
CREATE TABLE "budgeting"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgeting"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_auth_user_id_key" ON "budgeting"."profiles"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_profile_token_key" ON "budgeting"."profiles"("profile_token");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_months_profile_token_month_name_year_key" ON "budgeting"."transaction_months"("profile_token", "month_name", "year");

-- CreateIndex
CREATE INDEX "transaction_fixed_payments_month_id_idx" ON "budgeting"."transaction_fixed_payments"("month_id");

-- CreateIndex
CREATE INDEX "transaction_categories_month_id_idx" ON "budgeting"."transaction_categories"("month_id");

-- CreateIndex
CREATE INDEX "transaction_entries_category_id_idx" ON "budgeting"."transaction_entries"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "yearly_budgets_profile_token_year_key" ON "budgeting"."yearly_budgets"("profile_token", "year");

-- CreateIndex
CREATE INDEX "yearly_income_sources_yearly_budget_id_idx" ON "budgeting"."yearly_income_sources"("yearly_budget_id");

-- CreateIndex
CREATE INDEX "yearly_income_entries_income_source_id_idx" ON "budgeting"."yearly_income_entries"("income_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "yearly_income_entries_income_source_id_month_key" ON "budgeting"."yearly_income_entries"("income_source_id", "month");

-- CreateIndex
CREATE INDEX "yearly_deductions_income_entry_id_idx" ON "budgeting"."yearly_deductions"("income_entry_id");

-- CreateIndex
CREATE INDEX "yearly_sections_yearly_budget_id_idx" ON "budgeting"."yearly_sections"("yearly_budget_id");

-- CreateIndex
CREATE INDEX "yearly_categories_section_id_idx" ON "budgeting"."yearly_categories"("section_id");

-- CreateIndex
CREATE INDEX "yearly_categories_parent_id_idx" ON "budgeting"."yearly_categories"("parent_id");

-- CreateIndex
CREATE INDEX "yearly_category_entries_category_id_idx" ON "budgeting"."yearly_category_entries"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "yearly_category_entries_category_id_month_key" ON "budgeting"."yearly_category_entries"("category_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "budgeting"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "budgeting"."session"("token");

-- AddForeignKey
ALTER TABLE "budgeting"."transaction_months" ADD CONSTRAINT "transaction_months_profile_token_fkey" FOREIGN KEY ("profile_token") REFERENCES "budgeting"."profiles"("profile_token") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."transaction_fixed_payments" ADD CONSTRAINT "transaction_fixed_payments_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "budgeting"."transaction_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."transaction_categories" ADD CONSTRAINT "transaction_categories_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "budgeting"."transaction_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."transaction_entries" ADD CONSTRAINT "transaction_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budgeting"."transaction_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."yearly_budgets" ADD CONSTRAINT "yearly_budgets_profile_token_fkey" FOREIGN KEY ("profile_token") REFERENCES "budgeting"."profiles"("profile_token") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "budgeting"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "budgeting"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgeting"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "budgeting"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
