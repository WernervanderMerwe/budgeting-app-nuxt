import { getPrisma } from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { fixedPaymentSchema } from '~/server/utils/validation'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const body = await readBody(event)
    const validatedData = fixedPaymentSchema.parse(body)

    // Verify ownership of the parent month
    const month = await prisma.transactionMonth.findFirst({
      where: { id: validatedData.monthId, profileToken },
    })

    if (!month) {
      return errors.notFound(event, 'Month not found')
    }

    const now = getCurrentTimestamp()

    const fixedPayment = await prisma.transactionFixedPayment.create({
      data: {
        monthId: validatedData.monthId,
        name: validatedData.name,
        amount: randsToCents(validatedData.amount),
        orderIndex: validatedData.orderIndex || 0,
        createdAt: now,
        updatedAt: now,
      },
    })

    // Return as-is (values in cents) to match GET endpoint
    setResponseStatus(event, 201)
    return fixedPayment
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validationError(event, error)
    }
    return errors.serverError(event, 'Failed to create fixed payment', error as Error)
  }
})
