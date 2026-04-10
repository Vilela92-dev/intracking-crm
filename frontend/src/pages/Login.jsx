import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, AlertCircle, Loader } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const { login, error: authError } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Ajustado para os dados que você usou no teste do Heroku
  const [formData, setFormData] = useState({
    email: '', 
    password: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // O AuthContext cuidará da chamada ao axios e localStorage
      await login(formData.email, formData.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md animate-fadeIn">
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 border border-white/20">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">I</span>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Intracking CRM</h1>
            <p className="text-secondary-500 font-medium">Gestão de Ateliê & Vestidos</p>
          </div>

          {/* Mensagens de Erro */}
          {(error || authError) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 animate-slideIn">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-red-800 text-sm font-medium">{error || authError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-1.5 ml-1">
                E-mail
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-1.5 ml-1">
                Senha
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-700 to-primary-900 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-xs text-secondary-400 font-medium">
              © 2026 Intracking CRM. Acesso restrito.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}