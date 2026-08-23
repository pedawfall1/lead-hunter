import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080b10",
          900: "#0b1017",
          800: "#111823",
          700: "#18212f",
          600: "#202b3b",
          500: "#2b3849",
        },
        line: "#243044",
        brand: {
          DEFAULT: "#f97316",
          soft: "#fb923c",
          dim: "rgba(249,115,22,0.14)",
        },
        st: {
          novo: "#94a3b8",
          contatado: "#38bdf8",
          respondeu: "#a78bfa",
          negociando: "#fbbf24",
          fechou: "#34d399",
          descartado: "#fb7185",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in .15s ease-out",
        "slide-up": "slide-up .18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
