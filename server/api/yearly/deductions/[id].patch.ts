import prisma from '~/server/utils/db'
import dayjs from 'dayjs'

// PATCH /api/yearly/deductions/[id] - Update a deduction
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid deduction ID',
      })
    }

    const updateData: any = {
      updatedAt: dayjs().unix(),
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
