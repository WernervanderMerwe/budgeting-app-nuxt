import { getPrisma } from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

// DELETE /api/yearly/income-sources/[id] - Delete an income source
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid income source ID')
    }

    // Verify ownership through parent budget
    const existing = await prisma.yearlyIncomeSource.findFirst({
      where: {
        id,
        yearlyBudget: { profileToken },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Income source not found')
    }

    await prisma.yearlyIncomeSource.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    return errors.serverError(event, 'Failed to delete income source', error as Error)
  }
})
