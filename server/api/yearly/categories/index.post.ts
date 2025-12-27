import { getPrisma } from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// POST /api/yearly/categories - Create a new category with 12 month entries
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const body = await readBody(event)
    const { sectionId, name, parentId = null, orderIndex = 0 } = body

    if (!sectionId || !name) {
      return errors.badRequest(event, 'sectionId and name are required')
    }

    // Verify ownership through parent section -> budget
    const section = await prisma.yearlySection.findFirst({
      where: {
        id: sectionId,
        yearlyBudget: { profileToken },
      },
    })

    if (!section) {
      return errors.notFound(event, 'Section not found')
    }

    const now = getCurrentTimestamp()

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

    setResponseStatus(event, 201)
    return category
  } catch (error) {
    return errors.serverError(event, 'Failed to create category', error as Error)
  }
})
