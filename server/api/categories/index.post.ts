import { getPrisma } from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { categorySchema } from '~/server/utils/validation'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const body = await readBody(event)
    const validatedData = categorySchema.parse(body)

    // Verify ownership of the parent month
    const month = await prisma.transactionMonth.findFirst({
      where: { id: validatedData.monthId, profileToken },
    })

    if (!month) {
      return errors.notFound(event, 'Month not found')
    }

    const now = getCurrentTimestamp()

    const category = await prisma.transactionCategory.create({
      data: {
        monthId: validatedData.monthId,
        name: validatedData.name,
        allocatedAmount: randsToCents(validatedData.allocatedAmount),
        orderIndex: validatedData.orderIndex || 0,
        createdAt: now,
        updatedAt: now,
      },
    })

    // Return as-is (values in cents) to match GET endpoint
    return {
      ...category,
      transactions: [],
    }
  } catch (error) {
    return errors.serverError(event, 'Failed to create category', error as Error)
  }
})
