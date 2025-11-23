# Phase 2 Progress - Database & Backend Setup

## ✅ Completed Tasks

1. **Initialize Prisma with SQLite** ✓
   - Ran `npx prisma init --datasource-provider sqlite`
   - Created `prisma/schema.prisma`
   - Created `.env` file with `DATABASE_URL="file:./dev.db"`
   - Created `prisma.config.ts` with dotenv import

2. **Create Prisma Schema** ✓
   - Added all 5 models:
     - `User` (authentication-ready, userId nullable in Month)
     - `Month` (monthName, year, income in cents)
     - `FixedPayment` (name, amount, orderIndex)
     - `BudgetCategory` (name, allocatedAmount, orderIndex)
     - `Transaction` (amount, description, transactionDate)
   - All relationships configured with cascade deletes
   - All fields mapped to snake_case database columns

3. **Generate Prisma Client** ✓
   - Installed `dotenv` package
   - Updated `prisma.config.ts` to import dotenv
   - Ran `npx prisma generate`
   - Prisma Client generated to `node_modules/@prisma/client`

4. **Create server/utils directory** ✓
   - Directory created and ready for db.ts

---

## ⏳ Remaining Tasks

### Step 4: Create Database Utility (`server/utils/db.ts`)

Create the Prisma client singleton pattern:

```typescript
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
```

### Step 5: Create Currency Utilities (`server/utils/currency.ts`)

```typescript
/**
 * Convert cents to rands (divide by 100)
 */
export function centsToRands(cents: number): number {
  return cents / 100
}

/**
 * Convert rands to cents (multiply by 100)
 */
export function randsToCents(rands: number): number {
  return Math.round(rands * 100)
}

/**
 * Format currency for display
 */
export function formatCurrency(cents: number): string {
  const rands = centsToRands(cents)
  return `R ${rands.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
```

### Step 6: Create Validation Utilities (`server/utils/validation.ts`)

```typescript
import { z } from 'zod'

export const monthSchema = z.object({
  monthName: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  income: z.number().nonnegative(),
})

export const fixedPaymentSchema = z.object({
  monthId: z.number().int().positive(),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  orderIndex: z.number().int().nonnegative().optional(),
})

export const categorySchema = z.object({
  monthId: z.number().int().positive(),
  name: z.string().min(1),
  allocatedAmount: z.number().nonnegative(),
  orderIndex: z.number().int().nonnegative().optional(),
})

export const transactionSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().nonnegative(),
  description: z.string().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
```

### Step 7: Create Database Seeding Script (`prisma/seed.ts`)

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create test user (for future auth)
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  })

  // Create a test month
  const month = await prisma.month.create({
    data: {
      userId: user.id,
      monthName: 'January',
      year: 2025,
      income: 3000000, // R30,000 in cents
      fixedPayments: {
        create: [
          { name: 'Rent', amount: 800000, orderIndex: 1 }, // R8,000
          { name: 'Phone', amount: 50000, orderIndex: 2 }, // R500
          { name: 'Utilities', amount: 150000, orderIndex: 3 }, // R1,500
        ],
      },
      categories: {
        create: [
          {
            name: 'Groceries',
            allocatedAmount: 400000, // R4,000
            orderIndex: 1,
            transactions: {
              create: [
                {
                  amount: 25000, // R250
                  description: 'Pick n Pay',
                  transactionDate: '2025-01-15',
                },
              ],
            },
          },
          {
            name: 'Fuel',
            allocatedAmount: 200000, // R2,000
            orderIndex: 2,
          },
        ],
      },
    },
  })

  console.log('Seeding finished.')
  console.log({ user, month })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

### Step 8: Update package.json for seeding

Add this to `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Step 9: Run Migration and Seed

```bash
# Create initial migration
npx prisma migrate dev --name init

# Seed the database
npx prisma db seed

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### Step 10: Commit Phase 2

```bash
git add .
git commit -m "Complete Phase 2: Database & Backend Setup

- Initialized Prisma with SQLite
- Created complete database schema with 5 models
- Generated Prisma client
- Created database utilities (db, currency, validation)
- Created seeding script with test data
- Ran migrations and seeded database"

git push
```

---

## Next Session Commands

When you continue, simply run these commands:

```bash
# 1. Create server/utils/db.ts (see Step 4 above)
# 2. Create server/utils/currency.ts (see Step 5 above)
# 3. Create server/utils/validation.ts (see Step 6 above)
# 4. Create prisma/seed.ts (see Step 7 above)
# 5. Update package.json (see Step 8 above)

# Then run:
npx prisma migrate dev --name init
npx prisma db seed

# Commit and push
git add .
git commit -m "Complete Phase 2: Database & Backend Setup"
git push
```

---

## Files Created So Far

- ✅ `prisma/schema.prisma` - Complete database schema
- ✅ `prisma.config.ts` - Prisma configuration with dotenv
- ✅ `.env` - Database URL configuration
- ✅ `server/utils/` directory

## Files Still Needed

- ⏳ `server/utils/db.ts`
- ⏳ `server/utils/currency.ts`
- ⏳ `server/utils/validation.ts`
- ⏳ `prisma/seed.ts`
- ⏳ Update `package.json` with seed script

## Database State

- Schema defined but migration not yet run
- No database file created yet (will be `prisma/dev.db` after migration)
- Prisma client generated and ready to use
