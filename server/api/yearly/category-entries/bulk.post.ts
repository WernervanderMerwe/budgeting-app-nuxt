import { getPrisma } from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// POST /api/yearly/category-entries/bulk - Bulk update category entries
// Used for copying amounts from one month to another
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const body = await readBody(event)
    const { updates } = body

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return errors.badRequest(event, 'updates array is required')
    }

    // Verify ownership of all entries before updating
    const entryIds = updates.map((u: { id: number }) => u.id)
    const ownedEntries = await prisma.yearlyCategoryEntry.findMany({
      where: {
        id: { in: entryIds },
        category: {
          section: {
            yearlyBudget: { profileToken },
          },
        },
      },
      select: { id: true },
    })

    const ownedIds = new Set(ownedEntries.map(e => e.id))
    const unauthorizedIds = entryIds.filter((id: number) => !ownedIds.has(id))

    if (unauthorizedIds.length > 0) {
      return errors.notFound(event, 'One or more category entries not found')
    }

    const now = getCurrentTimestamp()

    // Process all updates in a transaction
    const results = await prisma.$transaction(
      updates.map((update: { id: number; amount?: number; isPaid?: boolean }) => {
        const updateData: any = { updatedAt: now }
        if (update.amount !== undefined) updateData.amount = update.amount
        if (update.isPaid !== undefined) updateData.isPaid = update.isPaid

        return prisma.yearlyCategoryEntry.update({
          where: { id: update.id },
          data: updateData,
        })
      })
    )

    return { success: true, updated: results.length }
  } catch (error) {
    return errors.serverError(event, 'Failed to bulk update category entries', error as Error)
  }
})
