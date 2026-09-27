/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#8257e5",
          600: "#6f3fe0",
        },
      },
    },
  },
  plugins: [],
}
