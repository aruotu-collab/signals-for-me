import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0c14",
          900: "#0e111b",
          800: "#161a28",
          700: "#1f2438",
        },
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          300: "#8fb6ff",
          400: "#5a8cff",
          500: "#2f6bff",
          600: "#1f54e6",
          700: "#1a44b8",
        },
        signal: {
          growth: "#22c55e",
          funding: "#a855f7",
          hiring: "#3b82f6",
          buying: "#f59e0b",
          distress: "#ef4444",
          government: "#14b8a6",
          consumer: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(95,140,255,0.15), 0 8px 30px rgba(20,40,120,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
