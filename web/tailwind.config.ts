import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#01696f',
          hover: '#0c4e54',
          active: '#0f3638',
          highlight: '#cedcd8',
        },
        surface: {
          DEFAULT: '#f9f8f5',
          '2': '#fbfbf9',
          offset: '#edeae5',
        },
        border: '#d4d1ca',
        divider: '#dcd9d5',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
