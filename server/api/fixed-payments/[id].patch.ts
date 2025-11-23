import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    const updateData: any = {
      updatedAt: dayjs().unix(),
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined) updateData.amount = randsToCents(body.amount)
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const fixedPayment = await prisma.fixedPayment.update({
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
