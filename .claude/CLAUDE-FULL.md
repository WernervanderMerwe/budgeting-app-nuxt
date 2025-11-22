# Budgeting App - Nuxt 3 Rebuild Guide

## Overview

This guide outlines the complete migration of the Angular 17 budgeting app to Nuxt 3 with TailwindCSS, SQLite, and Prisma ORM. The rebuild focuses on a modern full-stack architecture with modular components, enhanced UI/UX, and an authentication-ready data model.

**Tech Stack:**
- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **Styling**: TailwindCSS with dark mode
- **Backend**: Nuxt server API routes (Nitro)
- **Database**: SQLite with Prisma ORM
- **State Management**: Vue 3 composables

**Key Features:**
- Full feature parity with original app
- Enhanced mobile-responsive UI
- Dark mode with theme persistence
- Type-safe database operations
- Modular component architecture
- Authentication-ready data model

---

## Phase 1: Project Foundation

### Step 1: Initialize Nuxt 3 Project

```bash
# Navigate to the project directory
cd C:\Users\Bullzeye\Desktop\Development\budgeting-app-nuxt

# Initialize Nuxt 3 project (if not already done)
npx nuxi@latest init .

# Install dependencies
npm install
```

### Step 2: Install Core Dependencies

```bash
# TailwindCSS
npm install -D @nuxtjs/tailwindcss

# Prisma
npm install -D prisma
npm install @prisma/client

# Additional utilities
npm install zod
npm install @vueuse/core
npm install @headlessui/vue
npm install @heroicons/vue
```

### Step 3: Configure Nuxt

Update `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
  ],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: true,
  },

  app: {
    head: {
      title: 'Basic Budget App',
      meta: [
        { name: 'description', content: 'A simple budgeting application' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  runtimeConfig: {
    // Server-side only config
    databaseUrl: 'file:./prisma/dev.db',

    public: {
      // Client-side config
      appName: 'Basic Budget App',
    },
  },

  compatibilityDate: '2025-01-15',
})
```

### Step 4: Configure TailwindCSS

Create `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode

  theme: {
    extend: {
      colors: {
        // Custom colors for budget status
        'budget-green': '#28a745',
        'budget-red': '#dc3545',
        'budget-blue': '#007bff',
      },
    },
  },

  plugins: [],
}
```

Create `assets/css/main.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors;
  }
}

@layer components {
  .card {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700;
  }

  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors;
  }

  .btn-secondary {
    @apply bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors;
  }

  .btn-danger {
    @apply bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors;
  }

  .btn-success {
    @apply bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors;
  }

  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700;
  }
}
```

### Step 5: TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true
  }
}
```

---

## Phase 2: Database & Backend Setup

### Step 6: Initialize Prisma

```bash
# Initialize Prisma with SQLite
npx prisma init --datasource-provider sqlite
```

This creates:
- `prisma/schema.prisma` - Database schema
- `.env` - Environment variables

### Step 7: Create Prisma Schema

Update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// Authentication-ready: User model for future multi-user support
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  months    Month[]

  @@map("users")
}

model Month {
  id        Int      @id @default(autoincrement())
  userId    Int?     @map("user_id") // Nullable for now, required later with auth
  monthName String   @map("month_name")
  year      Int
  income    Int      @default(0) // Stored in cents
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user          User?            @relation(fields: [userId], references: [id], onDelete: Cascade)
  fixedPayments FixedPayment[]
  categories    BudgetCategory[]

  @@unique([userId, monthName, year])
  @@map("months")
}

model FixedPayment {
  id         Int      @id @default(autoincrement())
  monthId    Int      @map("month_id")
  name       String
  amount     Int      // Stored in cents
  orderIndex Int      @default(0) @map("order_index")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  month      Month    @relation(fields: [monthId], references: [id], onDelete: Cascade)

  @@map("fixed_payments")
}

model BudgetCategory {
  id              Int      @id @default(autoincrement())
  monthId         Int      @map("month_id")
  name            String
  allocatedAmount Int      @default(0) @map("allocated_amount") // Stored in cents
  orderIndex      Int      @default(0) @map("order_index")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  month        Month         @relation(fields: [monthId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@map("budget_categories")
}

model Transaction {
  id              Int      @id @default(autoincrement())
  categoryId      Int      @map("category_id")
  amount          Int      // Stored in cents
  description     String?
  transactionDate String?  @map("transaction_date") // ISO 8601 format
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  category        BudgetCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@map("transactions")
}
```

**Key Design Decisions:**
- **Monetary values in cents**: Avoids floating-point precision issues
- **User model**: Authentication-ready but not enforced (userId nullable)
- **Cascade deletes**: Automatic cleanup of related records
- **orderIndex fields**: For custom sorting/reordering
- **updatedAt fields**: Track modifications (auto-managed by Prisma)

