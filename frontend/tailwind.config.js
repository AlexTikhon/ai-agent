/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151821",
        mist: "#f6f7fb",
        accent: "#0f766e",
        warm: "#f59e0b"
      }
    }
  },
  plugins: []
};
