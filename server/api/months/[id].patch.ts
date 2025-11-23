import prisma from '~/server/utils/db'
import { randsToCents, centsToRands } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid month ID',
      })
    }

    const updateData: any = {}

    if (body.monthName !== undefined) updateData.monthName = body.monthName
    if (body.year !== undefined) updateData.year = body.year
    if (body.income !== undefined) updateData.income = randsToCents(body.income)

    const month = await prisma.month.update({
      where: { id },
      data: updateData,
    })

    return {
      ...month,
      income: centsToRands(month.income),
    }
  } catch (error) {
    if (error.statusCode) throw error

    console.error('Error updating month:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update month',
    })
  }
})
