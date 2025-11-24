import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'

const prisma = new PrismaClient()

// Get current Unix timestamp in seconds
const now = dayjs().unix()

async function main() {
  console.log('Start seeding...')

  // Check if data already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  })

  if (existingUser) {
    console.log('Database already seeded. Skipping...')
    return
  }

  // Create test user (for future auth)
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      createdAt: now,
      updatedAt: now,
    },
  })

  // Create a test month
  const month = await prisma.month.create({
    data: {
      userId: user.id,
      name: 'January',
      year: 2025,
      month: 1,
      income: 3000000, // R30,000 in cents
      createdAt: now,
      updatedAt: now,
      fixedPayments: {
        create: [
          { name: 'Rent', amount: 800000, orderIndex: 1, createdAt: now, updatedAt: now }, // R8,000
          { name: 'Phone', amount: 50000, orderIndex: 2, createdAt: now, updatedAt: now }, // R500
          { name: 'Utilities', amount: 150000, orderIndex: 3, createdAt: now, updatedAt: now }, // R1,500
        ],
      },
      categories: {
        create: [
          {
            name: 'Groceries',
            allocatedAmount: 400000, // R4,000
            orderIndex: 1,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                {
                  amount: 25000, // R250
                  description: 'Pick n Pay',
                  transactionDate: dayjs('2025-01-15').unix(), // Unix timestamp for Jan 15, 2025
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            },
          },
          {
            name: 'Fuel',
            allocatedAmount: 200000, // R2,000
            orderIndex: 2,
            createdAt: now,
            updatedAt: now,
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
