import axios from 'axios'

const api = axios.create({
  // URL do Heroku (Produção)
  baseURL: 'https://intracking-crm-atelierpro-95c386fda1d5.herokuapp.com/api/v1',
  
  // Se precisar voltar para o teste local, basta comentar a linha de cima e descomentar a de baixo:
  // baseURL: 'http://localhost:3000/api/v1', 
  
  headers: {
    'Content-Type': 'application/json',
  },
})

// Log para conferirmos no console do navegador se a URL mudou mesmo
console.log("API Base URL conectada:", api.defaults.baseURL);

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

export default api