import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { simulateTestError } from '~/server/utils/testError'

// PATCH /api/yearly/category-entries/[id] - Update a category entry (amount or isPaid)
export default defineEventHandler(async (event) => {
  try {
    // DEV ONLY: Simulate errors for testing optimistic updates
    await simulateTestError(event)

    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid category entry ID',
      })
    }

    // Verify ownership through parent chain
    const existing = await prisma.yearlyCategoryEntry.findFirst({
      where: {
        id,
        category: {
          section: {
            yearlyBudget: { profileToken },
          },
        },
      },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Category entry not found',
      })
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.isPaid !== undefined) updateData.isPaid = body.isPaid

    const entry = await prisma.yearlyCategoryEntry.update({
      where: { id },
      data: updateData,
    })

    return entry
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating category entry:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update category entry',
    })
  }
})
