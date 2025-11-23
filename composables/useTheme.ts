// Composable for managing dark mode theme
import type { ThemeMode } from '~/types/budget'

export const useTheme = () => {
  // State - persisted in localStorage
  const theme = useState<ThemeMode>('theme', () => 'light')
  const isInitialized = useState<boolean>('themeInitialized', () => false)

  // Computed
  const isDark = computed(() => theme.value === 'dark')

  /**
   * Initialize theme from localStorage or system preference
   */
  const initTheme = (): void => {
    if (isInitialized.value) return

    if (process.client) {
      // Check localStorage first
      const stored = localStorage.getItem('theme') as ThemeMode | null

      if (stored && (stored === 'light' || stored === 'dark')) {
        theme.value = stored
      } else {
        // Fall back to system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        theme.value = prefersDark ? 'dark' : 'light'
      }

      // Apply theme to document
      applyTheme(theme.value)
      isInitialized.value = true
    }
  }

  /**
   * Apply theme to document element
   */
  const applyTheme = (mode: ThemeMode): void => {
    if (process.client) {
      const html = document.documentElement

      if (mode === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }
  }

  /**
   * Set theme mode
   */
  const setTheme = (mode: ThemeMode): void => {
    theme.value = mode

    if (process.client) {
      localStorage.setItem('theme', mode)
      applyTheme(mode)
    }
  }

  /**
   * Toggle between light and dark mode
   */
  const toggleTheme = (): void => {
    const newTheme: ThemeMode = theme.value === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  /**
   * Set to light mode
   */
  const setLight = (): void => {
    setTheme('light')
  }

  /**
   * Set to dark mode
   */
  const setDark = (): void => {
    setTheme('dark')
  }

  // Auto-initialize on composable creation (client-side only)
  if (process.client && !isInitialized.value) {
    initTheme()
  }

  return {
    // State
    theme: readonly(theme),
    isDark,

    // Methods
    initTheme,
    setTheme,
    toggleTheme,
    setLight,
    setDark
  }
}
