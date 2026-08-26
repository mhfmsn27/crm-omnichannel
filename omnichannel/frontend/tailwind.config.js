/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#0f172a',      // Slate 900
          surface: '#1e293b', // Slate 800
          border: '#334155',  // Slate 700
          text: '#f8fafc',    // Slate 50
          muted: '#94a3b8'    // Slate 400
        },
        // WhatsApp-inspired green palette — replaces indigo throughout the app
        indigo: {
          50:  '#e6f4f1',   // very light teal (hover backgrounds, subtle tints)
          100: '#b2d8d4',   // light teal (sidebar inactive text, badge backgrounds)
          200: '#80bcb6',   // medium-light teal
          300: '#4db1a7',   // medium teal (separators, borders)
          400: '#26a69a',   // teal (dark-mode text accents)
          500: '#25D366',   // WhatsApp bright green (notifications, special states)
          600: '#128C7E',   // WhatsApp medium teal — PRIMARY (buttons, links, hover)
          700: '#0d7a6e',   // darker teal (button :hover)
          800: '#075E54',   // WhatsApp dark teal (deepest accents)
          900: '#054a43',   // very dark teal (dark-mode tints)
          950: '#033330',   // near-black teal
        }
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      }
    },
  },
  plugins: [],
}
