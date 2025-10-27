/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#ff6600",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#222222",
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
};
