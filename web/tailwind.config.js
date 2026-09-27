/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blue: {
          base: "#2C46B1",
          dark: "#2C4090",
        },
        gray: {
          100: "#F9F9FA",
          200: "#E4E5EB",
          300: "#CDCED4",
          400: "#74788A",
          500: "#4C4F5B",
          600: "#1F2025",
        },
        danger: "#B12C4D",
      },
      fontFamily: {
        sans: ["Open Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        logo: ["Quicksand", "sans-serif"],
      },
      fontSize: {
        xxs: ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.125rem" }],
        lg: ["1.125rem", { lineHeight: "1.5rem" }],
        xl: ["1.5rem", { lineHeight: "2rem" }],
      },
    },
  },
  plugins: [],
}
