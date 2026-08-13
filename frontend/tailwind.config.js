/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          900: '#14532d',
        },
        navy: {
          800: '#0f172a',
          900: '#0b0f19',
          950: '#05070c',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
