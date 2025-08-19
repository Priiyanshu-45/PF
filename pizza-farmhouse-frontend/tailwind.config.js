const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      'xs': '320px',   // Small phones
      'sm': '375px',   // Standard phones
      'md': '768px',   // Tablets
      'lg': '1024px',  // Small laptops  
      'xl': '1280px',  // Large screens
      '2xl': '1536px', // Extra large screens
    },
    extend: {
      colors: {
        'primary': {
          50: '#fef7f0',
          100: '#fdebe0', 
          200: '#fad4bf',
          300: '#f6b494',
          400: '#f08a5d',
          500: '#F97316', // Main primary color
          600: '#ea5a0c',
          700: '#c2480c',
          800: '#9a3b12',
          900: '#7c3212',
        },
        'secondary': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0', 
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#334155', // Main secondary color
          600: '#475569',
          700: '#1e293b',
          800: '#0f172a',
          900: '#020617',
        },
        'background': '#F1F5F9',
        
        // ADD THIS LINE HERE
        'text-secondary': '#334155',
      },
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      minHeight: {
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
};