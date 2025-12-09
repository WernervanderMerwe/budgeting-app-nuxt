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

  // === JANUARY 2025 ===
  const january = await prisma.transactionMonth.create({
    data: {
      userId: user.id,
      name: 'January 2025',
      year: 2025,
      month: 1,
      income: 4500000, // R45,000 in cents
      createdAt: now,
      updatedAt: now,
      fixedPayments: {
        create: [
          { name: 'Rent', amount: 1050000, orderIndex: 1, createdAt: now, updatedAt: now }, // R10,500
          { name: 'Car Payment', amount: 585000, orderIndex: 2, createdAt: now, updatedAt: now }, // R5,850
          { name: 'Electricity', amount: 145000, orderIndex: 3, createdAt: now, updatedAt: now }, // R1,450
          { name: 'Water & Sewerage', amount: 48000, orderIndex: 4, createdAt: now, updatedAt: now }, // R480
          { name: 'Cell Phone Contract', amount: 69900, orderIndex: 5, createdAt: now, updatedAt: now }, // R699
          { name: 'Internet (Fibre)', amount: 89900, orderIndex: 6, createdAt: now, updatedAt: now }, // R899
          { name: 'Medical Aid', amount: 425000, orderIndex: 7, createdAt: now, updatedAt: now }, // R4,250
          { name: 'Life Insurance', amount: 65000, orderIndex: 8, createdAt: now, updatedAt: now }, // R650
        ],
      },
      categories: {
        create: [
          {
            name: 'Groceries',
            allocatedAmount: 500000, // R5,000
            orderIndex: 1,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 128500, description: 'Woolworths', transactionDate: dayjs('2025-01-05').unix(), createdAt: now, updatedAt: now },
                { amount: 89200, description: 'Pick n Pay', transactionDate: dayjs('2025-01-12').unix(), createdAt: now, updatedAt: now },
                { amount: 145600, description: 'Checkers', transactionDate: dayjs('2025-01-19').unix(), createdAt: now, updatedAt: now },
                { amount: 92300, description: 'Spar', transactionDate: dayjs('2025-01-26').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Fuel',
            allocatedAmount: 220000, // R2,200
            orderIndex: 2,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 75000, description: 'Engen - Full Tank', transactionDate: dayjs('2025-01-08').unix(), createdAt: now, updatedAt: now },
                { amount: 73500, description: 'Shell - Full Tank', transactionDate: dayjs('2025-01-18').unix(), createdAt: now, updatedAt: now },
                { amount: 50000, description: 'BP - Half Tank', transactionDate: dayjs('2025-01-28').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Eating Out',
            allocatedAmount: 150000, // R1,500
            orderIndex: 3,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 32500, description: 'Spur Steakhouse', transactionDate: dayjs('2025-01-10').unix(), createdAt: now, updatedAt: now },
                { amount: 28900, description: 'Nando\'s', transactionDate: dayjs('2025-01-17').unix(), createdAt: now, updatedAt: now },
                { amount: 45600, description: 'Ocean Basket', transactionDate: dayjs('2025-01-24').unix(), createdAt: now, updatedAt: now },
                { amount: 18500, description: 'Wimpy Breakfast', transactionDate: dayjs('2025-01-31').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Entertainment',
            allocatedAmount: 100000, // R1,000
            orderIndex: 4,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 13900, description: 'Netflix Subscription', transactionDate: dayjs('2025-01-01').unix(), createdAt: now, updatedAt: now },
                { amount: 34900, description: 'DSTV Premium', transactionDate: dayjs('2025-01-01').unix(), createdAt: now, updatedAt: now },
                { amount: 32000, description: 'Cinema - Ster Kinekor', transactionDate: dayjs('2025-01-20').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Hobbies & Sports',
            allocatedAmount: 80000, // R800
            orderIndex: 5,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 59900, description: 'Virgin Active Gym', transactionDate: dayjs('2025-01-01').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Personal Care',
            allocatedAmount: 60000, // R600
            orderIndex: 6,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 38000, description: 'Clicks - Toiletries', transactionDate: dayjs('2025-01-14').unix(), createdAt: now, updatedAt: now },
                { amount: 18500, description: 'Dischem - Vitamins', transactionDate: dayjs('2025-01-21').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Clothing',
            allocatedAmount: 80000, // R800
            orderIndex: 7,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 75000, description: 'Mr Price', transactionDate: dayjs('2025-01-16').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
        ],
      },
    },
  })

  // === FEBRUARY 2025 ===
  const february = await prisma.transactionMonth.create({
    data: {
      userId: user.id,
      name: 'February 2025',
      year: 2025,
      month: 2,
      income: 4500000, // R45,000
      createdAt: now,
      updatedAt: now,
      fixedPayments: {
        create: [
          { name: 'Rent', amount: 1050000, orderIndex: 1, createdAt: now, updatedAt: now },
          { name: 'Car Payment', amount: 585000, orderIndex: 2, createdAt: now, updatedAt: now },
          { name: 'Electricity', amount: 158000, orderIndex: 3, createdAt: now, updatedAt: now }, // R1,580 (summer high)
          { name: 'Water & Sewerage', amount: 48000, orderIndex: 4, createdAt: now, updatedAt: now },
          { name: 'Cell Phone Contract', amount: 69900, orderIndex: 5, createdAt: now, updatedAt: now },
          { name: 'Internet (Fibre)', amount: 89900, orderIndex: 6, createdAt: now, updatedAt: now },
          { name: 'Medical Aid', amount: 425000, orderIndex: 7, createdAt: now, updatedAt: now },
          { name: 'Life Insurance', amount: 65000, orderIndex: 8, createdAt: now, updatedAt: now },
        ],
      },
      categories: {
        create: [
          {
            name: 'Groceries',
            allocatedAmount: 500000, // R5,000
            orderIndex: 1,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 135200, description: 'Woolworths', transactionDate: dayjs('2025-02-02').unix(), createdAt: now, updatedAt: now },
                { amount: 96800, description: 'Pick n Pay', transactionDate: dayjs('2025-02-09').unix(), createdAt: now, updatedAt: now },
                { amount: 142500, description: 'Checkers', transactionDate: dayjs('2025-02-16').unix(), createdAt: now, updatedAt: now },
                { amount: 88700, description: 'Spar', transactionDate: dayjs('2025-02-23').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Fuel',
            allocatedAmount: 220000, // R2,200
            orderIndex: 2,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 72000, description: 'Sasol - Full Tank', transactionDate: dayjs('2025-02-05').unix(), createdAt: now, updatedAt: now },
                { amount: 74500, description: 'Engen - Full Tank', transactionDate: dayjs('2025-02-15').unix(), createdAt: now, updatedAt: now },
                { amount: 71000, description: 'Shell - Full Tank', transactionDate: dayjs('2025-02-25').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Eating Out',
            allocatedAmount: 150000, // R1,500
            orderIndex: 3,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 52000, description: 'Panarottis', transactionDate: dayjs('2025-02-07').unix(), createdAt: now, updatedAt: now },
                { amount: 31500, description: 'KFC', transactionDate: dayjs('2025-02-14').unix(), createdAt: now, updatedAt: now },
                { amount: 48500, description: 'Mike\'s Kitchen', transactionDate: dayjs('2025-02-21').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Entertainment',
            allocatedAmount: 100000, // R1,000
            orderIndex: 4,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 13900, description: 'Netflix Subscription', transactionDate: dayjs('2025-02-01').unix(), createdAt: now, updatedAt: now },
                { amount: 34900, description: 'DSTV Premium', transactionDate: dayjs('2025-02-01').unix(), createdAt: now, updatedAt: now },
                { amount: 28000, description: 'Nu Metro Cinema', transactionDate: dayjs('2025-02-14').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Hobbies & Sports',
            allocatedAmount: 80000, // R800
            orderIndex: 5,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 59900, description: 'Virgin Active Gym', transactionDate: dayjs('2025-02-01').unix(), createdAt: now, updatedAt: now },
                { amount: 15000, description: 'Totalsports - Running Gear', transactionDate: dayjs('2025-02-18').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Personal Care',
            allocatedAmount: 60000, // R600
            orderIndex: 6,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 42000, description: 'Clicks - Toiletries', transactionDate: dayjs('2025-02-11').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Clothing',
            allocatedAmount: 80000, // R800
            orderIndex: 7,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 65000, description: 'Woolworths Fashion', transactionDate: dayjs('2025-02-20').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
        ],
      },
    },
  })

  // === MARCH 2025 ===
  const march = await prisma.transactionMonth.create({
    data: {
      userId: user.id,
      name: 'March 2025',
      year: 2025,
      month: 3,
      income: 4500000, // R45,000
      createdAt: now,
      updatedAt: now,
      fixedPayments: {
        create: [
          { name: 'Rent', amount: 1050000, orderIndex: 1, createdAt: now, updatedAt: now },
          { name: 'Car Payment', amount: 585000, orderIndex: 2, createdAt: now, updatedAt: now },
          { name: 'Electricity', amount: 132000, orderIndex: 3, createdAt: now, updatedAt: now }, // R1,320 (autumn)
          { name: 'Water & Sewerage', amount: 48000, orderIndex: 4, createdAt: now, updatedAt: now },
          { name: 'Cell Phone Contract', amount: 69900, orderIndex: 5, createdAt: now, updatedAt: now },
          { name: 'Internet (Fibre)', amount: 89900, orderIndex: 6, createdAt: now, updatedAt: now },
          { name: 'Medical Aid', amount: 425000, orderIndex: 7, createdAt: now, updatedAt: now },
          { name: 'Life Insurance', amount: 65000, orderIndex: 8, createdAt: now, updatedAt: now },
        ],
      },
      categories: {
        create: [
          {
            name: 'Groceries',
            allocatedAmount: 500000, // R5,000
            orderIndex: 1,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 142000, description: 'Woolworths', transactionDate: dayjs('2025-03-02').unix(), createdAt: now, updatedAt: now },
                { amount: 102500, description: 'Pick n Pay', transactionDate: dayjs('2025-03-09').unix(), createdAt: now, updatedAt: now },
                { amount: 138200, description: 'Checkers', transactionDate: dayjs('2025-03-16').unix(), createdAt: now, updatedAt: now },
                { amount: 95000, description: 'Spar', transactionDate: dayjs('2025-03-23').unix(), createdAt: now, updatedAt: now },
                { amount: 15000, description: 'Fruit & Veg City', transactionDate: dayjs('2025-03-30').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Fuel',
            allocatedAmount: 220000, // R2,200
            orderIndex: 2,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 76000, description: 'Shell - Full Tank', transactionDate: dayjs('2025-03-06').unix(), createdAt: now, updatedAt: now },
                { amount: 73500, description: 'Engen - Full Tank', transactionDate: dayjs('2025-03-16').unix(), createdAt: now, updatedAt: now },
                { amount: 68000, description: 'BP - Full Tank', transactionDate: dayjs('2025-03-26').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Eating Out',
            allocatedAmount: 150000, // R1,500
            orderIndex: 3,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 41500, description: 'Mugg & Bean', transactionDate: dayjs('2025-03-08').unix(), createdAt: now, updatedAt: now },
                { amount: 29900, description: 'Steers', transactionDate: dayjs('2025-03-15').unix(), createdAt: now, updatedAt: now },
                { amount: 58000, description: 'Col\'Cacchio Pizzeria', transactionDate: dayjs('2025-03-22').unix(), createdAt: now, updatedAt: now },
                { amount: 16500, description: 'Vida e Caffe', transactionDate: dayjs('2025-03-29').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Entertainment',
            allocatedAmount: 100000, // R1,000
            orderIndex: 4,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 13900, description: 'Netflix Subscription', transactionDate: dayjs('2025-03-01').unix(), createdAt: now, updatedAt: now },
                { amount: 34900, description: 'DSTV Premium', transactionDate: dayjs('2025-03-01').unix(), createdAt: now, updatedAt: now },
                { amount: 12500, description: 'Spotify Premium', transactionDate: dayjs('2025-03-01').unix(), createdAt: now, updatedAt: now },
                { amount: 30000, description: 'Cinema - Ster Kinekor', transactionDate: dayjs('2025-03-20').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Hobbies & Sports',
            allocatedAmount: 80000, // R800
            orderIndex: 5,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 59900, description: 'Virgin Active Gym', transactionDate: dayjs('2025-03-01').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Personal Care',
            allocatedAmount: 60000, // R600
            orderIndex: 6,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 35000, description: 'Clicks - Toiletries', transactionDate: dayjs('2025-03-12').unix(), createdAt: now, updatedAt: now },
                { amount: 22000, description: 'Dischem - Supplements', transactionDate: dayjs('2025-03-25').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Clothing',
            allocatedAmount: 80000, // R800
            orderIndex: 7,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 78500, description: 'Edgars', transactionDate: dayjs('2025-03-18').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
          {
            name: 'Miscellaneous',
            allocatedAmount: 50000, // R500
            orderIndex: 8,
            createdAt: now,
            updatedAt: now,
            transactions: {
              create: [
                { amount: 25000, description: 'Car Wash', transactionDate: dayjs('2025-03-10').unix(), createdAt: now, updatedAt: now },
                { amount: 18500, description: 'Pet Food - Pet Zone', transactionDate: dayjs('2025-03-24').unix(), createdAt: now, updatedAt: now },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('Seeding finished.')
  console.log({ user, january, february, march })
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
