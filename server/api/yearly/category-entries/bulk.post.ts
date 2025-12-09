import prisma from '~/server/utils/db'
import dayjs from 'dayjs'

// POST /api/yearly/category-entries/bulk - Bulk update category entries
// Used for copying amounts from one month to another
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { updates } = body

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'updates array is required',
      })
    }

    const now = dayjs().unix()

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
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error bulk updating category entries:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to bulk update category entries',
    })
  }
})
