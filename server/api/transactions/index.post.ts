import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { transactionSchema } from '~/server/utils/validation'
import { getCurrentTimestamp } from '~/server/utils/date'
import { simulateTestError } from '~/server/utils/testError'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    // DEV ONLY: Simulate errors for testing optimistic updates
    await simulateTestError(event)

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
      return errors.notFound(event, 'Category not found')
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

    // Return as-is (values in cents) to match GET endpoint
    return transaction
  } catch (error) {
    return errors.serverError(event, 'Failed to create transaction', error as Error)
  }
})
