import prisma from '~/server/utils/db'
import { randsToCents } from '~/server/utils/currency'
import { monthSchema } from '~/server/utils/validation'
import { getCurrentTimestamp } from '~/server/utils/date'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const body = await readBody(event)

    // Validate input
    const validatedData = monthSchema.parse(body)

    const now = getCurrentTimestamp()

    // Create month
    const month = await prisma.transactionMonth.create({
      data: {
        name: validatedData.name,
        year: validatedData.year,
        month: validatedData.month,
        income: randsToCents(validatedData.income),
        profileToken,
        createdAt: now,
        updatedAt: now,
      },
    })

    // If copyFromMonthId is provided, copy fixed payments and categories
    if (validatedData.copyFromMonthId) {
      // Verify ownership of source month
      const sourceMonth = await prisma.transactionMonth.findFirst({
        where: { id: validatedData.copyFromMonthId, profileToken },
      })

      if (!sourceMonth) {
        throw createError({
          statusCode: 404,
          message: 'Source month not found',
        })
      }

      // Copy fixed payments
      const sourceFixedPayments = await prisma.transactionFixedPayment.findMany({
        where: { monthId: validatedData.copyFromMonthId },
        orderBy: { orderIndex: 'asc' },
      })

      for (const payment of sourceFixedPayments) {
        await prisma.transactionFixedPayment.create({
          data: {
            monthId: month.id,
            name: payment.name,
            amount: payment.amount,
            orderIndex: payment.orderIndex,
            createdAt: now,
            updatedAt: now,
          },
        })
      }

      // Copy budget categories (without transactions)
      const sourceCategories = await prisma.transactionCategory.findMany({
        where: { monthId: validatedData.copyFromMonthId },
        orderBy: { orderIndex: 'asc' },
      })

      for (const category of sourceCategories) {
        await prisma.transactionCategory.create({
          data: {
            monthId: month.id,
            name: category.name,
            allocatedAmount: category.allocatedAmount,
            orderIndex: category.orderIndex,
            createdAt: now,
            updatedAt: now,
          },
        })
      }
    }

    return {
      ...month,
      income: validatedData.income,
    }
  } catch (error) {
    console.error('Error creating month:', error)

    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: 'Invalid input data',
        data: error.issues,
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to create month',
    })
  }
})
