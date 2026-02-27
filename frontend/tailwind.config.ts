import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        'bg-sec': 'var(--color-bg-sec)',
        surface: 'var(--color-surface)',
        surface2: 'var(--color-surface-2)',
        surface3: 'var(--color-surface-3)',
        'border-c': 'var(--color-border)',
        'border-s': 'var(--color-border-strong)',
        'text-c': 'var(--color-text)',
        'text-sec': 'var(--color-text-sec)',
        'muted-c': 'var(--color-muted)',
        accent: 'var(--color-accent)',
        'accent-h': 'var(--color-accent-hover)',
        teal: 'var(--color-teal)',
        'amber-c': 'var(--color-amber)',
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require('@tailwindcss/typography')],
}

export default config;
