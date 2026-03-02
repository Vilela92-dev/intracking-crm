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
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const register = async (name, email, password) => {
    setError(null)
    try {
      const response = await api.post('/api/v1/auth/register', {
        name,
        email,
        password,
      })

      const { data } = response.data
      const token = response.data.token

      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(data))
      localStorage.setItem('companyId', data.companyId)

      setUser(data)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erro ao registrar'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const login = async (email, password) => {
    setError(null)
    try {
      const response = await api.post('/api/v1/auth/login', {
        email,
        password,
      })

      const { data } = response.data
      const token = response.data.token

      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(data))
      localStorage.setItem('companyId', data.companyId)

      setUser(data)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Email ou senha inválidos'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('companyId')
    setUser(null)
    setError(null)
  }

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
