/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        canvas: "#FAF8F3",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#211F1B",
          muted: "#6F6B62",
          faint: "#A6A199",
        },
        line: {
          DEFAULT: "#E7E2D8",
          soft: "#EFEBE2",
        },
        // Primary: deep pine green
        brand: {
          50: "#EEF3EE",
          100: "#DAE5DA",
          200: "#B4CBB4",
          300: "#8CAE8C",
          400: "#5E8968",
          500: "#3D6B4C",
          600: "#2F5344",
          700: "#264337",
          800: "#20362C",
          900: "#1A2B23",
        },
        // Secondary: warm terracotta, for "today"/holiday/highlight accents
        accent: {
          50: "#FBF0E7",
          100: "#F5DCC6",
          200: "#E9BA92",
          300: "#DB9963",
          400: "#CC7D42",
          500: "#B8632B",
          600: "#9B5223",
          700: "#7C421D",
          800: "#603419",
          900: "#4A2A15",
        },
        // Muted brick red, for delete/danger actions and the "now" marker
        danger: {
          50: "#FBEDEA",
          100: "#F3D3CC",
          200: "#E4A99B",
          300: "#D37F6A",
          400: "#C15D42",
          500: "#AE4429",
          600: "#933A24",
          700: "#762E1D",
        },
      },
      borderColor: {
        DEFAULT: "#E7E2D8",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(33,31,27,0.04), 0 4px 12px rgba(33,31,27,0.05)",
        "soft-md": "0 2px 4px rgba(33,31,27,0.05), 0 8px 20px rgba(33,31,27,0.07)",
        "soft-lg": "0 4px 8px rgba(33,31,27,0.06), 0 16px 36px rgba(33,31,27,0.11)",
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
