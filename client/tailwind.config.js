/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#b8d0ff",
          300: "#8bb2ff",
          400: "#5c8dff",
          500: "#3568f5",
          600: "#2450d6",
          700: "#1d3fab",
          800: "#1c3689",
          900: "#1c306e",
        },
      },
    },
  },
  plugins: [],
};
