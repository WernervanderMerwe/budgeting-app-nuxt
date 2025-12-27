import { getPrisma } from '~/server/utils/db'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

// POST /api/yearly/deductions - Create a new deduction
export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const body = await readBody(event)
    const { incomeEntryId, name, amount = 0, orderIndex = 0 } = body

    if (!incomeEntryId || !name) {
      return errors.badRequest(event, 'incomeEntryId and name are required')
    }

    // Verify ownership through parent chain
    const incomeEntry = await prisma.yearlyIncomeEntry.findFirst({
      where: {
        id: incomeEntryId,
        incomeSource: {
          yearlyBudget: { profileToken },
        },
      },
    })

    if (!incomeEntry) {
      return errors.notFound(event, 'Income entry not found')
    }

    const now = getCurrentTimestamp()

    const deduction = await prisma.yearlyDeduction.create({
      data: {
        incomeEntryId,
        name,
        amount,
        orderIndex,
        createdAt: now,
        updatedAt: now,
      },
    })

    setResponseStatus(event, 201)
    return deduction
  } catch (error) {
    return errors.serverError(event, 'Failed to create deduction', error as Error)
  }
})
