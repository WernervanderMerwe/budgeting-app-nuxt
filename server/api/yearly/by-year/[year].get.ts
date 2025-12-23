import { getPrisma } from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

// GET /api/yearly/by-year/[year] - Get a yearly budget by year with all relations
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const year = parseInt(getRouterParam(event, 'year')!)

    if (isNaN(year)) {
      return errors.badRequest(event, 'Invalid year')
    }

    const yearlyBudget = await prisma.yearlyBudget.findFirst({
      where: { year, profileToken },
      include: {
        incomeSources: {
          orderBy: { orderIndex: 'asc' },
          include: {
            entries: {
              orderBy: { month: 'asc' },
              include: {
                deductions: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            categories: {
              where: { parentId: null }, // Only top-level categories
              orderBy: { orderIndex: 'asc' },
              include: {
                children: {
                  orderBy: { orderIndex: 'asc' },
                  include: {
                    entries: {
                      orderBy: { month: 'asc' },
                    },
                  },
                },
                entries: {
                  orderBy: { month: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!yearlyBudget) {
      return errors.notFound(event, `Budget for year ${year} not found`)
    }

    return yearlyBudget
  } catch (error: any) {
    return errors.serverError(event, 'Failed to fetch yearly budget', error)
  }
})
