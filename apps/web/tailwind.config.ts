import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: {
            50: "#F5F3FF",
            100: "#EDE9FE",
            200: "#DDD6FE",
            300: "#C4B5FD",
            400: "#A78BFA",
            500: "#8B5CF6",
            600: "#7C3AED",
            700: "#6D28D9",
            800: "#5B21B6",
            900: "#4C1D95",
          },
          blue: {
            50: "#EFF6FF",
            100: "#DBEAFE",
            200: "#BFDBFE",
            300: "#93C5FD",
            400: "#60A5FA",
            500: "#3B82F6",
            600: "#2563EB",
            700: "#1D4ED8",
            800: "#1E40AF",
            900: "#1E3A8A",
          },
        },
        primary: {
          DEFAULT: "#7C3AED",
          hover: "#6D28D9",
          light: "#EDE9FE",
          dark: "#5B21B6",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1D4ED8",
          hover: "#1E40AF",
          light: "#DBEAFE",
          dark: "#1E3A8A",
          foreground: "#FFFFFF",
        },
        accent: {
          cyan: "#06B6D4",
          rose: "#F43F5E",
          amber: "#F59E0B",
          emerald: "#10B981",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F8F7FF",
          muted: "#F1EEFF",
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FEF3C7",
          foreground: "#FFFFFF",
        },
        danger: {
          DEFAULT: "#DC2626",
          hover: "#B91C1C",
          light: "#FEE2E2",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        heading: [
          "var(--font-heading)",
          "Plus Jakarta Sans",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "brand-sm": "0 1px 3px 0 rgba(124, 58, 237, 0.08)",
        brand: "0 4px 16px 0 rgba(124, 58, 237, 0.12)",
        "brand-lg": "0 8px 32px 0 rgba(124, 58, 237, 0.18)",
        "brand-xl": "0 16px 48px 0 rgba(124, 58, 237, 0.24)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
