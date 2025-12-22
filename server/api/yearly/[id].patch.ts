import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// PATCH /api/yearly/[id] - Update yearly budget settings
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid yearly budget ID')
    }

    // Verify ownership before update
    const existing = await prisma.yearlyBudget.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      return errors.notFound(event, 'Yearly budget not found')
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.spendTarget !== undefined) updateData.spendTarget = body.spendTarget
    if (body.showWarnings !== undefined) updateData.showWarnings = body.showWarnings

    const yearlyBudget = await prisma.yearlyBudget.update({
      where: { id },
      data: updateData,
    })

    return yearlyBudget
  } catch (error: any) {
    return errors.serverError(event, 'Failed to update yearly budget', error)
  }
})
