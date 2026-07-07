/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: "#FAF8F5",
        bg2: "#EAE3D9",
        surface: "#FFFFFF",
        ink: "#2C362F",
        ink2: "#5C6A61",
        brand: "#D45D3F",
        brandHover: "#B34A30",
        accent: "#E29547",
        successc: "#4A6B53",
        destructive: "#A63C2E",
      },
      fontFamily: {
        heading: ["Outfit", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 8px 32px rgba(44,54,47,0.06)",
        lift: "0 12px 40px rgba(44,54,47,0.12)",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        pop: "pop 400ms ease-out",
        fadeUp: "fadeUp 350ms ease-out both",
      },
    },
  },
  plugins: [],
};
