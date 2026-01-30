/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gdrive-blue': '#1a73e8',
        'gdrive-hover': '#1557b0',
        'gdrive-sidebar': '#f8fafd',
        'gdrive-border': '#dadce0',
      }
    },
  },
  plugins: [],
}
