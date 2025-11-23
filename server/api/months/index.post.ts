import prisma from '~/server/utils/db'
import { randsToCents } from '~/server/utils/currency'
import { monthSchema } from '~/server/utils/validation'
import { z } from 'zod'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validatedData = monthSchema.parse(body)

    const now = dayjs().unix()

    // Create month
    const month = await prisma.month.create({
      data: {
        monthName: validatedData.monthName,
        year: validatedData.year,
        income: randsToCents(validatedData.income),
        createdAt: now,
        updatedAt: now,
      },
    })

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
