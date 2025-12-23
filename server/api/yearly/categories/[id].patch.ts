import { getPrisma } from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// PATCH /api/yearly/categories/[id] - Update a category
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

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

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex
    if (body.parentId !== undefined) updateData.parentId = body.parentId

    const category = await prisma.yearlyCategory.update({
      where: { id },
      data: updateData,
    })

    return category
  } catch (error) {
    return errors.serverError(event, 'Failed to update category', error as Error)
  }
})
