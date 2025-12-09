import prisma from '~/server/utils/db'
import dayjs from 'dayjs'

// PATCH /api/yearly/category-entries/[id] - Update a category entry (amount or isPaid)
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid category entry ID',
      })
    }

    const updateData: any = {
      updatedAt: dayjs().unix(),
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
