/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Barlow Condensed"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        rdm: {
          bg: '#F3F1EE',
          surface: '#FFFFFF',
          border: '#D8D5CF',
          dark: '#1A1A1A',
          muted: '#58554E',
          red: '#CC0000',
          'red-hover': '#A30000',
          'red-light': '#FFF5F5',
          footer: '#111111',
        },
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
