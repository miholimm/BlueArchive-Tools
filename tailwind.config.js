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
        surface: {
          day: '#eaf4fb',
          paper: '#f8fcff',
          night: '#0b0f19',
          panel: '#111b2c',
        },
      },
      fontFamily: {
        display: ['"Unbounded"', '"Teko"', '"Barlow Condensed"', '"Noto Sans SC"', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        panel: '18px',
        hud: '0px',
        cut: '0px',
      },
      boxShadow: {
        hud: '0 0 0 1px rgba(0,163,255,.22), 0 18px 45px rgba(4,28,54,.16)',
        glow: '0 0 28px rgba(0,163,255,.32)',
        inner: 'inset 0 1px 0 rgba(255,255,255,.62)',
        panel: '0 18px 44px rgba(5,48,86,.13), inset 0 1px 0 rgba(255,255,255,.7)',
      },
      transitionTimingFunction: {
        schale: 'cubic-bezier(.16, 1, .3, 1)',
        terminal: 'cubic-bezier(.2, .8, .2, 1)',
      },
      transitionProperty: {
        surface: 'transform, color, background-color, border-color, box-shadow, opacity, filter',
      },
      spacing: {
        hud: '1.125rem',
        sector: '4.5rem',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(0,163,255,.11) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,.11) 1px, transparent 1px)',
        scan: 'linear-gradient(90deg, transparent, rgba(0,163,255,.12), transparent)',
      },
    },
  },
  plugins: [],
}
