import type { InjectionKey, Ref } from 'vue'

export const COLUMN_WIDTH_KEY: InjectionKey<Ref<number>> = Symbol('columnWidth')

export function useColumnResize() {
  const STORAGE_KEY = 'yearly-category-column-width'
  const DEFAULT_WIDTH = 200
  const MIN_WIDTH = 120
  const MAX_WIDTH = 400

  const columnWidth = ref(DEFAULT_WIDTH)
  const isResizing = ref(false)

  // Load from localStorage on init
  function loadWidth() {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          columnWidth.value = parsed
        }
      }
    }
  }

  // Save to localStorage
  function saveWidth(width: number) {
    if (import.meta.client) {
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
      columnWidth.value = clampedWidth
      localStorage.setItem(STORAGE_KEY, clampedWidth.toString())
    }
  }

  // Set width without saving (during drag)
  function setWidth(width: number) {
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
    columnWidth.value = clampedWidth
  }

  // Reset to default
  function resetWidth() {
    columnWidth.value = DEFAULT_WIDTH
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Start resize
  function startResize(event: MouseEvent) {
    isResizing.value = true
    const startX = event.clientX
    const startWidth = columnWidth.value

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      setWidth(startWidth + delta)
    }

    const onMouseUp = () => {
      isResizing.value = false
      saveWidth(columnWidth.value)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // Initialize on client
  if (import.meta.client) {
    loadWidth()
  }

  return {
    columnWidth,
    isResizing: readonly(isResizing),
    saveWidth,
    setWidth,
    resetWidth,
    startResize,
    MIN_WIDTH,
    MAX_WIDTH,
    DEFAULT_WIDTH,
  }
}

// Composable for child components to consume the column width
export function useColumnWidth() {
  const columnWidth = inject(COLUMN_WIDTH_KEY, ref(200))
  return { columnWidth }
}
