import prisma from '~/server/utils/db'
import { randsToCents } from '~/server/utils/currency'
import { getCurrentTimestamp } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    // Verify ownership
    const existing = await prisma.transactionMonth.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Month not found',
      })
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.year !== undefined) updateData.year = body.year
    if (body.month !== undefined) updateData.month = body.month
    if (body.income !== undefined) updateData.income = randsToCents(body.income)

    const month = await prisma.transactionMonth.update({
      where: { id },
      data: updateData,
    })

    return month
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update month',
    })
  }
})
