/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        thunderFlicker: {
          "0%, 100%": { opacity: "0.2", filter: "blur(4px)" },
          "5%, 15%, 25%": {
            opacity: "1",
            filter: "blur(2px)",
          } /* Clarão do raio */,
          "10%, 20%": { opacity: "0.4", filter: "blur(5px)" },
          "30%, 85%": {
            opacity: "0.1",
            filter: "blur(6px)",
          } /* Tempo de espera entre raios */,
          "88%, 92%": { opacity: "1", filter: "blur(1px)" } /* Segundo raio */,
        },
        gradientMove: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "300% 50%" },
        },
      },
    },
  },
  plugins: [],
};
