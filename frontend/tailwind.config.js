/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        lecture: {
          50: "#faf5ff",
          100: "#f3e8ff",
          500: "#9333ea",
          600: "#7e22ce",
          700: "#6b21a8",
        },
      },
    },
  },
  plugins: [],
};
