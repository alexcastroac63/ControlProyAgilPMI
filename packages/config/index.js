module.exports = {
  eslint: {},
  tailwind: {
    darkMode: ["class"],
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
    theme: { extend: {} },
    plugins: []
  }
};
