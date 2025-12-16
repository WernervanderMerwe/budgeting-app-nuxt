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

export function useYearlyCategories() {
  const { currentBudget, fetchBudgetById, refreshBudgetSilently } = useYearlyBudget()

  // Update a section (silent refresh - small update)
  async function updateSection(id: number, dto: UpdateSectionDTO) {
    try {
      const data = await $fetch<YearlySection>(`/api/yearly/sections/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      await refreshBudgetSilently()
      return data
    } catch (e: any) {
      console.error('Error updating section:', e)
      throw e
    }
  }

  // Create a category (silent refresh - single operation)
  async function createCategory(dto: CreateCategoryDTO) {
    try {
      const data = await $fetch<YearlyCategoryWithChildren>('/api/yearly/categories', {
        method: 'POST',
        body: dto,
      })
      await refreshBudgetSilently()
      return data
    } catch (e: any) {
      console.error('Error creating category:', e)
      throw e
    }
  }

  // Update a category (silent refresh - small update)
  async function updateCategory(id: number, dto: UpdateCategoryDTO) {
    try {
      const data = await $fetch<YearlyCategory>(`/api/yearly/categories/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      await refreshBudgetSilently()
      return data
    } catch (e: any) {
      console.error('Error updating category:', e)
      throw e
    }
  }

  // Delete a category (silent refresh - single operation)
  async function deleteCategory(id: number) {
    try {
      await $fetch(`/api/yearly/categories/${id}`, { method: 'DELETE' })
      await refreshBudgetSilently()
      return true
    } catch (e: any) {
      console.error('Error deleting category:', e)
      throw e
    }
  }

  // Update a category entry (amount or isPaid) - silent refresh for instant feel
  // Set skipRefresh=true when doing batch updates to avoid multiple refreshes
  async function updateCategoryEntry(id: number, dto: UpdateCategoryEntryDTO, skipRefresh = false) {
    try {
      const data = await $fetch<YearlyCategoryEntry>(`/api/yearly/category-entries/${id}`, {
        method: 'PATCH',
        body: dto,
      })
      if (!skipRefresh) {
        await refreshBudgetSilently()
      }
      return data
    } catch (e: any) {
      console.error('Error updating category entry:', e)
      throw e
    }
  }

  // Toggle paid status for a category entry
  async function togglePaid(entryId: number, isPaid: boolean) {
    return updateCategoryEntry(entryId, { isPaid })
  }

  // Check/uncheck all children of a category for a specific month
  // Uses skipRefresh to avoid multiple refreshes, then refreshes once at the end
  async function checkAllChildrenForCategory(categoryId: number, month: number, isPaid: boolean) {
    // Find the category and its children
    for (const section of sections.value) {
      const category = section.categories.find(c => c.id === categoryId)
      if (category && category.children.length > 0) {
        // Update all children's entries for this month (skip individual refreshes)
        const updatePromises = category.children.map(child => {
          const entry = child.entries.find(e => e.month === month)
          if (entry) {
            return updateCategoryEntry(entry.id, { isPaid }, true)
          }
          return Promise.resolve()
        })
        await Promise.all(updatePromises)
        // Single refresh after all updates complete
        await refreshBudgetSilently()
        return
      }
    }
  }

  // Check/uncheck all categories in a section for a specific month
  // Uses skipRefresh to avoid multiple refreshes, then refreshes once at the end
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
            updatePromises.push(updateCategoryEntry(entry.id, { isPaid }, true))
          }
        }
      } else {
        // Leaf category: update its own entry
        const entry = category.entries.find(e => e.month === month)
        if (entry) {
          updatePromises.push(updateCategoryEntry(entry.id, { isPaid }, true))
        }
      }
    }

    await Promise.all(updatePromises)
    // Single refresh after all updates complete
    await refreshBudgetSilently()
  }

  // Copy category amounts from one month to another
  // Uses full loading state since this is a larger operation affecting multiple entries
  async function copyFromMonth(dto: CopyMonthDTO) {
    if (!currentBudget.value) return null
    try {
      const result = await $fetch(`/api/yearly/${currentBudget.value.id}/copy-month`, {
        method: 'POST',
        body: dto,
      })
      // Use regular fetch with loading state (not silent) for large operations
      await fetchBudgetById(currentBudget.value.id, false)
      return result
    } catch (e: any) {
      console.error('Error copying month:', e)
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
        const entry = category.entries.find(e => e.month === month)
        if (entry) total += entry.amount

        // Add children amounts
        for (const child of category.children) {
          const childEntry = child.entries.find(e => e.month === month)
          if (childEntry) total += childEntry.amount
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
