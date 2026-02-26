import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Intercepteur pour le CSRF token Django
api.interceptors.request.use((config) => {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1]
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken
  }
  return config
})

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      window.location.href = '/api/auth/login/?next=/'
    }
    return Promise.reject(error)
  }
)

export default api
