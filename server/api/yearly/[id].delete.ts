import { getPrisma } from '~/server/utils/db'
import { errors } from '~/server/utils/errors'

// DELETE /api/yearly/[id] - Delete a yearly budget
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid yearly budget ID')
    }

    // Verify ownership before delete
    const existing = await prisma.yearlyBudget.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      return errors.notFound(event, 'Yearly budget not found')
    }

    await prisma.yearlyBudget.delete({
      where: { id },
    })

    return { success: true }
  } catch (error: any) {
    return errors.serverError(event, 'Failed to delete yearly budget', error)
  }
})
