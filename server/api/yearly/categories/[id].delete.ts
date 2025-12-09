import prisma from '~/server/utils/db'

// DELETE /api/yearly/categories/[id] - Delete a category
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid category ID',
      })
    }

    await prisma.yearlyCategory.delete({
      where: { id },
    })

    return { success: true }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error deleting category:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete category',
    })
  }
})
