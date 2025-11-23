import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { transactionSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = transactionSchema.parse(body)

    const transaction = await prisma.transaction.create({
      data: {
        categoryId: validatedData.categoryId,
        amount: randsToCents(validatedData.amount),
        description: validatedData.description,
        transactionDate: validatedData.transactionDate,
      },
    })

    return {
      ...transaction,
      amount: centsToRands(transaction.amount),
    }
  } catch (error) {
    console.error('Error creating transaction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create transaction',
    })
  }
})
