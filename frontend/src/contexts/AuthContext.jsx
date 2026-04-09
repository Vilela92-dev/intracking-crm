import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 1. Verifica se já existe uma sessão ao carregar o app (Persistência)
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (err) {
        // Se os dados estiverem corrompidos, limpa o armazenamento
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  // 2. Função de Login (Acesso ao CRM após o Setup)
  const login = async (email, password) => {
    setError(null)
    try {
      const response = await api.post('/auth/login', { email, password })
      
      // O backend retorna token, dados do usuário e informações do Tenant (Ateliê)
      const { token, user: userData, tenantId, tenantName } = response.data

      // Salva no localStorage para manter a sessão ativa (persistência)
      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      if (tenantId) {
        localStorage.setItem('tenantId', tenantId)
        localStorage.setItem('tenantName', tenantName)
      }

      // Atualiza o estado global do React
      setUser(userData)
      return userData
      
    } catch (err) {
      console.error("Erro detalhado no login:", err)
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'E-mail ou senha incorretos'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // 3. Função de Registro / Master Setup (Criação do Ateliê e Admin)
  const register = async (name, email, password, ateliereName) => {
    setError(null)
    try {
      /**
       * IMPORTANTE: Para o Master Setup inicial do SaaS, batemos na rota /setup
       * que criamos no main.ts, enviando o nome do Ateliê.
       */
      const response = await api.post('/setup', { 
        name, 
        email, 
        password, 
        ateliereName 
      })
      
      // O backend do setup retorna o usuário criado e o tenant (ateliê)
      const userData = response.data.user
      const tenantData = response.data.tenant
      
      // Salva os dados iniciais no localStorage
      localStorage.setItem('user', JSON.stringify(userData))
      
      if (tenantData) {
        localStorage.setItem('tenantId', tenantData.id)
        localStorage.setItem('tenantName', tenantData.name)
      }

      // Define o usuário no estado global
      setUser(userData)
      return response.data
      
    } catch (err) {
      console.error("Erro no Master Setup:", err)
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Erro ao realizar configuração inicial do ambiente'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // 4. Função de Logout (Limpa a sessão e desloga)
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

// Hook personalizado para facilitar o uso do contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}