import prisma from '~/server/utils/db'

// DELETE /api/yearly/income-sources/[id] - Delete an income source
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid income source ID',
      })
    }

    // Verify ownership through parent budget
    const existing = await prisma.yearlyIncomeSource.findFirst({
      where: {
        id,
        yearlyBudget: { profileToken },
      },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Income source not found',
      })
    }

    await prisma.yearlyIncomeSource.delete({
      where: { id },
    })

    return { success: true }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error deleting income source:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete income source',
    })
  }
})
