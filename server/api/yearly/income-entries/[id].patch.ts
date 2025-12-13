import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'

// PATCH /api/yearly/income-entries/[id] - Update an income entry (gross amount)
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid income entry ID',
      })
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.grossAmount !== undefined) updateData.grossAmount = body.grossAmount

    const incomeEntry = await prisma.yearlyIncomeEntry.update({
      where: { id },
      data: updateData,
      include: {
        deductions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    return incomeEntry
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating income entry:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update income entry',
    })
  }
})
