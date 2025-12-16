import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'

// PATCH /api/yearly/deductions/[id] - Update a deduction
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid deduction ID',
      })
    }

    // Verify ownership through parent chain
    const existing = await prisma.yearlyDeduction.findFirst({
      where: {
        id,
        incomeEntry: {
          incomeSource: {
            yearlyBudget: { profileToken },
          },
        },
      },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Deduction not found',
      })
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const deduction = await prisma.yearlyDeduction.update({
      where: { id },
      data: updateData,
    })

    return deduction
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating deduction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update deduction',
    })
  }
})
