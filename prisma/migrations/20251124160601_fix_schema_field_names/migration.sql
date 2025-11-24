-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_months" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "month_name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL DEFAULT 1,
    "income" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "months_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_months" ("created_at", "id", "income", "month_name", "updated_at", "user_id", "year") SELECT "created_at", "id", "income", "month_name", "updated_at", "user_id", "year" FROM "months";
DROP TABLE "months";
ALTER TABLE "new_months" RENAME TO "months";
CREATE UNIQUE INDEX "months_user_id_month_name_year_key" ON "months"("user_id", "month_name", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
