import { getPrisma } from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// PATCH /api/yearly/income-sources/[id] - Update an income source
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

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

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const incomeSource = await prisma.yearlyIncomeSource.update({
      where: { id },
      data: updateData,
    })

    return incomeSource
  } catch (error) {
    return errors.serverError(event, 'Failed to update income source', error as Error)
  }
})
