import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f4f6f1",
        ink: "#171a1f",
        muted: "#667085",
        line: "#d9ded6",
        panel: "#ffffff",
        success: "#12805c",
        danger: "#c2413b",
        warning: "#b7791f",
        focus: "#2f5f98"
      },
      boxShadow: {
        panel: "0 16px 44px rgba(42, 47, 55, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
