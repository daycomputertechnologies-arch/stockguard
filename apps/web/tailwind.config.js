/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B2545",
          700: "#12325A",
          600: "#1A3E6B",
          500: "#2A4F7A",
        },
        brand: {
          50: "#ECFDF9",
          100: "#D1FAF1",
          200: "#A7F3E4",
          300: "#6EE7D3",
          400: "#34D3BE",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
        },
        canvas: "#F6F8FB",
        line: "#E4E9F0",
        warn: "#F59E0B",
        danger: "#EF4444",
        good: "#10B981",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,37,69,0.06), 0 8px 24px -12px rgba(11,37,69,0.18)",
        float: "0 18px 50px -20px rgba(11,37,69,0.45)",
      },
      borderRadius: {
        xl2: "1.125rem",
      },
    },
  },
  plugins: [],
};
