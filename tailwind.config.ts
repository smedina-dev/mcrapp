import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        forest: "rgb(var(--color-forest) / <alpha-value>)",
        lime: "rgb(var(--color-lime) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Trebuchet MS", "Avenir Next", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;