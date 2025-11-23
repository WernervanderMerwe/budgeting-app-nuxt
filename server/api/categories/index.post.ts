import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'
import { categorySchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = categorySchema.parse(body)

    const category = await prisma.budgetCategory.create({
      data: {
        monthId: validatedData.monthId,
        name: validatedData.name,
        allocatedAmount: randsToCents(validatedData.allocatedAmount),
        orderIndex: validatedData.orderIndex || 0,
      },
    })

    return {
      ...category,
      allocatedAmount: centsToRands(category.allocatedAmount),
      transactions: [],
    }
  } catch (error) {
    console.error('Error creating category:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create category',
    })
  }
})
