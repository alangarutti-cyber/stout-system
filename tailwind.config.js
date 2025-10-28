/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"], // permite alternar tema claro/escuro via classe "dark"
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
          DEFAULT: "#ff6600", // laranja principal da Stout
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#222222", // preto grafite
          foreground: "#ffffff",
        },
        background: {
          DEFAULT: "#f9f9f9", // fundo padrão claro
          dark: "#121212", // fundo escuro para modo dark
          modal: "#ffffff", // fundo dos modais claros
          "modal-dark": "rgba(20,20,20,0.95)", // fundo dos modais escuros
        },
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0,0,0,0.08)",
        modal: "0 8px 32px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
};
