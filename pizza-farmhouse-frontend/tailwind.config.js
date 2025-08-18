const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'primary': '#F97316',      // A warm, appetizing orange for buttons & links
        'secondary': '#334155',    // A dark slate color for text
        'background': '#F1F5F9',  // A very light gray for page backgrounds
      },
      fontFamily: {
        // Sets 'Poppins' as the default font for the project
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};