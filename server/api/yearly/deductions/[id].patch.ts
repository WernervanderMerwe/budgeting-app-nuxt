import { getPrisma } from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// PATCH /api/yearly/deductions/[id] - Update a deduction
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid deduction ID')
    }

    // Verify ownership through parent chain
    const existing = await prisma.yearlyDeduction.findFirst({
      where: {
        id,
        incomeEntry: {
          incomeSource: {
            yearlyBudget: { profileToken },
          },
        },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Deduction not found')
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const deduction = await prisma.yearlyDeduction.update({
      where: { id },
      data: updateData,
    })

    return deduction
  } catch (error) {
    return errors.serverError(event, 'Failed to update deduction', error as Error)
  }
})
