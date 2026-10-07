/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAFAF8",
          warm: "#FFFDF8",
          card: "#FBFBFA",
          muted: "#F4F4F0",
        },
        border: {
          subtle: "#EFEFEA",
          DEFAULT: "#E5E5DE",
          strong: "#D2D2C8",
        },
        primary: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#E86326", // Signature ClickCodeX Terracotta/Warm Spice
          600: "#D34F15",
          700: "#9A3412",
          DEFAULT: "#E86326",
          dark: "#C2410C",
        },
        brand: {
          orange: "#E86326",
          gold: "#D97706",
          charcoal: "#1C1917",
          sand: "#F7F5F0",
          cream: "#FCFBF8",
        },
        ink: {
          primary: "#1C1917",
          secondary: "#57534E",
          muted: "#78716C",
          faint: "#A8A29E",
        },
        dietary: {
          veg: "#16A34A",
          nonVeg: "#DC2626",
          egg: "#D97706",
          vegan: "#059669",
        }
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)",
        card: "0 4px 20px -2px rgba(0,0,0,0.05), 0 2px 6px -1px rgba(0,0,0,0.02)",
        hover: "0 12px 32px -4px rgba(232, 99, 38, 0.08), 0 4px 12px -2px rgba(0,0,0,0.04)",
        modal: "0 24px 60px -12px rgba(28, 25, 23, 0.15), 0 8px 24px -4px rgba(28, 25, 23, 0.06)",
        float: "0 14px 34px rgba(232, 99, 38, 0.18)",
      },
      borderRadius: {
        '3xl': "1.75rem",
        '4xl': "2rem",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s ease-out forwards',
        'shimmer': 'shimmer 1.8s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
