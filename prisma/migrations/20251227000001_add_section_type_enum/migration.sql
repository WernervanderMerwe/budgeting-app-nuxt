-- CreateEnum
CREATE TYPE "budgeting"."SectionType" AS ENUM ('LIVING', 'NON_ESSENTIAL', 'SAVINGS');

-- AlterTable: Convert existing string column to enum
ALTER TABLE "budgeting"."yearly_sections"
  ALTER COLUMN "type" TYPE "budgeting"."SectionType" USING "type"::"budgeting"."SectionType";
