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
        surface: {
          0: "#050310",
          1: "#0b0613",
          2: "#150a25",
          3: "#1d1130",
        },
        neon: {
          pink: "#ff3ea5",
          purple: "#a855f7",
          cyan: "#22d3ee",
          yellow: "#facc15",
          green: "#4ade80",
        },
        ink: {
          DEFAULT: "rgb(243 232 255)",
          soft: "rgb(243 232 255 / 0.78)",
          mute: "rgb(243 232 255 / 0.55)",
          faint: "rgb(243 232 255 / 0.32)",
        },
      },
      fontFamily: {
        display: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        xs: "8px",
        sm: "12px",
        md: "18px",
        lg: "22px",
        xl: "28px",
        "2xl": "32px",
      },
      boxShadow: {
        glow: "0 0 24px rgba(168, 85, 247, 0.45)",
        "glow-pink": "0 0 22px rgba(255, 62, 165, 0.34), 0 14px 32px rgba(255, 62, 165, 0.18)",
        "glow-cyan": "0 0 22px rgba(34, 211, 238, 0.32), 0 14px 32px rgba(34, 211, 238, 0.16)",
        "glow-yellow": "0 0 22px rgba(250, 204, 21, 0.34), 0 14px 32px rgba(250, 204, 21, 0.16)",
        "glow-green": "0 0 22px rgba(74, 222, 128, 0.32)",
        card: "0 18px 44px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        "card-elev": "0 26px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        "card-soft": "0 12px 28px rgba(0, 0, 0, 0.32)",
        "inner-line": "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
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
        slideUp: {
          from: { opacity: "0", transform: "translate3d(0, 16px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(0.84)", opacity: "0" },
          "60%": { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
        floaty: "floaty 3s ease-in-out infinite",
        slideUp: "slideUp 320ms cubic-bezier(0.2, 0.9, 0.2, 1) both",
        fadeIn: "fadeIn 180ms ease both",
        pop: "pop 360ms cubic-bezier(0.34, 1.18, 0.64, 1) both",
      },
      transitionTimingFunction: {
        "ease-out-soft": "cubic-bezier(0.2, 0.9, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.18, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
