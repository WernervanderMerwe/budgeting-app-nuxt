import prisma from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    // Verify ownership through parent month
    const existing = await prisma.transactionFixedPayment.findFirst({
      where: {
        id,
        month: { profileToken },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Fixed payment not found')
    }

    await prisma.transactionFixedPayment.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    return errors.serverError(event, 'Failed to delete fixed payment', error as Error)
  }
})
