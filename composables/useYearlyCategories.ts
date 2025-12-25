import type {
  YearlySection,
  YearlyCategory,
  YearlyCategoryEntry,
  YearlySectionWithCategories,
  YearlyCategoryWithChildren,
  UpdateSectionDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  UpdateCategoryEntryDTO,
  CopyMonthDTO,
  SectionType,
} from '~/types/yearly'
import { generateTempId, useOptimisticUpdates } from './useOptimisticUpdates'
import { getWritableYearlyBudget } from './useYearlyBudget'
import { getCurrentTimestamp } from '~/utils/date'
// NOTE: randsToCents not needed here - components convert before calling composable

export function useYearlyCategories() {
  const { currentBudget } = useYearlyBudget()
  const { showErrorToast } = useOptimisticUpdates()

  // Helper to get writable budget state
  const getBudgetState = () => getWritableYearlyBudget()

  // Update a section (optimistic)
  async function updateSection(id: number, dto: UpdateSectionDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        sections: budgetState.value.sections.map(section =>
          section.id === id
            ? { ...section, ...dto, updatedAt: getCurrentTimestamp() }
            : section
        ),
      }
    }

    try {
      const data = await $fetch<YearlySection>(`/api/yearly/sections/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      // Optimistic update already applied - no refresh needed
      return data
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to update section')
      throw e
    }
  }

  // Create a category (optimistic)
  async function createCategory(dto: CreateCategoryDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    const tempId = generateTempId()
    const now = getCurrentTimestamp()
    const optimisticCategory: YearlyCategoryWithChildren = {
      id: tempId,
      sectionId: dto.sectionId,
      parentId: dto.parentId ?? null,
      name: dto.name,
      orderIndex: dto.orderIndex ?? 0,
      createdAt: now,
      updatedAt: now,
      children: [],
      entries: Array.from({ length: 12 }, (_, i) => ({
        id: generateTempId(),
        categoryId: tempId,
        month: i + 1,
        amount: 0,
        isPaid: false,
        createdAt: now,
        updatedAt: now,
      })),
    }

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        sections: budgetState.value.sections.map(section => {
          if (section.id !== dto.sectionId) return section

          if (dto.parentId) {
            // Adding as a child category
            return {
              ...section,
              categories: section.categories.map(cat =>
                cat.id === dto.parentId
                  ? { ...cat, children: [...cat.children, optimisticCategory] }
                  : cat
              ),
            }
          } else {
            // Adding as a top-level category
            return {
              ...section,
              categories: [...section.categories, optimisticCategory],
            }
          }
        }),
      }
    }

    try {
      const data = await $fetch<YearlyCategoryWithChildren>('/api/yearly/categories', {
        method: 'POST',
        body: dto,
      })

      // Replace temp category with real one (don't do full refresh to avoid race conditions)
      if (budgetState.value) {
        budgetState.value = {
          ...budgetState.value,
          sections: budgetState.value.sections.map(section => {
            if (section.id !== dto.sectionId) return section

            if (dto.parentId) {
              // Child category: replace in parent's children array
              return {
                ...section,
                categories: section.categories.map(cat =>
                  cat.id === dto.parentId
                    ? { ...cat, children: cat.children.map(child => child.id === tempId ? data : child) }
                    : cat
                ),
              }
            } else {
              // Top-level category: replace in categories array
              return {
                ...section,
                categories: section.categories.map(cat => cat.id === tempId ? data : cat),
              }
            }
          }),
        }
      }

      return data
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to create category')
      throw e
    }
  }

  // Update a category (optimistic)
  async function updateCategory(id: number, dto: UpdateCategoryDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        sections: budgetState.value.sections.map(section => ({
          ...section,
          categories: section.categories.map(cat => {
            if (cat.id === id) {
              return { ...cat, ...dto, updatedAt: getCurrentTimestamp() }
            }
            // Check children
            return {
              ...cat,
              children: cat.children.map(child =>
                child.id === id
                  ? { ...child, ...dto, updatedAt: getCurrentTimestamp() }
                  : child
              ),
            }
          }),
        })),
      }
    }

    try {
      const data = await $fetch<YearlyCategory>(`/api/yearly/categories/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      // Optimistic update already applied - no refresh needed
      return data
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to update category')
      throw e
    }
  }

  // Delete a category (optimistic)
  async function deleteCategory(id: number) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic delete
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        sections: budgetState.value.sections.map(section => ({
          ...section,
          categories: section.categories
            .filter(cat => cat.id !== id)
            .map(cat => ({
              ...cat,
              children: cat.children.filter(child => child.id !== id),
            })),
        })),
      }
    }

    try {
      await $fetch(`/api/yearly/categories/${id}`, { method: 'DELETE' })
      return true
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to delete category')
      throw e
    }
  }

  // Update a category entry (amount or isPaid) - optimistic
  // NOTE: Component already converts RANDS→CENTS before calling, so we use dto directly
  async function updateCategoryEntry(id: number, dto: UpdateCategoryEntryDTO) {
    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        sections: budgetState.value.sections.map(section => ({
          ...section,
          categories: section.categories.map(cat => ({
            ...cat,
            entries: cat.entries.map(entry =>
              entry.id === id
                ? { ...entry, ...dto, updatedAt: getCurrentTimestamp() }
                : entry
            ),
            children: cat.children.map(child => ({
              ...child,
              entries: child.entries.map(entry =>
                entry.id === id
                  ? { ...entry, ...dto, updatedAt: getCurrentTimestamp() }
                  : entry
              ),
            })),
          })),
        })),
      }
    }

    try {
      const data = await $fetch<YearlyCategoryEntry>(`/api/yearly/category-entries/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      // Optimistic update already applied - no refresh needed
      return data
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to update category entry')
      throw e
    }
  }

  // Toggle paid status for a category entry
  async function togglePaid(entryId: number, isPaid: boolean) {
    return updateCategoryEntry(entryId, { isPaid })
  }

  // Check/uncheck all children of a category for a specific month
  async function checkAllChildrenForCategory(categoryId: number, month: number, isPaid: boolean) {
    // Find the category and its children
    for (const section of sections.value) {
      const category = section.categories.find(c => c.id === categoryId)
      if (category && category.children.length > 0) {
        // Update all children's entries for this month
        const updatePromises = category.children.map(child => {
          const entry = child.entries.find(e => e.month === month)
          if (entry) {
            return updateCategoryEntry(entry.id, { isPaid })
          }
          return Promise.resolve()
        })
        await Promise.all(updatePromises)
        // Each update applies optimistic changes - no refresh needed
        return
      }
    }
  }

  // Check/uncheck all categories in a section for a specific month
  async function checkAllCategoriesForSection(sectionId: number, month: number, isPaid: boolean) {
    const section = sections.value.find(s => s.id === sectionId)
    if (!section) return

    // Collect all leaf category entries (categories without children, or children of parent categories)
    const updatePromises: Promise<any>[] = []

    for (const category of section.categories) {
      if (category.children && category.children.length > 0) {
        // Parent category: update all children entries
        for (const child of category.children) {
          const entry = child.entries.find(e => e.month === month)
          if (entry) {
            updatePromises.push(updateCategoryEntry(entry.id, { isPaid }))
          }
        }
      } else {
        // Leaf category: update its own entry
        const entry = category.entries.find(e => e.month === month)
        if (entry) {
          updatePromises.push(updateCategoryEntry(entry.id, { isPaid }))
        }
      }
    }

    await Promise.all(updatePromises)
    // Each update applies optimistic changes - no refresh needed
  }

  // Copy category amounts from one month to another (optimistic)
  async function copyFromMonth(dto: CopyMonthDTO) {
    if (!currentBudget.value) return null

    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    const { sourceMonth, targetMonth, resetPaidStatus } = dto
    const now = getCurrentTimestamp()

    // Apply optimistic update
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        // Copy category entries
        sections: budgetState.value.sections.map(section => ({
          ...section,
          categories: section.categories.map(cat => ({
            ...cat,
            entries: cat.entries.map(entry => {
              if (entry.month === targetMonth) {
                const sourceEntry = cat.entries.find(e => e.month === sourceMonth)
                return {
                  ...entry,
                  amount: sourceEntry?.amount ?? entry.amount,
                  isPaid: resetPaidStatus ? false : entry.isPaid,
                  updatedAt: now,
                }
              }
              return entry
            }),
            children: cat.children.map(child => ({
              ...child,
              entries: child.entries.map(entry => {
                if (entry.month === targetMonth) {
                  const sourceEntry = child.entries.find(e => e.month === sourceMonth)
                  return {
                    ...entry,
                    amount: sourceEntry?.amount ?? entry.amount,
                    isPaid: resetPaidStatus ? false : entry.isPaid,
                    updatedAt: now,
                  }
                }
                return entry
              }),
            })),
          })),
        })),
        // Copy income entries and their deductions
        incomeSources: budgetState.value.incomeSources?.map(source => ({
          ...source,
          entries: source.entries.map(entry => {
            if (entry.month === targetMonth) {
              const sourceEntry = source.entries.find(e => e.month === sourceMonth)
              return {
                ...entry,
                grossAmount: sourceEntry?.grossAmount ?? entry.grossAmount,
                updatedAt: now,
                // Copy deductions from source month
                deductions: entry.deductions.map(deduction => {
                  const sourceDeduction = sourceEntry?.deductions?.find(
                    d => d.name === deduction.name
                  )
                  return {
                    ...deduction,
                    amount: sourceDeduction?.amount ?? deduction.amount,
                    updatedAt: now,
                  }
                }),
              }
            }
            return entry
          }),
        })) ?? [],
      }
    }

    try {
      const result = await $fetch(`/api/yearly/${currentBudget.value.id}/copy-month`, {
        method: 'POST',
        body: dto,
      })
      // Optimistic update already applied - no refresh needed
      return result
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to copy month')
      throw e
    }
  }

  // Clear all values for a month (optimistic)
  async function clearMonth(dto: { month: number; resetPaidStatus: boolean }) {
    if (!currentBudget.value) return null

    const budgetState = getBudgetState()
    const previousBudget = budgetState.value
      ? JSON.parse(JSON.stringify(budgetState.value))
      : null

    const { month, resetPaidStatus } = dto
    const now = getCurrentTimestamp()

    // Apply optimistic update - set all amounts to 0
    if (budgetState.value) {
      budgetState.value = {
        ...budgetState.value,
        // Clear category entries
        sections: budgetState.value.sections.map(section => ({
          ...section,
          categories: section.categories.map(cat => ({
            ...cat,
            entries: cat.entries.map(entry => {
              if (entry.month === month) {
                return {
                  ...entry,
                  amount: 0,
                  isPaid: resetPaidStatus ? false : entry.isPaid,
                  updatedAt: now,
                }
              }
              return entry
            }),
            children: cat.children.map(child => ({
              ...child,
              entries: child.entries.map(entry => {
                if (entry.month === month) {
                  return {
                    ...entry,
                    amount: 0,
                    isPaid: resetPaidStatus ? false : entry.isPaid,
                    updatedAt: now,
                  }
                }
                return entry
              }),
            })),
          })),
        })),
        // Clear income entries and their deductions
        incomeSources: budgetState.value.incomeSources?.map(source => ({
          ...source,
          entries: source.entries.map(entry => {
            if (entry.month === month) {
              return {
                ...entry,
                grossAmount: 0,
                updatedAt: now,
                deductions: entry.deductions.map(deduction => ({
                  ...deduction,
                  amount: 0,
                  updatedAt: now,
                })),
              }
            }
            return entry
          }),
        })) ?? [],
      }
    }

    try {
      const result = await $fetch(`/api/yearly/${currentBudget.value.id}/clear-month`, {
        method: 'POST',
        body: dto,
      })
      return result
    } catch (e: any) {
      if (previousBudget) {
        budgetState.value = previousBudget
      }
      showErrorToast(e.message || 'Failed to clear month')
      throw e
    }
  }

  // Computed: All sections from current budget
  const sections = computed(() => {
    return [...(currentBudget.value?.sections ?? [])] as YearlySectionWithCategories[]
  })

  // Get section by type
  function getSectionByType(type: SectionType): YearlySectionWithCategories | undefined {
    return sections.value.find(s => s.type === type)
  }

  // Get all categories for a section (flat list including children)
  function getCategoriesForSection(sectionId: number): YearlyCategoryWithChildren[] {
    const section = sections.value.find(s => s.id === sectionId)
    return section?.categories.filter(c => !c.parentId) ?? []
  }

  // Get category entry for a category and month
  function getCategoryEntry(categoryId: number, month: number): YearlyCategoryEntry | undefined {
    for (const section of sections.value) {
      for (const category of section.categories) {
        if (category.id === categoryId) {
          return category.entries.find(e => e.month === month)
        }
        // Check children
        for (const child of category.children) {
          if (child.id === categoryId) {
            return child.entries.find(e => e.month === month)
          }
        }
      }
    }
    return undefined
  }

  // Get total amount for a section and month
  function getSectionTotalForMonth(sectionId: number, month: number): number {
    const section = sections.value.find(s => s.id === sectionId)
    if (!section) return 0

    let total = 0
    for (const category of section.categories) {
      // Only count parent-level categories
      if (!category.parentId) {
        if (category.children && category.children.length > 0) {
          // Parent with children: only count children's amounts (parent's entry is ignored)
          for (const child of category.children) {
            const childEntry = child.entries.find(e => e.month === month)
            if (childEntry) total += childEntry.amount
          }
        } else {
          // Leaf category (no children): count its own amount
          const entry = category.entries.find(e => e.month === month)
          if (entry) total += entry.amount
        }
      }
    }
    return total
  }

  // Get total amount for all sections for a month
  function getTotalExpensesForMonth(month: number): number {
    return sections.value.reduce((sum, section) => {
      return sum + getSectionTotalForMonth(section.id, month)
    }, 0)
  }

  // Computed: Section totals by month
  const sectionTotalsByMonth = computed(() => {
    return sections.value.map(section => ({
      sectionId: section.id,
      sectionType: section.type as SectionType,
      sectionName: section.name,
      targetPercent: section.targetPercent,
      monthlyTotals: Array.from({ length: 12 }, (_, i) => {
        const month = i + 1
        return {
          month,
          total: getSectionTotalForMonth(section.id, month),
        }
      }),
    }))
  })

  return {
    // State
    sections,
    sectionTotalsByMonth,

    // Actions
    updateSection,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoryEntry,
    togglePaid,
    copyFromMonth,
    clearMonth,
    checkAllChildrenForCategory,
    checkAllCategoriesForSection,

    // Helpers
    getSectionByType,
    getCategoriesForSection,
    getCategoryEntry,
    getSectionTotalForMonth,
    getTotalExpensesForMonth,
  }
}
