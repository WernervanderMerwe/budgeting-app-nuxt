import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { fixedPaymentSchema } from '~/server/utils/validation'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = fixedPaymentSchema.parse(body)

    const now = dayjs().unix()

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

    return {
      ...fixedPayment,
      amount: centsToRands(fixedPayment.amount),
    }
  } catch (error) {
    console.error('Error creating fixed payment:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create fixed payment',
    })
  }
})
