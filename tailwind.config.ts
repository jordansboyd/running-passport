import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#f5f1e8",
          dim: "#9ba39e",
          faint: "#5a655e",
        },
        canvas: {
          DEFAULT: "#0b1410",
          raised: "#121f19",
          line: "#1d2e25",
        },
        passport: {
          accent: "#93D94E",
          green: "#3B8C66",
          forest: "#347355",
        },
      },
    },
  },
  plugins: [],
};

export default config;
