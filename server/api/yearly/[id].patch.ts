import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'

// PATCH /api/yearly/[id] - Update yearly budget settings
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid yearly budget ID',
      })
    }

    // Verify ownership before update
    const existing = await prisma.yearlyBudget.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Yearly budget not found',
      })
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
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
