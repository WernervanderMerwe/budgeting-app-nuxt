/** @type {import('tailwindcss').Config} */
module.exports = {
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
