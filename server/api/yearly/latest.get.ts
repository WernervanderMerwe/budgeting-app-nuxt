import prisma from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

// GET /api/yearly/latest - Get the latest yearly budget year
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context

    const latestBudget = await prisma.yearlyBudget.findFirst({
      where: { profileToken },
      orderBy: { year: 'desc' },
      select: {
        year: true,
      },
    })

    if (!latestBudget) {
      return { year: null }
    }

    return { year: latestBudget.year }
  } catch (error: any) {
    return errors.serverError(event, 'Failed to fetch latest yearly budget', error)
  }
})
