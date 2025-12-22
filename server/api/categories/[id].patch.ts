import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

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

    // Return as-is (values in cents) to match GET endpoint
    return category
  } catch (error) {
    return errors.serverError(event, 'Failed to update category', error as Error)
  }
})
