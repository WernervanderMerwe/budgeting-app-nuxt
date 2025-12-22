import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// PATCH /api/yearly/category-entries/[id] - Update a category entry (amount or isPaid)
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid category entry ID')
    }

    // Verify ownership through parent chain
    const existing = await prisma.yearlyCategoryEntry.findFirst({
      where: {
        id,
        category: {
          section: {
            yearlyBudget: { profileToken },
          },
        },
      },
    })

    if (!existing) {
      return errors.notFound(event, 'Category entry not found')
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.isPaid !== undefined) updateData.isPaid = body.isPaid

    const entry = await prisma.yearlyCategoryEntry.update({
      where: { id },
      data: updateData,
    })

    return entry
  } catch (error) {
    return errors.serverError(event, 'Failed to update category entry', error as Error)
  }
})
