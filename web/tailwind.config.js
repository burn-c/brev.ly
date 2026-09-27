/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#2C46B1",
          600: "#2C4090",
        },
        danger: {
          500: "#B12C4D",
        },
        surface: {
          50: "#F9F9FA",
          100: "#E4E5EB",
          200: "#CDCED4",
          400: "#74788A",
          600: "#4C4F5B",
          900: "#1F2025",
        },
      },
      fontFamily: {
        sans: ["Open Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        logo: ["Quicksand", "sans-serif"],
      },
      fontSize: {
        xxs: "0.625rem",
      },
    },
  },
  plugins: [],
}
