import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        livably: {
          green: "#639922",
          greenLight: "#EAF3DE",
          blue: "#185FA5",
          blueLight: "#E6F1FB",
          text: "#1a1a1a",
          muted: "#6b7280",
          border: "#e5e7eb",
          surface: "#f9fafb"
        }
      },
      keyframes: {
        pinPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 215, 0, 0.58)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255, 215, 0, 0)" }
        }
      },
      animation: {
        pinPulse: "pinPulse 1.4s ease-out infinite"
      }
    }
  },
  plugins: []
}

export default config
