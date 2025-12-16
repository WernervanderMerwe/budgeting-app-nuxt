import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const id = parseInt(getRouterParam(event, 'id')!)

    // Verify ownership through parent chain: category -> month
    const existing = await prisma.transactionEntry.findFirst({
      where: {
        id,
        category: {
          month: { profileToken },
        },
      },
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    await prisma.transactionEntry.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete transaction',
    })
  }
})
