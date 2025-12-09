import prisma from '~/server/utils/db'

// DELETE /api/yearly/deductions/[id] - Delete a deduction
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid deduction ID',
      })
    }

    await prisma.yearlyDeduction.delete({
      where: { id },
    })

    return { success: true }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error deleting deduction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete deduction',
    })
  }
})
