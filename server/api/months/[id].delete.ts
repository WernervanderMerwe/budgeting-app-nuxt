import prisma from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid month ID')
    }

    // Verify ownership
    const existing = await prisma.transactionMonth.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      return errors.notFound(event, 'Month not found')
    }

    await prisma.transactionMonth.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    return errors.serverError(event, 'Failed to delete month', error as Error)
  }
})
