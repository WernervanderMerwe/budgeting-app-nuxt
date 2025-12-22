import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { getCurrentTimestamp } from '~/server/utils/date'
import { simulateTestError } from '~/server/utils/testError'

export default defineEventHandler(async (event) => {
  try {
    // DEV ONLY: Simulate errors for testing optimistic updates
    await simulateTestError(event)

    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    // Verify ownership through parent chain: category -> month
    const existing = await prisma.transactionEntry.findFirst({
      where: {
        id,
        category: {
          month: { profileToken },
        },
      },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }
    if (body.amount !== undefined) updateData.amount = randsToCents(body.amount)
    if (body.description !== undefined) updateData.description = body.description
    if (body.transactionDate !== undefined) updateData.transactionDate = body.transactionDate

    const transaction = await prisma.transactionEntry.update({
      where: { id },
      data: updateData,
    })

    // Return as-is (values in cents) to match GET endpoint
    return transaction
  } catch (error) {
    console.error('Error updating transaction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update transaction',
    })
  }
})
