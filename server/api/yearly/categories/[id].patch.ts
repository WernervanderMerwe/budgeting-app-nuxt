import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'

// PATCH /api/yearly/categories/[id] - Update a category
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid category ID',
      })
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
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating category:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update category',
    })
  }
})