### Step 8: Generate Prisma Client

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name init
```

### Step 9: Create Database Utility

Create `server/utils/db.ts`:

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

**Why this pattern?**
- Prevents multiple Prisma client instances in development
- Hot module replacement doesn't create connection leaks
- Production always creates fresh instance

### Step 10: Create Database Seeding Script

Create `prisma/seed.ts`:

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

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Install tsx and run seed:

```bash
npm install -D tsx
npx prisma db seed
```

---

## Phase 3: Server API Routes

Nuxt 3 uses the `server/api/` directory for backend endpoints. Files are automatically registered as API routes.

### Step 11: Create Helper Functions

Create `server/utils/currency.ts`:

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

Create `server/utils/validation.ts`:

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

### Step 12: Month API Routes

Create `server/api/months/index.get.ts`:

```typescript
import prisma from '~/server/utils/db'
import { centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const months = await prisma.month.findMany({
      orderBy: [
        { year: 'desc' },
        { monthName: 'desc' },
      ],
      select: {
        id: true,
        monthName: true,
        year: true,
        income: true,
        createdAt: true,
      },
    })

    // Convert cents to rands for frontend
    return months.map(month => ({
      ...month,
      income: centsToRands(month.income),
    }))
  } catch (error) {
    console.error('Error fetching months:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch months',
    })
  }
})
```

Create `server/api/months/index.post.ts`:

```typescript
import prisma from '~/server/utils/db'
import { randsToCents } from '~/server/utils/currency'
import { monthSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validatedData = monthSchema.parse(body)

    // Create month
    const month = await prisma.month.create({
      data: {
        monthName: validatedData.monthName,
        year: validatedData.year,
        income: randsToCents(validatedData.income),
      },
    })

    return {
      ...month,
      income: validatedData.income,
    }
  } catch (error) {
    console.error('Error creating month:', error)

    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: 'Invalid input data',
        data: error.errors,
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to create month',
    })
  }
})
```

Create `server/api/months/[id].get.ts`:

```typescript
import prisma from '~/server/utils/db'
import { centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    const month = await prisma.month.findUnique({
      where: { id },
      include: {
        fixedPayments: {
          orderBy: { orderIndex: 'asc' },
        },
        categories: {
          orderBy: { orderIndex: 'asc' },
          include: {
            transactions: {
              orderBy: { transactionDate: 'desc' },
            },
          },
        },
      },
    })

    if (!month) {
      throw createError({
        statusCode: 404,
        message: 'Month not found',
      })
    }

    // Convert all monetary values from cents to rands
    return {
      ...month,
      income: centsToRands(month.income),
      fixedPayments: month.fixedPayments.map(fp => ({
        ...fp,
        amount: centsToRands(fp.amount),
      })),
      categories: month.categories.map(cat => ({
        ...cat,
        allocatedAmount: centsToRands(cat.allocatedAmount),
        transactions: cat.transactions.map(txn => ({
          ...txn,
          amount: centsToRands(txn.amount),
        })),
      })),
    }
  } catch (error) {
    if (error.statusCode) throw error

    console.error('Error fetching month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch month',
    })
  }
})
```

Create `server/api/months/[id].patch.ts`:

```typescript
import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    const updateData: any = {}

    if (body.monthName !== undefined) updateData.monthName = body.monthName
    if (body.year !== undefined) updateData.year = body.year
    if (body.income !== undefined) updateData.income = randsToCents(body.income)

    const month = await prisma.month.update({
      where: { id },
      data: updateData,
    })

    return {
      ...month,
      income: centsToRands(month.income),
    }
  } catch (error) {
    if (error.statusCode) throw error

    console.error('Error updating month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update month',
    })
  }
})
```

Create `server/api/months/[id].delete.ts`:

```typescript
import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    await prisma.month.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    if (error.statusCode) throw error

    console.error('Error deleting month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete month',
    })
  }
})
```

### Step 13: Fixed Payments API Routes

Create `server/api/fixed-payments/index.post.ts`:

```typescript
import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { fixedPaymentSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = fixedPaymentSchema.parse(body)

    const fixedPayment = await prisma.fixedPayment.create({
      data: {
        monthId: validatedData.monthId,
        name: validatedData.name,
        amount: randsToCents(validatedData.amount),
        orderIndex: validatedData.orderIndex || 0,
      },
    })

    return {
      ...fixedPayment,
      amount: centsToRands(fixedPayment.amount),
    }
  } catch (error) {
    console.error('Error creating fixed payment:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create fixed payment',
    })
  }
})
```

Create `server/api/fixed-payments/[id].patch.ts`:

```typescript
import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined) updateData.amount = randsToCents(body.amount)
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const fixedPayment = await prisma.fixedPayment.update({
      where: { id },
      data: updateData,
    })

    return {
      ...fixedPayment,
      amount: centsToRands(fixedPayment.amount),
    }
  } catch (error) {
    console.error('Error updating fixed payment:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update fixed payment',
    })
  }
})
```

Create `server/api/fixed-payments/[id].delete.ts`:

```typescript
import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    await prisma.fixedPayment.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting fixed payment:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete fixed payment',
    })
  }
})
```

### Step 14: Budget Categories API Routes

Create `server/api/categories/index.post.ts`:

```typescript
import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { categorySchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = categorySchema.parse(body)

    const category = await prisma.budgetCategory.create({
      data: {
        monthId: validatedData.monthId,
        name: validatedData.name,
        allocatedAmount: randsToCents(validatedData.allocatedAmount),
        orderIndex: validatedData.orderIndex || 0,
      },
    })

    return {
      ...category,
      allocatedAmount: centsToRands(category.allocatedAmount),
      transactions: [],
    }
  } catch (error) {
    console.error('Error creating category:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create category',
    })
  }
})
```

Create `server/api/categories/[id].patch.ts`:

```typescript
import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.allocatedAmount !== undefined) {
      updateData.allocatedAmount = randsToCents(body.allocatedAmount)
    }
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const category = await prisma.budgetCategory.update({
      where: { id },
      data: updateData,
    })

    return {
      ...category,
      allocatedAmount: centsToRands(category.allocatedAmount),
    }
  } catch (error) {
    console.error('Error updating category:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update category',
    })
  }
})
```

Create `server/api/categories/[id].delete.ts`:

```typescript
import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    await prisma.budgetCategory.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting category:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete category',
    })
  }
})
```

### Step 15: Transactions API Routes

Create `server/api/transactions/index.post.ts`:

```typescript
import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { transactionSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = transactionSchema.parse(body)

    const transaction = await prisma.transaction.create({
      data: {
        categoryId: validatedData.categoryId,
        amount: randsToCents(validatedData.amount),
        description: validatedData.description,
        transactionDate: validatedData.transactionDate,
      },
    })

    return {
      ...transaction,
      amount: centsToRands(transaction.amount),
    }
  } catch (error) {
    console.error('Error creating transaction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create transaction',
    })
  }
})
```

Create `server/api/transactions/[id].patch.ts`:

```typescript
import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    const updateData: any = {}
    if (body.amount !== undefined) updateData.amount = randsToCents(body.amount)
    if (body.description !== undefined) updateData.description = body.description
    if (body.transactionDate !== undefined) updateData.transactionDate = body.transactionDate

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })

    return {
      ...transaction,
      amount: centsToRands(transaction.amount),
    }
  } catch (error) {
    console.error('Error updating transaction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update transaction',
    })
  }
})
```

Create `server/api/transactions/[id].delete.ts`:

```typescript
import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    await prisma.transaction.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete transaction',
    })
  }
})
```

### Step 16: Summary Calculation Endpoint

Create `server/api/months/[id]/summary.get.ts`:

```typescript
import prisma from '~/server/utils/db'
import { centsToRands } from '~/server/utils/currency'

