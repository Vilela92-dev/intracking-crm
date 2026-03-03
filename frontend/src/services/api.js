import axios from 'axios'

const api = axios.create({
  // Use 'localhost' em vez de 127.0.0.1 para testar
  baseURL: 'http://localhost:3000/api/v1', 
  headers: {
    'Content-Type': 'application/json',
  },
})

// Adicione este log para vermos no console do navegador para onde o app está olhando
console.log("API Base URL:", api.defaults.baseURL);

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

export default api