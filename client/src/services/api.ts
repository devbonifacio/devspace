import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ds_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status
    const data = err.response?.data
    const banned = status === 403 && data?.code === 'BANNED'
    if (status === 401 || banned) {
      localStorage.removeItem('ds_token')
      // Guarda a mensagem de banimento pra AuthPage exibir
      if (banned && data?.error) localStorage.setItem('ds_authmsg', data.error)
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

export default api
