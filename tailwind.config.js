/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,md,mdx}',
    './components/**/*.{js,ts,jsx,tsx,md,mdx}',
    './lib/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      // Design tokens (UI Kit)
      colors: {
        bg: { primary: '#FFFFFF', secondary: '#F7F8FA' },
        text: { primary: '#1D2430', secondary: '#6C757D' },
        accent: { primary: '#005BFF' },
        border: { primary: '#E9ECEF' },
        state: { hover: '#004ADF' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        xs: '14px',
        sm: '16px',
        md: '18px',
        lg: '24px',
        xl: '36px',
        '2xl': '48px',
      },
      spacing: { section: '96px' },
      borderRadius: { sm: '4px', md: '8px' },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
