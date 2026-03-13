/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // ¡Esta línea es la que achica los iconos!
  ],
  theme: {
    extend: {
      colors: {
        'forest-dark': '#080C0E',
        'forest-panel': '#111A1D',
        'emerald-neon': '#00FF9D',
        'water-blue': '#00D1FF',
      },
    },
  },
  plugins: [],
}