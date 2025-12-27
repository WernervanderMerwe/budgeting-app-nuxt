-- CreateIndex: TransactionFixedPayment.monthId
CREATE INDEX "transaction_fixed_payments_month_id_idx" ON "budgeting"."transaction_fixed_payments"("month_id");

-- CreateIndex: TransactionCategory.monthId
CREATE INDEX "transaction_categories_month_id_idx" ON "budgeting"."transaction_categories"("month_id");

-- CreateIndex: TransactionEntry.categoryId
CREATE INDEX "transaction_entries_category_id_idx" ON "budgeting"."transaction_entries"("category_id");

-- CreateIndex: YearlyIncomeSource.yearlyBudgetId
CREATE INDEX "yearly_income_sources_yearly_budget_id_idx" ON "budgeting"."yearly_income_sources"("yearly_budget_id");

-- CreateIndex: YearlyIncomeEntry.incomeSourceId
CREATE INDEX "yearly_income_entries_income_source_id_idx" ON "budgeting"."yearly_income_entries"("income_source_id");

-- CreateIndex: YearlyDeduction.incomeEntryId
CREATE INDEX "yearly_deductions_income_entry_id_idx" ON "budgeting"."yearly_deductions"("income_entry_id");

-- CreateIndex: YearlySection.yearlyBudgetId
CREATE INDEX "yearly_sections_yearly_budget_id_idx" ON "budgeting"."yearly_sections"("yearly_budget_id");

-- CreateIndex: YearlyCategory.sectionId
CREATE INDEX "yearly_categories_section_id_idx" ON "budgeting"."yearly_categories"("section_id");

-- CreateIndex: YearlyCategory.parentId
CREATE INDEX "yearly_categories_parent_id_idx" ON "budgeting"."yearly_categories"("parent_id");

-- CreateIndex: YearlyCategoryEntry.categoryId
CREATE INDEX "yearly_category_entries_category_id_idx" ON "budgeting"."yearly_category_entries"("category_id");
