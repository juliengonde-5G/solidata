/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Charte graphique Solidarité Textiles
        soltex: {
          green: '#7AB51D',
          'green-dark': '#5A8A10',
          'green-light': '#9BD445',
          yellow: '#F5A623',
          'yellow-dark': '#D4891A',
          orange: '#E8872A',
          white: '#FFFFFF',
          gray: '#F5F5F5',
          'gray-dark': '#333333',
        },
        // Couleurs Kanban
        kanban: {
          received: '#3B82F6',    // bleu
          rejected: '#EF4444',     // rouge
          qualified: '#F59E0B',    // orange
          interview: '#8B5CF6',    // violet
          validated: '#10B981',    // vert
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
