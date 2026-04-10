import { useState } from 'react'
import { Building, User, Mail, Lock, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../services/api'

export function MasterSetup() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    tenantName: '',
    adminName: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/admin/onboarding', formData, {
        baseURL: import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000',
        headers: {
          'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET
        }
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar ambiente')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center space-y-6 max-w-sm animate-fadeIn border border-white/20">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-secondary-900">Ambiente Criado!</h2>
          <p className="text-secondary-600 font-medium">O ateliê <strong>{formData.tenantName}</strong> foi configurado com sucesso.</p>
          <button
            onClick={() => { setSuccess(false); setFormData({ tenantName: '', adminName: '', email: '', password: '' }) }}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
          >
            Criar Outro Ateliê
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6 border border-white/20 animate-fadeIn">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white tracking-tighter">M</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Master Setup</h1>
          <p className="text-secondary-500 font-medium">Configuração de Novo Ambiente</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 animate-slideIn">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <Building className="absolute left-3 top-3.5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input
              placeholder="Nome do Ateliê"
              value={formData.tenantName}
              className="w-full pl-10 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              onChange={(e) => setFormData({...formData, tenantName: e.target.value})}
              required
            />
          </div>

          <div className="relative group">
            <User className="absolute left-3 top-3.5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input
              placeholder="Nome do Administrador"
              value={formData.adminName}
              className="w-full pl-10 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              onChange={(e) => setFormData({...formData, adminName: e.target.value})}
              required
            />
          </div>

          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input
              type="email"
              placeholder="E-mail do Administrador"
              value={formData.email}
              className="w-full pl-10 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input
              type="password"
              placeholder="Senha de Acesso"
              value={formData.password}
              className="w-full pl-10 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-700 to-primary-900 text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : 'CRIAR AMBIENTE AGORA'}
          </button>
        </form>
      </div>
    </div>
  )
}