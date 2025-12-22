import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// PATCH /api/yearly/income-entries/[id] - Update an income entry (gross amount)
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid income entry ID')
    }

    // Verify ownership through parent chain
    const existing = await prisma.yearlyIncomeEntry.findFirst({
      where: {
        id,
        incomeSource: {
          yearlyBudget: { profileToken },
        },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Income entry not found')
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.grossAmount !== undefined) updateData.grossAmount = body.grossAmount

    const incomeEntry = await prisma.yearlyIncomeEntry.update({
      where: { id },
      data: updateData,
      include: {
        deductions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    return incomeEntry
  } catch (error) {
    return errors.serverError(event, 'Failed to update income entry', error as Error)
  }
})
