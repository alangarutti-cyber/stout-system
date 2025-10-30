/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ✅ alterna o tema com a classe "dark"
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
          DEFAULT: "#ff6600", // Laranja Stout
          light: "#ff8533",
          dark: "#cc5200",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#e53935", // Vermelho Stout
          light: "#ef5350",
          dark: "#b71c1c",
          foreground: "#ffffff",
        },
        background: {
          DEFAULT: "#f9f9f9",
          dark: "#0f172a",
        },
        card: {
          DEFAULT: "#ffffff",
          dark: "#1e293b",
        },
        muted: {
          DEFAULT: "#f3f4f6",
          dark: "#1e293b",
        },
        border: {
          DEFAULT: "#e5e7eb",
          dark: "#334155",
        },
        text: {
          DEFAULT: "#111827",
          light: "#6b7280",
          dark: "#f8fafc",
        },
      },
      backgroundImage: {
        "stout-gradient": "linear-gradient(90deg, #ff6600, #e53935)",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0,0,0,0.08)",
        modal: "0 8px 32px rgba(0,0,0,0.15)",
        glow: "0 0 15px rgba(255,102,0,0.4)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
};
