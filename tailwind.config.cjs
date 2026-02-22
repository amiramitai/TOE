/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        void: '#0a0a1a',
        abyss: '#0d0d2b',
        nebula: '#1a1a4e',
        plasma: '#7c3aed',
        glow: '#a78bfa',
        neon: '#06ffa5',
        neonblue: '#38bdf8',
        ember: '#f472b6',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
