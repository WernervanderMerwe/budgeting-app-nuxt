import prisma from '~/server/utils/db'
import dayjs from 'dayjs'

// PATCH /api/yearly/income-sources/[id] - Update an income source
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid income source ID',
      })
    }

    const updateData: any = {
      updatedAt: dayjs().unix(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const incomeSource = await prisma.yearlyIncomeSource.update({
      where: { id },
      data: updateData,
    })

    return incomeSource
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating income source:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update income source',
    })
  }
})
