/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#101B18', 900: '#0C1512', 800: '#17251F', 700: '#22332C', 600: '#34483F',
          500: '#51655B', 400: '#7A8C82', 300: '#A6B3AB', 200: '#CFD8D2', 100: '#E3E9E5', 50: '#F2F5F2',
        },
        brand: { DEFAULT: '#0B6E5F', 600: '#0A5C50', 700: '#084A41', 100: '#C4E6DE', 50: '#E6F4F0' },
        signal: { DEFAULT: '#2E68F4', 600: '#2556D0', 100: '#D6E2FD', 50: '#EBF1FE' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
        sans: ['Barlow', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'sheet-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: { 'sheet-in': 'sheet-in .2s ease-out', 'pop-in': 'pop-in .15s ease-out' },
    },
  },
  plugins: [],
};
