/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F8FAFC',
        'surface-subtle': '#F1F5F9',
        border: '#E2E8F0',
        'border-strong': '#CBD5E1',
        text: {
          main: '#1E293B',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
          dark: '#1E40AF',
        },
        success: {
          DEFAULT: '#15803D',
          light: '#F0FDF4',
          border: '#BBF7D0',
        },
        warning: {
          DEFAULT: '#B45309',
          light: '#FFFBEB',
          border: '#FDE68A',
        },
        danger: {
          DEFAULT: '#B91C1C',
          light: '#FEF2F2',
          border: '#FECACA',
        },
        forest: {
          900: '#0F291E',
          800: '#1B4332',
          700: '#2D6A4F',
          600: '#40916C',
          500: '#52B788',
          400: '#74C69D',
          300: '#95D5B2',
          200: '#B7E4C7',
          100: '#D8F3DC',
          50: '#EBF7EE',
        },
        sage: {
          DEFAULT: '#74C69D',
          light: '#D8F3DC',
          border: '#B7E4C7',
          dark: '#1B4332',
        },
        warm: {
          50: '#FCFCFA',
          100: '#F8F9FA',
          200: '#F1F3F0',
          300: '#E8ECE6',
          400: '#D5DDD2',
        },
        charcoal: {
          900: '#1A1D1B',
          800: '#242926',
          700: '#343B36',
          600: '#4C554F',
          500: '#68746C',
          400: '#8A968E',
          300: '#B2BDB6',
        },
        terracotta: {
          DEFAULT: '#9C4221',
          light: '#FDF2EE',
          border: '#F4C5B6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
