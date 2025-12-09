import prisma from '~/server/utils/db'
import dayjs from 'dayjs'

// POST /api/yearly/[id]/copy-month - Copy category amounts from one month to another
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)
    const { sourceMonth, targetMonth, resetPaidStatus = true } = body

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid budget ID',
      })
    }

    if (!sourceMonth || !targetMonth) {
      throw createError({
        statusCode: 400,
        message: 'sourceMonth and targetMonth are required',
      })
    }

    if (sourceMonth < 1 || sourceMonth > 12 || targetMonth < 1 || targetMonth > 12) {
      throw createError({
        statusCode: 400,
        message: 'Month values must be between 1 and 12',
      })
    }

    if (sourceMonth === targetMonth) {
      throw createError({
        statusCode: 400,
        message: 'Source and target months cannot be the same',
      })
    }

    // Get the budget with all categories
    const budget = await prisma.yearlyBudget.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            categories: {
              include: {
                entries: true,
                children: {
                  include: {
                    entries: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!budget) {
      throw createError({
        statusCode: 404,
        message: 'Budget not found',
      })
    }

    const now = dayjs().unix()
    const updates: { id: number; amount: number; isPaid?: boolean }[] = []

    // Collect all category entries to update
    for (const section of budget.sections) {
      for (const category of section.categories) {
        const sourceEntry = category.entries.find(e => e.month === sourceMonth)
        const targetEntry = category.entries.find(e => e.month === targetMonth)

        if (sourceEntry && targetEntry) {
          updates.push({
            id: targetEntry.id,
            amount: sourceEntry.amount,
            ...(resetPaidStatus ? { isPaid: false } : {}),
          })
        }

        // Also copy children entries
        for (const child of category.children) {
          const childSourceEntry = child.entries.find(e => e.month === sourceMonth)
          const childTargetEntry = child.entries.find(e => e.month === targetMonth)

          if (childSourceEntry && childTargetEntry) {
            updates.push({
              id: childTargetEntry.id,
              amount: childSourceEntry.amount,
              ...(resetPaidStatus ? { isPaid: false } : {}),
            })
          }
        }
      }
    }

    // Apply all updates in a transaction
    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map(update =>
          prisma.yearlyCategoryEntry.update({
            where: { id: update.id },
            data: {
              amount: update.amount,
              ...(update.isPaid !== undefined ? { isPaid: update.isPaid } : {}),
              updatedAt: now,
            },
          })
        )
      )
    }

    return {
      success: true,
      copiedEntries: updates.length,
      sourceMonth,
      targetMonth,
      resetPaidStatus,
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error copying month data:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to copy month data',
    })
  }
})
