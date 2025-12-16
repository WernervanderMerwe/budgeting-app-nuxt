import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    // Verify ownership
    const existing = await prisma.transactionMonth.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Month not found',
      })
    }

    await prisma.transactionMonth.delete({
      where: { id },
    })

    return { success: true }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error deleting month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete month',
    })
  }
})
