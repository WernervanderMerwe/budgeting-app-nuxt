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
