import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    await prisma.month.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    if (error.statusCode) throw error

    console.error('Error deleting month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete month',
    })
  }
})
