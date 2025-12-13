import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { getCurrentTimestamp } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined) updateData.amount = randsToCents(body.amount)
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const fixedPayment = await prisma.transactionFixedPayment.update({
      where: { id },
      data: updateData,
    })

    return {
      ...fixedPayment,
      amount: centsToRands(fixedPayment.amount),
    }
  } catch (error) {
    console.error('Error updating fixed payment:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update fixed payment',
    })
  }
})
