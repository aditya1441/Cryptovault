/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Inter"', '"Segoe UI"', "sans-serif"],
      },
      colors: {
        background: "#030303",
        surface: "#0e0e11",
        elevated: "#18181c",
        brand: {
          light: "#3b9eff",
          DEFAULT: "#0A84FF",
          dark: "#005bb5"
        },
        accent: "#0A84FF",
        success: "#2ecb43",
        danger: "#fb3b30",
        warning: "#f5cc00",
        border: "rgba(255,255,255,0.06)",
        muted: "#8e8e93",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "hero-glow": "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(10,132,255,0.35), transparent)",
        "success-glow": "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(46,203,67,0.2), transparent)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "ticker": "ticker 30s linear infinite",
        "count-up": "countUp 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "slide-left": "slideLeft 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },
    },
  },
  plugins: [],
}
