import prisma from '~/server/utils/db'

// GET /api/yearly/[id] - Get a yearly budget with all relations
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid yearly budget ID',
      })
    }

    const yearlyBudget = await prisma.yearlyBudget.findUnique({
      where: { id },
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
      throw createError({
        statusCode: 404,
        message: 'Yearly budget not found',
      })
    }

    return yearlyBudget
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching yearly budget:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch yearly budget',
    })
  }
})
