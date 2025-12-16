import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    // Verify ownership through parent month
    const existing = await prisma.transactionFixedPayment.findFirst({
      where: {
        id,
        month: { profileToken },
      },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Fixed payment not found',
      })
    }

    await prisma.transactionFixedPayment.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting fixed payment:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete fixed payment',
    })
  }
})
