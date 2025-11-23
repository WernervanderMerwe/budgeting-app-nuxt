import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    const updateData: any = {}
    if (body.amount !== undefined) updateData.amount = randsToCents(body.amount)
    if (body.description !== undefined) updateData.description = body.description
    if (body.transactionDate !== undefined) updateData.transactionDate = body.transactionDate

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })

    return {
      ...transaction,
      amount: centsToRands(transaction.amount),
    }
  } catch (error) {
    console.error('Error updating transaction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update transaction',
    })
  }
})
