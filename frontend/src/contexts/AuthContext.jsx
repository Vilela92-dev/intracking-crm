import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (err) {
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    setError(null)
    try {
      // 1. Chamada para a API (baseURL já tem /api/v1)
      const response = await api.post('/auth/login', { email, password })
      
      // 2. Desestruturação conforme o seu server.js (data.data)
      const { accessToken, user: userData } = response.data.data

      // 3. Salva no LocalStorage
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('companyId', userData.companyId || 'company-01')

      // 4. Atualiza o estado global
      setUser(userData)
      return userData
    } catch (err) {
      console.error("Erro no login:", err)
      const errorMessage = err.response?.data?.error || 'Email ou senha inválidos'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const register = async (name, email, password) => {
    setError(null)
    try {
      const response = await api.post('/auth/register', { name, email, password })
      const userData = response.data.data
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erro ao registrar'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      register, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}