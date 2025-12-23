import { getPrisma } from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)

    // Verify ownership through parent chain: category -> month
    const existing = await prisma.transactionEntry.findFirst({
      where: {
        id,
        category: {
          month: { profileToken },
        },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Transaction not found')
    }

    await prisma.transactionEntry.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    return errors.serverError(event, 'Failed to delete transaction', error as Error)
  }
})
