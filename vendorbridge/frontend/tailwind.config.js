/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}', './index.html'],
  theme: {
    extend: {
      fontFamily: {
        schibsted: ['"Schibsted Grotesk"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        noto: ['"Noto Sans"', 'sans-serif'],
        fustat: ['Fustat', 'sans-serif'],
      },
      colors: {
        sidebar: '#0e1311',
        'green-accent': 'rgba(90,225,76,0.89)',
        'green-solid': '#3db544',
        'dark-badge': '#0e1311',
      },
      transitionDuration: { 250: '250ms' },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
