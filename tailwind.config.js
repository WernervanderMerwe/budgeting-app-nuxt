/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  darkMode: 'class', // Enable class-based dark mode

  theme: {
    extend: {
      colors: {
        // Custom colors for budget status
        'budget-green': '#28a745',
        'budget-red': '#dc3545',
        'budget-blue': '#007bff',
      },
    },
  },

  plugins: [],
}
