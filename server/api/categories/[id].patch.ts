import { z } from 'zod'
import { getPrisma } from '~~/server/utils/db'
import { randsToCents } from '~~/server/utils/currency'
import { getCurrentTimestamp } from '~~/server/utils/date'
import { errors } from '~~/server/utils/errors'
import { categoryPatchSchema } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)
    const validated = categoryPatchSchema.parse(body)

    // Verify ownership through parent month
    const existing = await prisma.transactionCategory.findFirst({
      where: {
        id,
        month: { profileToken },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Category not found')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma update payload built conditionally from optional body fields
    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.allocatedAmount !== undefined) {
      updateData.allocatedAmount = randsToCents(validated.allocatedAmount)
    }
    if (validated.orderIndex !== undefined) updateData.orderIndex = validated.orderIndex
    if (validated.expenseCategory !== undefined) updateData.expenseCategory = validated.expenseCategory

    const category = await prisma.transactionCategory.update({
      where: { id },
      data: updateData,
    })

    // Return as-is (values in cents) to match GET endpoint
    return category
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validationError(event, error)
    }
    return errors.serverError(event, 'Failed to update category', error as Error)
  }
})
