import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    await prisma.fixedPayment.delete({
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
