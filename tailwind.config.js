/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        bg: {
          primary: '#0a0a0a',
          secondary: '#111111',
          card: '#161616',
          elevated: '#1c1c1c',
          hover: '#222222',
        },
        border: {
          DEFAULT: '#2a2a2a',
          subtle: '#1f1f1f',
          active: '#3a3a3a',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#a0a0a0',
          muted: '#606060',
          accent: '#ffffff',
        },
        accent: {
          gold: '#c9a84c',
          'gold-light': '#e8c97a',
          'gold-dim': '#8a6f2e',
          green: '#22c55e',
          'green-dim': '#16a34a',
          red: '#ef4444',
          'red-dim': '#b91c1c',
          blue: '#3b82f6',
          'blue-dim': '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};
