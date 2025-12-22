import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// Default sections for 70/20/10 rule
const DEFAULT_SECTIONS = [
  { type: 'LIVING', name: 'Living Essentials', targetPercent: 70, orderIndex: 0 },
  { type: 'NON_ESSENTIAL', name: 'Non-Essentials', targetPercent: 20, orderIndex: 1 },
  { type: 'SAVINGS', name: 'Savings', targetPercent: 10, orderIndex: 2 },
]

// POST /api/yearly - Create a new yearly budget with default sections
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const body = await readBody(event)
    const { year, spendTarget = 500000, showWarnings = true } = body

    if (!year || typeof year !== 'number') {
      return errors.badRequest(event, 'Year is required and must be a number')
    }

    // Check if budget already exists for this year for this user
    const existing = await prisma.yearlyBudget.findFirst({
      where: { year, profileToken },
    })

    if (existing) {
      setResponseStatus(event, 409)
      return { error: true, statusCode: 409, message: `Budget for year ${year} already exists` }
    }

    const now = getCurrentTimestamp()

    // Create yearly budget with default sections
    const yearlyBudget = await prisma.yearlyBudget.create({
      data: {
        year,
        spendTarget,
        showWarnings,
        profileToken,
        createdAt: now,
        updatedAt: now,
        sections: {
          create: DEFAULT_SECTIONS.map(section => ({
            ...section,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    return yearlyBudget
  } catch (error: any) {
    return errors.serverError(event, 'Failed to create yearly budget', error)
  }
})
