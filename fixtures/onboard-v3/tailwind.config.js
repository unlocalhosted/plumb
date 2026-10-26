/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563eb', dark: '#1d4ed8', light: '#60a5fa' },
        secondary: '#64748b',
        muted: '#f1f5f9',
        surface: '#ffffff',
        border: '#e2e8f0',
      },
      spacing: { 4.5: '1.125rem', 13: '3.25rem', 15: '3.75rem', 18: '4.5rem', 22: '5.5rem', 30: '7.5rem' },
      borderRadius: { card: '12px', pill: '999px', field: '6px' },
      fontSize: { caption: '0.75rem', body: '0.9375rem', lead: '1.125rem', title: '1.5rem', display: '2.25rem' },
      boxShadow: { card: '0 1px 3px rgba(0,0,0,.1)', pop: '0 8px 24px rgba(0,0,0,.15)', inset: 'inset 0 1px 0 rgba(255,255,255,.2)' },
      screens: { tablet: '768px', desktop: '1180px' },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      transitionDuration: { fast: '120ms', base: '200ms', slow: '320ms' },
    },
  },
  plugins: [],
};
