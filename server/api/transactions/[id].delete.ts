import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

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
