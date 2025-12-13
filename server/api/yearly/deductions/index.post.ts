import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'

// POST /api/yearly/deductions - Create a new deduction
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { incomeEntryId, name, amount = 0, orderIndex = 0 } = body

    if (!incomeEntryId || !name) {
      throw createError({
        statusCode: 400,
        message: 'incomeEntryId and name are required',
      })
    }

    const now = getCurrentTimestamp()

    const deduction = await prisma.yearlyDeduction.create({
      data: {
        incomeEntryId,
        name,
        amount,
        orderIndex,
        createdAt: now,
        updatedAt: now,
      },
    })

    return deduction
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error creating deduction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create deduction',
    })
  }
})
