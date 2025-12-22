import prisma from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

// DELETE /api/yearly/categories/[id] - Delete a category
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid category ID')
    }

    // Verify ownership through parent chain
    const existing = await prisma.yearlyCategory.findFirst({
      where: {
        id,
        section: {
          yearlyBudget: { profileToken },
        },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Category not found')
    }

    await prisma.yearlyCategory.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    return errors.serverError(event, 'Failed to delete category', error as Error)
  }
})
