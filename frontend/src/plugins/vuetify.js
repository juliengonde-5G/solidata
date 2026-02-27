import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'solidataTheme',
    themes: {
      solidataTheme: {
        dark: false,
        colors: {
          primary: '#1565C0',
          secondary: '#43A047',
          accent: '#FF6F00',
          error: '#D32F2F',
          warning: '#F9A825',
          info: '#0288D1',
          success: '#2E7D32',
          background: '#F5F5F5',
          surface: '#FFFFFF',
        },
      },
    },
  },
  defaults: {
    VCard: { elevation: 2 },
    VBtn: { variant: 'flat' },
  },
})
