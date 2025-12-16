import prisma from '~/server/utils/db'

// DELETE /api/yearly/[id] - Delete a yearly budget
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid yearly budget ID',
      })
    }

    // Verify ownership before delete
    const existing = await prisma.yearlyBudget.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Yearly budget not found',
      })
    }

    await prisma.yearlyBudget.delete({
      where: { id },
    })

    return { success: true }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error deleting yearly budget:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete yearly budget',
    })
  }
})
