import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'var(--border-default)',
        input: 'var(--input-bg)',
        ring: 'var(--accent-teal)',
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        primary: {
          DEFAULT: 'var(--accent-teal)',
          foreground: 'var(--btn-primary-text)',
        },
        secondary: {
          DEFAULT: 'var(--accent-blue)',
          foreground: 'var(--text-primary)',
        },
        muted: {
          DEFAULT: 'var(--text-secondary)',
          foreground: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent-teal)',
          foreground: 'var(--btn-primary-text)',
        },
        card: {
          DEFAULT: 'var(--bg-card)',
          foreground: 'var(--text-card)',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#22c55e',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#000000',
        },
        surface: 'var(--bg-surface)',
        'surface-hover': 'var(--bg-surface-hover)',
      },
      borderColor: {
        DEFAULT: 'var(--border-default)',
      },
      backgroundColor: {
        DEFAULT: 'var(--bg-primary)',
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        surface: 'var(--bg-surface)',
      },
      textColor: {
        DEFAULT: 'var(--text-primary)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'glow-teal': 'var(--shadow-glow-teal)',
        'glow-blue': 'var(--shadow-glow-blue)',
        'glow-violet': 'var(--shadow-glow-violet)',
        'btn': 'var(--shadow-btn)',
        'input-focus': 'var(--shadow-input-focus)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 212, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 245, 212, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
