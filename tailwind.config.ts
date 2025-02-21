import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Nord Theme Colors
        'nord': {
          0: '#2E3440',  // Polar Night - Dark
          1: '#3B4252',  // Polar Night - Darker
          2: '#434C5E',  // Polar Night - Medium
          3: '#4C566A',  // Polar Night - Light
          4: '#D8DEE9',  // Snow Storm - Darkest
          5: '#E5E9F0',  // Snow Storm - Medium
          6: '#ECEFF4',  // Snow Storm - Lightest
          7: '#8FBCBB',  // Frost - Sage
          8: '#88C0D0',  // Frost - Light Blue
          9: '#81A1C1',  // Frost - Medium Blue
          10: '#5E81AC', // Frost - Dark Blue
          11: '#BF616A', // Aurora - Red
          12: '#D08770', // Aurora - Orange
          13: '#EBCB8B', // Aurora - Yellow
          14: '#A3BE8C', // Aurora - Green
          15: '#B48EAD', // Aurora - Purple
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'var(--nord0)',
            strong: {
              color: 'var(--nord10)',
              fontWeight: '600',
            },
          },
        },
        dark: {
          css: {
            color: 'var(--nord4)',
            strong: {
              color: 'var(--nord8)',
              fontWeight: '600',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
