/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light mode - Google Drive colors
        'gdrive-blue': '#1a73e8',
        'gdrive-hover': '#1557b0',
        'gdrive-sidebar': '#f8fafd',
        'gdrive-border': '#dadce0',

        // Dark mode - Google Drive dark theme colors (exact)
        'dark': {
          'bg': '#1f1f1f',           // Main background
          'surface': '#2d2d2d',      // Cards, elevated surfaces
          'elevated': '#353535',     // Higher elevation
          'hover': '#3c4043',        // Hover states
          'active': '#4a4e51',       // Active/pressed states
          'border': '#5f6368',       // Borders
          'divider': '#3c4043',      // Dividers
          'text': '#e8eaed',         // Primary text
          'text-secondary': '#bdc1c6', // Secondary text (brighter for better readability)
          'text-disabled': '#5f6368', // Disabled text
          'blue': '#8ab4f8',         // Blue accent (lighter for dark)
          'blue-hover': '#aecbfa',   // Blue hover
          'selected': '#394457',     // Selected item background
          'selected-hover': '#44526a', // Selected item hover
        }
      },
      backgroundColor: {
        // Shorthand for common dark backgrounds
        'dark-primary': '#1f1f1f',
        'dark-secondary': '#2d2d2d',
      }
    },
  },
  plugins: [],
}
