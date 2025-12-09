import prisma from '~/server/utils/db'
import dayjs from 'dayjs'

// PATCH /api/yearly/[id] - Update yearly budget settings
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid yearly budget ID',
      })
    }

    const updateData: any = {
      updatedAt: dayjs().unix(),
    }

    if (body.spendTarget !== undefined) updateData.spendTarget = body.spendTarget
    if (body.showWarnings !== undefined) updateData.showWarnings = body.showWarnings

    const yearlyBudget = await prisma.yearlyBudget.update({
      where: { id },
      data: updateData,
    })

    return yearlyBudget
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating yearly budget:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update yearly budget',
    })
  }
})
