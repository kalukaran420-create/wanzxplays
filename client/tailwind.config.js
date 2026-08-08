/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          primary: '#313338',
          secondary: '#2b2d31',
          tertiary: '#1e1f22',
          floating: '#232428',
          input: '#383a40',
          hover: '#35373c',
          active: '#404249',
          brand: '#5865f2',
          'brand-hover': '#4752c4',
          green: '#23a55a',
          yellow: '#f0b232',
          red: '#f23f43',
          gray: '#80848e',
          text: '#dbdee1',
          muted: '#949ba4',
        }
      }
    },
  },
  plugins: [],
}
