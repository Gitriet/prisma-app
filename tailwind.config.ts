import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        cream: "#f9f6f0",
        ink: "#0c0c0b",
        muted: "#6b6b67",
        border: "rgba(12,12,11,0.12)",
        c1: "#d04a2f",
        c2: "#2255b8",
        c3: "#1a7c4f",
        "c1-bg": "#fdf0ed",
        "c2-bg": "#edf2fc",
        "c3-bg": "#edf7f2",
      },
    },
  },
  plugins: [],
};

export default config;
