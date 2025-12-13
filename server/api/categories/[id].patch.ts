import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { getCurrentTimestamp } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.allocatedAmount !== undefined) {
      updateData.allocatedAmount = randsToCents(body.allocatedAmount)
    }
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const category = await prisma.transactionCategory.update({
      where: { id },
      data: updateData,
    })

    return {
      ...category,
      allocatedAmount: centsToRands(category.allocatedAmount),
    }
  } catch (error) {
    console.error('Error updating category:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update category',
    })
  }
})
