/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./utils/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        qie: "#00ff88",
        ink: "#07110d",
        panel: "#101915",
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 255, 136, 0.18)",
      },
    },
  },
  plugins: [],
};
