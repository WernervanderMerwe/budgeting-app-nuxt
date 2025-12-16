import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { transactionSchema } from '~/server/utils/validation'
import { getCurrentTimestamp } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const body = await readBody(event)
    const validatedData = transactionSchema.parse(body)

    // Verify ownership through parent chain: category -> month
    const category = await prisma.transactionCategory.findFirst({
      where: {
        id: validatedData.categoryId,
        month: { profileToken },
      },
    })

    if (!category) {
      throw createError({
        statusCode: 404,
        message: 'Category not found',
      })
    }

    const now = getCurrentTimestamp()

    const transaction = await prisma.transactionEntry.create({
      data: {
        categoryId: validatedData.categoryId,
        amount: randsToCents(validatedData.amount),
        description: validatedData.description,
        transactionDate: validatedData.transactionDate || now,
        createdAt: now,
        updatedAt: now,
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
