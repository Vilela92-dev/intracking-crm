import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 1. Verifica se já existe uma sessão ao carregar o app
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (err) {
        // Se os dados estiverem corrompidos, limpa tudo
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  // 2. Função de Login conectada ao Heroku
  const login = async (email, password) => {
    setError(null)
    try {
      const response = await api.post('/auth/login', { email, password })
      
      // ✅ CORRIGIDO: tenantId e tenantName vêm fora do objeto user no backend
      const { token, user: userData, tenantId, tenantName } = response.data

      // Salva os dados para manter a sessão ativa ao dar F5
      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      // Salva o ID e nome do Ateliê (Tenant)
      if (tenantId) {
        localStorage.setItem('tenantId', tenantId)
        localStorage.setItem('tenantName', tenantName)
      }

      // Atualiza o estado global do React
      setUser(userData)
      return userData
      
    } catch (err) {
      console.error("Erro detalhado no login:", err)
      
      // Captura a mensagem de erro vinda do servidor ou define uma padrão
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'E-mail ou senha incorretos'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // 3. Função de Registro (caso precise criar novos usuários)
  const register = async (name, email, password) => {
    setError(null)
    try {
      const response = await api.post('/auth/register', { name, email, password })
      const userData = response.data.user
      
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erro ao realizar cadastro'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // 4. Função de Logout (Sair)
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

// Hook personalizado para usar o contexto em qualquer página
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}