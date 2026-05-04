import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0613",
          soft: "#150a25",
          card: "#1d1130",
        },
        neon: {
          pink: "#ff3ea5",
          purple: "#a855f7",
          cyan: "#22d3ee",
          yellow: "#facc15",
          green: "#4ade80",
        },
      },
      fontFamily: {
        display: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(168, 85, 247, 0.45)",
        "glow-pink": "0 0 24px rgba(255, 62, 165, 0.55)",
        "glow-cyan": "0 0 24px rgba(34, 211, 238, 0.45)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
        floaty: "floaty 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
