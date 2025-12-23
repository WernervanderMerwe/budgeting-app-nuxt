import { getPrisma } from '~/server/utils/db'
import { randsToCents } from '~/server/utils/currency'
import { getCurrentTimestamp } from '~/server/utils/date'
import { errors } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  try {
    const { profileToken } = event.context
    const prisma = getPrisma(event)
    const id = parseInt(getRouterParam(event, 'id')!)
    const body = await readBody(event)

    if (isNaN(id)) {
      return errors.badRequest(event, 'Invalid month ID')
    }

    // Verify ownership
    const existing = await prisma.transactionMonth.findFirst({
      where: { id, profileToken },
    })

    if (!existing) {
      return errors.notFound(event, 'Month not found')
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.year !== undefined) updateData.year = body.year
    if (body.month !== undefined) updateData.month = body.month
    if (body.income !== undefined) updateData.income = randsToCents(body.income)

    const month = await prisma.transactionMonth.update({
      where: { id },
      data: updateData,
    })

    return month
  } catch (error) {
    return errors.serverError(event, 'Failed to update month', error as Error)
  }
})