interface CategorySpending {
  categoryId: number
  categoryName: string
  allocated: number
  spent: number
  remaining: number
  overBudget: number
}

interface MonthSummary {
  monthId: number
  monthName: string
  year: number
  income: number
  fixedPaymentsTotal: number
  afterFixedPayments: number
  budgetAllocationsTotal: number
  afterBudgetAllocations: number
  totalActualSpending: number
  totalMoneyLeft: number
  categorySpending: CategorySpending[]
}

export default defineEventHandler(async (event): Promise<MonthSummary> => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    const month = await prisma.month.findUnique({
      where: { id },
      include: {
        fixedPayments: true,
        categories: {
          include: {
            transactions: true,
          },
        },
      },
    })

    if (!month) {
      throw createError({
        statusCode: 404,
        message: 'Month not found',
      })
    }

    // Calculate fixed payments total
    const fixedPaymentsTotal = month.fixedPayments.reduce(
      (sum, fp) => sum + fp.amount,
      0
    )

    // Calculate budget allocations total
    const budgetAllocationsTotal = month.categories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0
    )

    // Calculate category spending
    const categorySpending: CategorySpending[] = month.categories.map(cat => {
      const spent = cat.transactions.reduce((sum, txn) => sum + txn.amount, 0)
      const remaining = cat.allocatedAmount - spent

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        allocated: centsToRands(cat.allocatedAmount),
        spent: centsToRands(spent),
        remaining: centsToRands(remaining > 0 ? remaining : 0),
        overBudget: centsToRands(remaining < 0 ? Math.abs(remaining) : 0),
      }
    })

    // Calculate totals
    const totalActualSpending = month.categories.reduce(
      (sum, cat) => sum + cat.transactions.reduce((txnSum, txn) => txnSum + txn.amount, 0),
      0
    )

    const afterFixedPayments = month.income - fixedPaymentsTotal
    const afterBudgetAllocations = afterFixedPayments - budgetAllocationsTotal
    const totalMoneyLeft = month.income - fixedPaymentsTotal - totalActualSpending

    return {
      monthId: month.id,
      monthName: month.monthName,
      year: month.year,
      income: centsToRands(month.income),
      fixedPaymentsTotal: centsToRands(fixedPaymentsTotal),
      afterFixedPayments: centsToRands(afterFixedPayments),
      budgetAllocationsTotal: centsToRands(budgetAllocationsTotal),
      afterBudgetAllocations: centsToRands(afterBudgetAllocations),
      totalActualSpending: centsToRands(totalActualSpending),
      totalMoneyLeft: centsToRands(totalMoneyLeft),
      categorySpending,
    }
  } catch (error) {
    if (error.statusCode) throw error

    console.error('Error calculating summary:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to calculate summary',
    })
  }
})
```

---

## Phase 4: TypeScript Types & Composables

### Step 17: Create TypeScript Types

Create `types/budget.ts`:

```typescript
export interface Month {
  id: number
  monthName: string
  year: number
  income: number // In rands (converted from cents)
  createdAt: string
  updatedAt: string
  fixedPayments?: FixedPayment[]
  categories?: BudgetCategory[]
}

