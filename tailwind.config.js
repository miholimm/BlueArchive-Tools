/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        schale: {
          sky: '#00A3FF',
          core: '#0284C7',
          deep: '#075985',
          night: '#0b0f19',
          panel: '#111b2c',
          alert: '#FFC700',
          signal: '#FF6B8B',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Noto Sans SC"', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        panel: '18px',
        hud: '0px',
      },
      boxShadow: {
        hud: '0 0 0 1px rgba(0,163,255,.22), 0 18px 45px rgba(4,28,54,.16)',
        glow: '0 0 28px rgba(0,163,255,.32)',
        inner: 'inset 0 1px 0 rgba(255,255,255,.62)',
      },
      transitionTimingFunction: {
        schale: 'cubic-bezier(.16, 1, .3, 1)',
        terminal: 'cubic-bezier(.2, .8, .2, 1)',
      },
    },
  },
  plugins: [],
}
