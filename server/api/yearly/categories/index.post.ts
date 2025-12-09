import prisma from '~/server/utils/db'
import dayjs from 'dayjs'

// POST /api/yearly/categories - Create a new category with 12 month entries
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { sectionId, name, parentId = null, orderIndex = 0 } = body

    if (!sectionId || !name) {
      throw createError({
        statusCode: 400,
        message: 'sectionId and name are required',
      })
    }

    const now = dayjs().unix()

    // Create category with 12 month entries (one for each month)
    const category = await prisma.yearlyCategory.create({
      data: {
        sectionId,
        name,
        parentId,
        orderIndex,
        createdAt: now,
        updatedAt: now,
        entries: {
          create: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1, // 1-12
            amount: 0,
            isPaid: false,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
      include: {
        entries: {
          orderBy: { month: 'asc' },
        },
        children: {
          orderBy: { orderIndex: 'asc' },
          include: {
            entries: {
              orderBy: { month: 'asc' },
            },
          },
        },
      },
    })

    return category
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error creating category:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create category',
    })
  }
})