export interface FixedPayment {
  id: number
  monthId: number
  name: string
  amount: number // In rands
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export interface BudgetCategory {
  id: number
  monthId: number
  name: string
  allocatedAmount: number // In rands
  orderIndex: number
  createdAt: string
  updatedAt: string
  transactions?: Transaction[]
}

export interface Transaction {
  id: number
  categoryId: number
  amount: number // In rands
  description?: string
  transactionDate?: string
  createdAt: string
  updatedAt: string
}

export interface CategorySpending {
  categoryId: number
  categoryName: string
  allocated: number
  spent: number
  remaining: number
  overBudget: number
}

export interface MonthSummary {
  monthId: number
  monthName: string
  year: number
  income: number
  fixedPaymentsTotal: number
  afterFixedPayments: number
  budgetAllocationsTotal: number
  afterBudgetAllocations: number
  totalActualSpending: number
  totalMoneyLeft: number
  categorySpending: CategorySpending[]
}

export interface CreateMonthDto {
  monthName: string
  year: number
  income: number
}

export interface UpdateMonthDto {
  monthName?: string
  year?: number
  income?: number
}

export interface CreateFixedPaymentDto {
  monthId: number
  name: string
  amount: number
  orderIndex?: number
}

export interface UpdateFixedPaymentDto {
  name?: string
  amount?: number
  orderIndex?: number
}

export interface CreateCategoryDto {
  monthId: number
  name: string
  allocatedAmount: number
  orderIndex?: number
}

export interface UpdateCategoryDto {
  name?: string
  allocatedAmount?: number
  orderIndex?: number
}

export interface CreateTransactionDto {
  categoryId: number
  amount: number
  description?: string
  transactionDate?: string
}

export interface UpdateTransactionDto {
  amount?: number
  description?: string
  transactionDate?: string
}
```

### Step 18: Create useMonths Composable

Create `composables/useMonths.ts`:

```typescript
import type { Month, CreateMonthDto, UpdateMonthDto } from '~/types/budget'

export const useMonths = () => {
  const months = useState<Month[]>('months', () => [])
  const currentMonth = useState<Month | null>('currentMonth', () => null)
  const loading = useState<boolean>('monthsLoading', () => false)
  const error = useState<string | null>('monthsError', () => null)

  /**
   * Fetch all months
   */
  const fetchMonths = async () => {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<Month[]>('/api/months')
      months.value = data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch months'
      console.error('Error fetching months:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single month by ID with all relations
   */
  const fetchMonth = async (id: number) => {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<Month>(`/api/months/${id}`)
      currentMonth.value = data
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch month'
      console.error('Error fetching month:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new month
   */
  const createMonth = async (dto: CreateMonthDto) => {
    loading.value = true
    error.value = null

    try {
      const newMonth = await $fetch<Month>('/api/months', {
        method: 'POST',
        body: dto,
      })

      months.value.unshift(newMonth)
      return newMonth
    } catch (err: any) {
      error.value = err.message || 'Failed to create month'
      console.error('Error creating month:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a month
   */
  const updateMonth = async (id: number, dto: UpdateMonthDto) => {
    loading.value = true
    error.value = null

    try {
      const updatedMonth = await $fetch<Month>(`/api/months/${id}`, {
        method: 'PATCH',
        body: dto,
      })

      // Update in list
      const index = months.value.findIndex(m => m.id === id)
      if (index !== -1) {
        months.value[index] = { ...months.value[index], ...updatedMonth }
      }

      // Update current month if it's the same
      if (currentMonth.value?.id === id) {
        currentMonth.value = { ...currentMonth.value, ...updatedMonth }
      }

      return updatedMonth
    } catch (err: any) {
      error.value = err.message || 'Failed to update month'
      console.error('Error updating month:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a month
   */
  const deleteMonth = async (id: number) => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/months/${id}`, {
        method: 'DELETE',
      })

      months.value = months.value.filter(m => m.id !== id)

      if (currentMonth.value?.id === id) {
        currentMonth.value = null
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to delete month'
      console.error('Error deleting month:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Select a month (load full data)
   */
  const selectMonth = async (id: number) => {
    await fetchMonth(id)
  }

  return {
    months,
    currentMonth,
    loading,
    error,
    fetchMonths,
    fetchMonth,
    createMonth,
    updateMonth,
    deleteMonth,
    selectMonth,
  }
}
```

### Step 19: Create useBudget Composable

Create `composables/useBudget.ts`:

```typescript
import type {
  FixedPayment,
  BudgetCategory,
  Transaction,
  MonthSummary,
  CreateFixedPaymentDto,
  UpdateFixedPaymentDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTransactionDto,
  UpdateTransactionDto,
} from '~/types/budget'

export const useBudget = () => {
  const { currentMonth, selectMonth } = useMonths()
  const summary = useState<MonthSummary | null>('budgetSummary', () => null)
  const loading = useState<boolean>('budgetLoading', () => false)
  const error = useState<string | null>('budgetError', () => null)

  /**
   * Fetch month summary
   */
  const fetchSummary = async (monthId: number) => {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<MonthSummary>(`/api/months/${monthId}/summary`)
      summary.value = data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch summary'
      console.error('Error fetching summary:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Reload current month and summary
   */
  const reloadCurrentMonth = async () => {
    if (!currentMonth.value) return

    await selectMonth(currentMonth.value.id)
    await fetchSummary(currentMonth.value.id)
  }

  // ==================== Fixed Payments ====================

  const createFixedPayment = async (dto: CreateFixedPaymentDto) => {
    loading.value = true
    error.value = null

    try {
      await $fetch<FixedPayment>('/api/fixed-payments', {
        method: 'POST',
        body: dto,
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to create fixed payment'
      console.error('Error creating fixed payment:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFixedPayment = async (id: number, dto: UpdateFixedPaymentDto) => {
    loading.value = true
    error.value = null

    try {
      await $fetch<FixedPayment>(`/api/fixed-payments/${id}`, {
        method: 'PATCH',
        body: dto,
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to update fixed payment'
      console.error('Error updating fixed payment:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteFixedPayment = async (id: number) => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/fixed-payments/${id}`, {
        method: 'DELETE',
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to delete fixed payment'
      console.error('Error deleting fixed payment:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ==================== Budget Categories ====================

  const createCategory = async (dto: CreateCategoryDto) => {
    loading.value = true
    error.value = null

    try {
      await $fetch<BudgetCategory>('/api/categories', {
        method: 'POST',
        body: dto,
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to create category'
      console.error('Error creating category:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCategory = async (id: number, dto: UpdateCategoryDto) => {
    loading.value = true
    error.value = null

    try {
      await $fetch<BudgetCategory>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: dto,
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to update category'
      console.error('Error updating category:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteCategory = async (id: number) => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to delete category'
      console.error('Error deleting category:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ==================== Transactions ====================

  const createTransaction = async (dto: CreateTransactionDto) => {
    loading.value = true
    error.value = null

    try {
      await $fetch<Transaction>('/api/transactions', {
        method: 'POST',
        body: dto,
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to create transaction'
      console.error('Error creating transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTransaction = async (id: number, dto: UpdateTransactionDto) => {
    loading.value = true
    error.value = null

    try {
      await $fetch<Transaction>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: dto,
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to update transaction'
      console.error('Error updating transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTransaction = async (id: number) => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      })

      await reloadCurrentMonth()
    } catch (err: any) {
      error.value = err.message || 'Failed to delete transaction'
      console.error('Error deleting transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    summary,
    loading,
    error,
    fetchSummary,
    reloadCurrentMonth,
    createFixedPayment,
    updateFixedPayment,
    deleteFixedPayment,
    createCategory,
    updateCategory,
    deleteCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
```

### Step 20: Create useTheme Composable

Create `composables/useTheme.ts`:

```typescript
export const useTheme = () => {
  const colorMode = useColorMode()

  const isDark = computed(() => colorMode.preference === 'dark')

  const toggleTheme = () => {
    colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
  }

  return {
    isDark,
    toggleTheme,
  }
}
```

Update `nuxt.config.ts` to add color mode module:

```bash
npm install -D @nuxtjs/color-mode
```

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
  ],

  colorMode: {
    classSuffix: '', // Remove '-mode' suffix
  },

  // ... rest of config
})
```

---

## Phase 5: Utility Functions & Helpers

### Step 21: Create Currency Utility (Client-side)

Create `utils/currency.ts`:

```typescript
/**
 * Format currency in South African Rands
 */
export function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove 'R', spaces, and commas
  const cleaned = value.replace(/[R\s,]/g, '')
  return parseFloat(cleaned) || 0
}
```

### Step 22: Create Date Utility

Create `utils/date.ts`:

```typescript
/**
 * Get list of month names
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * Get year options for dropdown (current year ± 5)
 */
export function getYearOptions(): number[] {
  const currentYear = getCurrentYear()
  const years: number[] = []

  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i)
  }

  return years
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return formatDate(new Date())
}

/**
 * Validate if date is within a specific month/year
 */
export function isDateInMonth(dateStr: string, monthName: string, year: number): boolean {
  const date = new Date(dateStr)
  const monthIndex = MONTH_NAMES.indexOf(monthName)

  return date.getFullYear() === year && date.getMonth() === monthIndex
}
```

---

## Phase 6: UI Components

### Step 23: App Layout

Create `layouts/default.vue`:

```vue
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <slot />
  </div>
</template>
```

### Step 24: AppHeader Component

Create `components/AppHeader.vue`:

```vue
<script setup lang="ts">
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Basic Budget App
      </h1>

      <button
        @click="toggleTheme"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <!-- Sun icon (light mode) -->
        <svg
          v-if="!isDark"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>

        <!-- Moon icon (dark mode) -->
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      </button>
    </div>
  </header>
</template>
```

### Step 25: MonthSidebar Component

Create `components/MonthSidebar.vue`:

```vue
<script setup lang="ts">
const { months, currentMonth, selectMonth, loading } = useMonths()

const handleSelectMonth = async (monthId: number) => {
  await selectMonth(monthId)
}
</script>

<template>
  <aside class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
    <div class="p-4">
      <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Months
      </h2>

      <div v-if="loading" class="text-center py-4">
        <LoadingSpinner />
      </div>

      <ul v-else class="space-y-2">
        <li v-for="month in months" :key="month.id">
          <button
            @click="handleSelectMonth(month.id)"
            class="w-full text-left px-4 py-3 rounded-lg transition-colors"
            :class="[
              currentMonth?.id === month.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
            ]"
          >
            <div class="font-semibold">{{ month.monthName }}</div>
            <div class="text-sm opacity-75">{{ month.year }}</div>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>
```

### Step 26: LoadingSpinner Component

Create `components/LoadingSpinner.vue`:

```vue
<template>
  <div class="inline-block">
    <svg
      class="animate-spin h-5 w-5 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
</template>
```

### Step 27: ErrorAlert Component

Create `components/ErrorAlert.vue`:

```vue
<script setup lang="ts">
interface Props {
  message: string
}

defineProps<Props>()
</script>

<template>
  <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
    <div class="flex items-start">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
      <p class="text-sm text-red-800 dark:text-red-200">{{ message }}</p>
    </div>
  </div>
</template>
```

### Step 28: IncomeCard Component

Create `components/IncomeCard.vue`:

```vue
<script setup lang="ts">
const { currentMonth, updateMonth } = useMonths()

const isEditing = ref(false)
const editedIncome = ref(0)

const startEditing = () => {
  if (currentMonth.value) {
    editedIncome.value = currentMonth.value.income
    isEditing.value = true
  }
}

const saveIncome = async () => {
  if (!currentMonth.value) return

  try {
    await updateMonth(currentMonth.value.id, {
      income: editedIncome.value
    })
    isEditing.value = false
  } catch (error) {
    console.error('Failed to update income:', error)
  }
}

const cancelEditing = () => {
  isEditing.value = false
}
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        Monthly Income
      </h3>

      <button
        v-if="!isEditing"
        @click="startEditing"
        class="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        Edit
      </button>
    </div>

    <div v-if="!isEditing" class="text-2xl font-bold text-green-600 dark:text-green-400">
      {{ formatCurrency(currentMonth?.income || 0) }}
    </div>

    <div v-else class="space-y-3">
      <input
        v-model.number="editedIncome"
        type="number"
        step="0.01"
        class="input-field"
        placeholder="Enter income"
      />

      <div class="flex gap-2">
        <button @click="saveIncome" class="btn-primary flex-1">
          Save
        </button>
        <button @click="cancelEditing" class="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
```

### Step 29: FixedPaymentsList Component

Create `components/FixedPaymentsList.vue`:

```vue
<script setup lang="ts">
import type { FixedPayment } from '~/types/budget'

const { currentMonth } = useMonths()
const { createFixedPayment, updateFixedPayment, deleteFixedPayment } = useBudget()

const showModal = ref(false)
const editingPayment = ref<FixedPayment | null>(null)
const formData = ref({
  name: '',
  amount: 0
})

const openCreateModal = () => {
  editingPayment.value = null
  formData.value = { name: '', amount: 0 }
  showModal.value = true
}

const openEditModal = (payment: FixedPayment) => {
  editingPayment.value = payment
  formData.value = {
    name: payment.name,
    amount: payment.amount
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingPayment.value = null
}

const handleSubmit = async () => {
  if (!currentMonth.value) return

  try {
    if (editingPayment.value) {
      await updateFixedPayment(editingPayment.value.id, formData.value)
    } else {
      await createFixedPayment({
        monthId: currentMonth.value.id,
        ...formData.value
      })
    }
    closeModal()
  } catch (error) {
    console.error('Failed to save fixed payment:', error)
  }
}

const handleDelete = async (id: number) => {
  if (confirm('Delete this fixed payment?')) {
    try {
      await deleteFixedPayment(id)
    } catch (error) {
      console.error('Failed to delete fixed payment:', error)
    }
  }
}

const total = computed(() => {
  return currentMonth.value?.fixedPayments?.reduce((sum, fp) => sum + fp.amount, 0) || 0
})
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        Fixed Payments
      </h3>
      <button @click="openCreateModal" class="btn-primary text-sm">
        + Add
      </button>
    </div>

    <div v-if="currentMonth?.fixedPayments?.length" class="space-y-2">
      <div
        v-for="payment in currentMonth.fixedPayments"
        :key="payment.id"
        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
      >
        <span class="font-medium text-gray-900 dark:text-white">
          {{ payment.name }}
        </span>
        <div class="flex items-center gap-3">
          <span class="text-gray-900 dark:text-white">
            {{ formatCurrency(payment.amount) }}
          </span>
          <div class="flex gap-1">
            <button
              @click="openEditModal(payment)"
              class="text-blue-600 hover:text-blue-700 p-1"
              aria-label="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            <button
              @click="handleDelete(payment.id)"
              class="text-red-600 hover:text-red-700 p-1"
              aria-label="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-between">
        <span class="font-semibold text-gray-900 dark:text-white">Total:</span>
        <span class="font-bold text-gray-900 dark:text-white">
          {{ formatCurrency(total) }}
        </span>
      </div>
    </div>

    <p v-else class="text-gray-500 dark:text-gray-400 text-center py-4">
      No fixed payments yet
    </p>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {{ editingPayment ? 'Edit' : 'Add' }} Fixed Payment
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                v-model="formData.name"
                type="text"
                required
                class="input-field"
                placeholder="e.g., Rent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Amount (R)
              </label>
              <input
                v-model.number="formData.amount"
                type="number"
                step="0.01"
                required
                class="input-field"
                placeholder="0.00"
              />
            </div>

            <div class="flex gap-2">
              <button type="submit" class="btn-primary flex-1">
                {{ editingPayment ? 'Update' : 'Create' }}
              </button>
              <button type="button" @click="closeModal" class="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
```

### Step 30: BudgetCategoryCard Component

Create `components/BudgetCategoryCard.vue`:

```vue
<script setup lang="ts">
import type { BudgetCategory } from '~/types/budget'

interface Props {
  category: BudgetCategory
  spent: number
  remaining: number
  overBudget: number
}

const props = defineProps<Props>()

const { updateCategory, deleteCategory } = useBudget()

const isExpanded = ref(false)
const isEditing = ref(false)
const formData = ref({
  name: props.category.name,
  allocatedAmount: props.category.allocatedAmount
})

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const startEditing = () => {
  formData.value = {
    name: props.category.name,
    allocatedAmount: props.category.allocatedAmount
  }
  isEditing.value = true
}

const saveCategory = async () => {
  try {
    await updateCategory(props.category.id, formData.value)
    isEditing.value = false
  } catch (error) {
    console.error('Failed to update category:', error)
  }
}

const handleDelete = async () => {
  if (confirm(`Delete category "${props.category.name}"?`)) {
    try {
      await deleteCategory(props.category.id)
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }
}

const statusColor = computed(() => {
  return props.overBudget > 0 ? 'bg-red-500' : 'bg-green-500'
})
</script>

<template>
  <div class="card border-l-4" :class="statusColor">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <button
        @click="toggleExpanded"
        class="flex items-center gap-2 flex-1 text-left"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>

        <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ category.name }}
        </h4>
      </button>

      <div class="flex items-center gap-2">
        <button
          @click="startEditing"
          class="text-blue-600 hover:text-blue-700 p-1"
          aria-label="Edit category"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
        <button
          @click="handleDelete"
          class="text-red-600 hover:text-red-700 p-1"
          aria-label="Delete category"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Edit Form -->
    <div v-if="isEditing" class="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Category Name
        </label>
        <input
          v-model="formData.name"
          type="text"
          class="input-field"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Allocated Amount (R)
        </label>
        <input
          v-model.number="formData.allocatedAmount"
          type="number"
          step="0.01"
          class="input-field"
        />
      </div>

      <div class="flex gap-2">
        <button @click="saveCategory" class="btn-primary flex-1 text-sm">
          Save
        </button>
        <button @click="isEditing = false" class="btn-secondary flex-1 text-sm">
          Cancel
        </button>
      </div>
    </div>

    <!-- Budget Info -->
    <div class="grid grid-cols-2 gap-4 text-sm mb-3">
      <div>
        <div class="text-gray-600 dark:text-gray-400">Allocated</div>
        <div class="font-semibold text-gray-900 dark:text-white">
          {{ formatCurrency(category.allocatedAmount) }}
        </div>
      </div>

      <div>
        <div class="text-gray-600 dark:text-gray-400">Spent</div>
        <div class="font-semibold text-gray-900 dark:text-white">
          {{ formatCurrency(spent) }}
        </div>
      </div>

      <div>
        <div class="text-gray-600 dark:text-gray-400">Remaining</div>
        <div class="font-semibold text-green-600 dark:text-green-400">
          {{ formatCurrency(remaining) }}
        </div>
      </div>

      <div v-if="overBudget > 0">
        <div class="text-gray-600 dark:text-gray-400">Over Budget</div>
        <div class="font-semibold text-red-600 dark:text-red-400">
          {{ formatCurrency(overBudget) }}
        </div>
      </div>
    </div>

    <!-- Transactions List -->
    <div v-if="isExpanded" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
      <TransactionList :category-id="category.id" :transactions="category.transactions || []" />
    </div>
  </div>
</template>
```

### Step 31: TransactionList Component

Create `components/TransactionList.vue`:

```vue
<script setup lang="ts">
import type { Transaction } from '~/types/budget'

interface Props {
  categoryId: number
  transactions: Transaction[]
}

const props = defineProps<Props>()

const { createTransaction, updateTransaction, deleteTransaction } = useBudget()

const showModal = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const formData = ref({
  amount: 0,
  description: '',
  transactionDate: getTodayDate()
})

const openCreateModal = () => {
  editingTransaction.value = null
  formData.value = {
    amount: 0,
    description: '',
    transactionDate: getTodayDate()
  }
  showModal.value = true
}

const openEditModal = (transaction: Transaction) => {
  editingTransaction.value = transaction
  formData.value = {
    amount: transaction.amount,
    description: transaction.description || '',
    transactionDate: transaction.transactionDate || getTodayDate()
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingTransaction.value = null
}

const handleSubmit = async () => {
  try {
    if (editingTransaction.value) {
      await updateTransaction(editingTransaction.value.id, formData.value)
    } else {
      await createTransaction({
        categoryId: props.categoryId,
        ...formData.value
      })
    }
    closeModal()
  } catch (error) {
    console.error('Failed to save transaction:', error)
  }
}

const handleDelete = async (id: number) => {
  if (confirm('Delete this transaction?')) {
    try {
      await deleteTransaction(id)
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    }
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h5 class="font-semibold text-gray-900 dark:text-white">Transactions</h5>
      <button @click="openCreateModal" class="btn-primary text-xs">
        + Add Transaction
      </button>
    </div>

    <div v-if="transactions.length" class="space-y-2">
      <div
        v-for="transaction in transactions"
        :key="transaction.id"
        class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
      >
        <div class="flex-1">
          <div class="text-sm font-medium text-gray-900 dark:text-white">
            {{ transaction.description || 'No description' }}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ transaction.transactionDate }}
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="font-semibold text-gray-900 dark:text-white">
            {{ formatCurrency(transaction.amount) }}
          </span>
          <div class="flex gap-1">
            <button
              @click="openEditModal(transaction)"
              class="text-blue-600 hover:text-blue-700 p-1"
              aria-label="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            <button
              @click="handleDelete(transaction.id)"
              class="text-red-600 hover:text-red-700 p-1"
              aria-label="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
      No transactions yet
    </p>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {{ editingTransaction ? 'Edit' : 'Add' }} Transaction
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Amount (R)
              </label>
              <input
                v-model.number="formData.amount"
                type="number"
                step="0.01"
                required
                class="input-field"
                placeholder="0.00"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Description
              </label>
              <input
                v-model="formData.description"
                type="text"
                class="input-field"
                placeholder="e.g., Pick n Pay"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Date
              </label>
              <input
                v-model="formData.transactionDate"
                type="date"
                class="input-field"
              />
            </div>

            <div class="flex gap-2">
              <button type="submit" class="btn-primary flex-1">
                {{ editingTransaction ? 'Update' : 'Create' }}
              </button>
              <button type="button" @click="closeModal" class="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
```

### Step 32: BudgetSummaryCard Component

Create `components/BudgetSummaryCard.vue`:

```vue
<script setup lang="ts">
const { summary } = useBudget()

const statusColor = computed(() => {
  if (!summary.value) return 'text-gray-900 dark:text-white'
  return summary.value.totalMoneyLeft >= 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
})
</script>

<template>
  <div class="fixed bottom-6 right-6 card shadow-lg w-64">
    <h3 class="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
      Total Money Left
    </h3>

    <div class="text-2xl font-bold" :class="statusColor">
      {{ formatCurrency(summary?.totalMoneyLeft || 0) }}
    </div>

    <div v-if="summary" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-sm space-y-1">
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">Income:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(summary.income) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">Fixed Payments:</span>
        <span class="font-medium text-gray-900 dark:text-white">-{{ formatCurrency(summary.fixedPaymentsTotal) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">Actual Spending:</span>
        <span class="font-medium text-gray-900 dark:text-white">-{{ formatCurrency(summary.totalActualSpending) }}</span>
      </div>
    </div>
  </div>
</template>
```

### Step 33: Main Page

Create `pages/index.vue`:

```vue
<script setup lang="ts">
const { months, currentMonth, fetchMonths, selectMonth, loading, error } = useMonths()
const { summary, fetchSummary } = useBudget()

// Load months on mount
onMounted(async () => {
  await fetchMonths()

  // Auto-select first month
  if (months.value.length > 0 && !currentMonth.value) {
    await selectMonth(months.value[0].id)
    await fetchSummary(months.value[0].id)
  }
})

// Watch for current month changes to load summary
watch(() => currentMonth.value?.id, async (newId) => {
  if (newId) {
    await fetchSummary(newId)
  }
})

// Category spending helper
const getCategorySpending = (categoryId: number) => {
  return summary.value?.categorySpending.find(cs => cs.categoryId === categoryId)
}
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <MonthSidebar />

    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Header -->
      <AppHeader />

      <!-- Content -->
      <main class="container mx-auto px-4 py-6 pb-32">
        <ErrorAlert v-if="error" :message="error" class="mb-6" />

        <div v-if="loading" class="text-center py-12">
          <LoadingSpinner />
        </div>

        <div v-else-if="!currentMonth" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">
            No month selected. Create a month to get started.
          </p>
        </div>

        <div v-else class="space-y-6">
          <!-- Month Title -->
          <div>
            <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ currentMonth.monthName }} {{ currentMonth.year }}
            </h2>
          </div>

          <!-- Income Card -->
          <IncomeCard />

          <!-- Fixed Payments -->
          <FixedPaymentsList />

          <!-- Budget Categories -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                Budget Categories
              </h3>
              <button class="btn-primary">
                + Add Category
              </button>
            </div>

            <div class="space-y-4">
              <BudgetCategoryCard
                v-for="category in currentMonth.categories"
                :key="category.id"
                :category="category"
                :spent="getCategorySpending(category.id)?.spent || 0"
                :remaining="getCategorySpending(category.id)?.remaining || 0"
                :over-budget="getCategorySpending(category.id)?.overBudget || 0"
              />
            </div>

            <p
              v-if="!currentMonth.categories?.length"
              class="text-center text-gray-500 dark:text-gray-400 py-8"
            >
              No budget categories yet. Add one to get started!
            </p>
          </div>
        </div>
      </main>

      <!-- Fixed Summary Card -->
      <BudgetSummaryCard v-if="currentMonth" />
    </div>
  </div>
</template>
```

---

## Phase 7: Testing & Refinement

### Step 34: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

### Step 35: Test All Features

1. **Month Management:**
   - View list of months in sidebar
   - Select different months
   - Create new month
   - Edit month income
   - Delete month

2. **Fixed Payments:**
   - Add fixed payment
   - Edit fixed payment
   - Delete fixed payment
   - Verify totals calculation

3. **Budget Categories:**
   - Add category
   - Edit category name and allocated amount
   - Delete category (confirm cascade to transactions)
   - Expand/collapse categories

4. **Transactions:**
   - Add transaction to category
   - Edit transaction
   - Delete transaction
   - Verify spending calculations
   - Check over-budget indicator

5. **Calculations:**
   - Verify income calculations
   - Check fixed payments subtotal
   - Verify budget allocations
   - Check category spending (allocated vs spent)
   - Verify total money left

6. **Dark Mode:**
   - Toggle dark mode
   - Verify persistence (localStorage)
   - Check all components in dark mode

### Step 36: Database Migration (Optional)

If you want to import data from the old app:

Create `scripts/migrate-data.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import sqlite3 from 'sqlite3'
import { promisify } from 'util'

const prisma = new PrismaClient()
const oldDb = new sqlite3.Database('../budgeting-app/backend/database/budgeting.db')

const get = promisify(oldDb.get.bind(oldDb))
const all = promisify(oldDb.all.bind(oldDb))

async function migrate() {
  console.log('Starting migration...')

  // Get all months from old database
  const oldMonths = await all('SELECT * FROM months ORDER BY year DESC, month_name DESC')

  for (const oldMonth of oldMonths) {
    console.log(`Migrating month: ${oldMonth.month_name} ${oldMonth.year}`)

    // Create month in new database
    const newMonth = await prisma.month.create({
      data: {
        monthName: oldMonth.month_name,
        year: oldMonth.year,
        income: oldMonth.income, // Already in cents
      },
    })

    // Migrate fixed payments
    const oldFixedPayments = await all(
      'SELECT * FROM fixed_payments WHERE month_id = ?',
      [oldMonth.id]
    )

    for (const fp of oldFixedPayments) {
      await prisma.fixedPayment.create({
        data: {
          monthId: newMonth.id,
          name: fp.name,
          amount: fp.amount,
          orderIndex: fp.order_index || 0,
        },
      })
    }

    // Migrate categories and transactions
    const oldCategories = await all(
      'SELECT * FROM budget_categories WHERE month_id = ?',
      [oldMonth.id]
    )

    for (const cat of oldCategories) {
      const newCategory = await prisma.budgetCategory.create({
        data: {
          monthId: newMonth.id,
          name: cat.name,
          allocatedAmount: cat.allocated_amount,
          orderIndex: cat.order_index || 0,
        },
      })

      // Migrate transactions
      const oldTransactions = await all(
        'SELECT * FROM transactions WHERE category_id = ?',
        [cat.id]
      )

      for (const txn of oldTransactions) {
        await prisma.transaction.create({
          data: {
            categoryId: newCategory.id,
            amount: txn.amount,
            description: txn.description,
            transactionDate: txn.transaction_date,
          },
        })
      }
    }

    console.log(`✓ Migrated ${oldMonth.month_name} ${oldMonth.year}`)
  }

  console.log('Migration complete!')
  oldDb.close()
  await prisma.$disconnect()
}

migrate().catch(console.error)
```

Run migration:

```bash
npx tsx scripts/migrate-data.ts
```

---

## Phase 8: Enhancement Ideas (Future)

### Step 37: Additional Features

1. **Month Creation with Template:**
   - Copy previous month structure button
   - Carry over fixed payments and categories

2. **Drag-and-Drop Reordering:**
   - Use `@vueuse/core` for drag-and-drop
   - Update orderIndex on drop

3. **Data Export:**
   - Export to CSV/Excel using `xlsx` library
   - Export individual month or all data

4. **Charts and Visualizations:**
   - Pie chart for spending by category
   - Line chart for spending over time
   - Use Chart.js or Recharts

5. **Authentication (Phase 2):**
   - Install `@sidebase/nuxt-auth`
   - Add login/registration pages
   - Make userId required in schema
   - Add auth middleware to API routes

6. **Mobile App:**
   - Use Capacitor to build native apps
   - PWA support

---

## Deployment

### Step 38: Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

### Step 39: Deployment Options

**Option 1: Vercel (Recommended for Nuxt)**

```bash
npm install -g vercel
vercel
```

**Option 2: Netlify**

```bash
npm install -g netlify-cli
netlify deploy
```

**Option 3: Self-hosted (Node.js server)**

```bash
# Build
npm run build

# Start production server
node .output/server/index.mjs
```

**Option 4: Static Hosting**

For static hosting, update `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  ssr: false, // Disable SSR
  // ... rest of config
})
```

Then build:

```bash
npm run generate
```

Deploy the `.output/public` directory.

---

## Summary

This guide provides a complete roadmap for rebuilding the budgeting app in Nuxt 3. Key highlights:

**Backend (Nuxt Server):**
- SQLite database with Prisma ORM
- Type-safe database operations
- RESTful API routes in `server/api/`
- Automatic currency conversion (cents ↔ rands)
- Input validation with Zod

**Frontend (Vue 3):**
- Modular component architecture
- TailwindCSS for styling
- Dark mode support
- Composables for state management
- Type-safe throughout with TypeScript

**Full-Stack Benefits:**
- Unified codebase (no separate frontend/backend)
- Auto-imports for components and composables
- File-based routing
- Hot module replacement
- Production-ready build system

**Next Steps:**
1. Initialize project
2. Set up database
3. Create API routes
4. Build UI components
5. Test thoroughly
6. Deploy

Good luck with the rebuild! This modern stack will provide a much better development experience than the separate Angular/Express setup.
