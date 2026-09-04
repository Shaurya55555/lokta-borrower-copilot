/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Newsreader', 'Georgia', '"Times New Roman"', 'serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ink: '#221A20',
        muted: '#6E6069',
        rule: '#E2D9DE',
        paper: '#FBF9FA',
        paper2: '#F3EEF1',
        accent: '#4B2440',
        'accent-soft': '#EFE3EA',
        warn: '#8A4B12',
        good: '#1F6B3A',
        bad: '#9A2A2A',
      },
    },
  },
  plugins: [],
}
