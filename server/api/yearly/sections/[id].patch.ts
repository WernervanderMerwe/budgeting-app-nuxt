import { getPrisma } from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// PATCH /api/yearly/sections/[id] - Update a section
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid section ID')
    }

    // Verify ownership through parent budget
    const existing = await prisma.yearlySection.findFirst({
      where: {
        id,
        yearlyBudget: { profileToken },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Section not found')
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.targetPercent !== undefined) updateData.targetPercent = body.targetPercent
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const section = await prisma.yearlySection.update({
      where: { id },
      data: updateData,
    })

    return section
  } catch (error) {
    return errors.serverError(event, 'Failed to update section', error as Error)
  }
})
