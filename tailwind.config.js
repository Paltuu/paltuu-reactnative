/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#a03048",
        primarySoft: "#fce8ed",
        primaryMid: "#f0b8c4",
        dark: "#1A1A2E",
        gray: {
          DEFAULT: "#555555",
          light: "#999999",
          300: "#E0E0E0",
          400: "#999999",
          500: "#555555",
          700: "#1A1A2E",
        },
        bg: "#F5F5F7",
        surface: "#FFFFFF",
        surfaceElevated: "#FAFAFA",
        surfaceSubtle: "#F0F0F2",
        success: "#1A7A3C",
        error: "#C0392B",
      },
      fontFamily: {
        heading: ["Montserrat_700Bold"],
        headingSemi: ["Montserrat_600SemiBold"],
        body: ["DMSans_400Regular"],
        bodyMedium: ["DMSans_500Medium"],
      },
      borderRadius: {
        'button': '12px',
        'card': '16px',
      },
    },
  },
  plugins: [],
};
