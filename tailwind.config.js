/** @type {import('tailwindcss').Config} */

import formsPlugin from '@tailwindcss/forms'

export default {
  content: [
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [formsPlugin]
}

