import prisma from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    // Verify ownership through parent month
    const existing = await prisma.transactionCategory.findFirst({
      where: {
        id,
        month: { profileToken },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Category not found')
    }

    await prisma.transactionCategory.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    return errors.serverError(event, 'Failed to delete category', error as Error)
  }
})
