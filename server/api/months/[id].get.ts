import { getPrisma } from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid month ID')
    }

    const month = await prisma.transactionMonth.findFirst({
      where: { id, profileToken },
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
      return errors.notFound(event, 'Month not found')
    }

    // Return as-is (values in cents)
    return month
  } catch (error) {
    return errors.serverError(event, 'Failed to fetch month', error as Error)
  }
})
