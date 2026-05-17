/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        gradientMove: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "300% 50%" },
        },
        nudge: {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "10%, 30%, 50%, 70%, 90%": {
            transform: "translate(-4px, -4px) rotate(-1deg)",
          },
          "20%, 40%, 60%, 80%": {
            transform: "translate(4px, 4px) rotate(1deg)",
          },
        },
      },

      animation: {
        nudge: "nudge 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};
