/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-color': '#0C0D0F',
        'nneutral-100': '#D9E3F6',
        'nneutral-200': '#CFD8E6',
        'nneutral-500': '#C2C8D3',
        'nneutral-800': '#8D939C',
        'nneutral-900': '#51565B',

        'ngray-100': '#2C2E31',
        'ngray-200': '#242628',
        'ngray-500': '#1F2023',
        'ngray-800': '#181A1D',
        'ngray-900': '#111316',

        'nprimary-100': '#6EE7B7',
        'nprimary-200': '#34D399',
        'nprimary-500': '#14B983',
        'nprimary-800': '#047857',
        'nprimary-900': '#065F46',

        'nsecondary-100': '#16A8B9',
        'nsecondary-200': '#138693',
        'nsecondary-500': '#00536A',
        'nsecondary-800': '#01384C',
        'nsecondary-900': '#042D38',

        'ntint-100': '#98DBD4',
        'ntint-200': '#7BD0C7',
        'ntint-500': '#50B0A5',
        'ntint-800': '#31847B',
        'ntint-900': '#1D5B54',

        'nsuccess': '#009E71',
        'nerror': '#AE3B45',
        'nwarning': '#A19B51',

        'npurple-borders': '#6A9BB8',
        'sliderbg': '#212121',

        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          secondary: 'rgb(var(--ink-secondary) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
          inverse: 'rgb(var(--ink-inverse) / <alpha-value>)',
        },
        surface: {
          app: 'rgb(var(--surface-app) / <alpha-value>)',
          panel: 'rgb(var(--surface-panel) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
          soft: 'rgb(var(--surface-soft) / <alpha-value>)',
          composer: 'rgb(var(--surface-composer) / <alpha-value>)',
          header: 'rgb(var(--surface-header) / <alpha-value>)',
          bubble: 'rgb(var(--surface-bubble) / <alpha-value>)',
        },
        hairline: 'rgb(var(--hairline-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
