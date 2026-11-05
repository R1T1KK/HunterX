import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          black: "#07090E",
          charcoal: "#121620",
          card: "#191D26",
          crimson: "#FF3B30",
          "crimson-secondary": "#FF4655",
          amber: "#FF9500",
          text: "#FFFFFF",
          "text-muted": "#A0A4AE",
          border: "#242A38",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        gaming: ["var(--font-gaming)", "Impact", "system-ui", "sans-serif"],
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top, 0px)",
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
        "safe-left": "env(safe-area-inset-left, 0px)",
        "safe-right": "env(safe-area-inset-right, 0px)",
      },
      minHeight: {
        "touch-target": "44px",
        "touch-primary": "56px",
      },
      minWidth: {
        "touch-target": "44px",
      },
    },
  },
  plugins: [],
};

export default config;
