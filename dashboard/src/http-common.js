import axios from 'axios'

const http = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

// Interceptor para log de requests
http.interceptors.request.use(
  config => {
    console.log(`[HTTP] ${config.method.toUpperCase()} ${config.url}`)
    return config
  },
  error => Promise.reject(error)
)

// Interceptor para tratamento de erros
http.interceptors.response.use(
  response => response,
  error => {
    console.error('[HTTP ERROR]', error.response?.data || error.message)
    return Promise.reject(error.response?.data || error)
  }
)

export default http
