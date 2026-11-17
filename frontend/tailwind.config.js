/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', 'Lora', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        espresso: {
          950: '#190F0A',
          900: '#22150E',
          850: '#2A1A12',
          800: '#3B2519',
          700: '#4F3424',
        },
        parchment: {
          50: '#FCF8F2',
          100: '#F8F2E9',
          200: '#F5EDE3',
          300: '#EDE1D2',
          400: '#DFD0BE',
        },
        cognac: {
          400: '#E09453',
          500: '#C87A3B',
          600: '#A85D2A',
          700: '#8E4B1E',
        },
        walnut: {
          900: '#26170F',
          700: '#5E4637',
          500: '#8A6F5C',
          400: '#A88E79',
        }
      }
    },
  },
  plugins: [],
}
