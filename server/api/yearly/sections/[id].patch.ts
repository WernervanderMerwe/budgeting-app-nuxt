import prisma from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'

// PATCH /api/yearly/sections/[id] - Update a section
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid section ID',
      })
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.targetPercent !== undefined) updateData.targetPercent = body.targetPercent
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex

    const section = await prisma.yearlySection.update({
      where: { id },
      data: updateData,
    })

    return section
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating section:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update section',
    })
  }
})
