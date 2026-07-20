import axios from 'axios'
import { getToken, logout } from './auth'

const api = axios.create({
  baseURL: 'https://razao-backend.onrender.com'
})

// Adiciona token em todas as requisições
api.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Se token expirar, faz logout automático
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api