import { getPrisma } from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

// DELETE /api/yearly/deductions/[id] - Delete a deduction
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)

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

    await prisma.yearlyDeduction.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    return errors.serverError(event, 'Failed to delete deduction', error as Error)
  }
})
