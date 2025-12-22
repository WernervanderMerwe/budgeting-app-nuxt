import prisma from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context

    const months = await prisma.transactionMonth.findMany({
      where: { profileToken },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        year: true,
        month: true,
        income: true,
        createdAt: true,
      },
    })

    // Return as-is (values in cents)
    return months
  } catch (error) {
    return errors.serverError(event, 'Failed to fetch months', error as Error)
  }
})
