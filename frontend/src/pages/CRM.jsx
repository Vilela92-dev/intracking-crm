import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Edit2, Loader2, X } from 'lucide-react'
import api from '../services/api'

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  phone: '',
  weddingDate: '',
  leadSource: 'REFERRAL',
  notes: '',
}

export function CRM() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false) // Feedback de envio
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)

  // Memoizando para evitar recriações desnecessárias
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      // O endpoint correto baseado na sua baseURL do api.js
      const response = await api.get('/crm/customers') 
      setCustomers(response.data.data || [])
    } catch (err) {
      console.error('Erro ao buscar clientes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      weddingDate: customer.weddingDate ? customer.weddingDate.split('T')[0] : '',
      leadSource: customer.leadSource || 'REFERRAL',
      notes: customer.notes || '',
    })
    setEditingId(customer.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      await api.delete(`/crm/customers/${id}`)
      fetchCustomers()
    } catch (err) {
      console.error('Erro ao excluir cliente:', err)
      alert('Não foi possível excluir o cliente.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingId) {
        await api.put(`/crm/customers/${editingId}`, formData)
      } else {
        await api.post('/crm/customers', formData)
      }
      
      resetForm()
      fetchCustomers()
    } catch (err) {
      console.error('Erro ao salvar cliente:', err)
      alert('Erro ao salvar dados. Verifique a conexão com o servidor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE)
    setEditingId(null)
    setShowForm(false)
  }

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Gestão de Clientes</h1>
          <p className="text-secondary-600 mt-1">Acompanhe noivas e interessados</p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
            showForm ? 'bg-secondary-100 text-secondary-700' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md'
          }`}
        >
          {showForm ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Novo Cliente</>}
        </button>
      </div>

      {/* Barra de Busca Otimizada */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Pesquisar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm"
        />
      </div>

      {showForm && (
        <div className="bg-white border border-primary-100 rounded-xl p-6 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-secondary-900 border-b pb-2">
            {editingId ? '📝 Atualizar Cadastro' : '✨ Novo Cadastro'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary-500 uppercase">Nome Completo</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Ex: Maria Oliveira" />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary-500 uppercase">E-mail</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="exemplo@email.com" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary-500 uppercase">WhatsApp / Telefone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="(00) 00000-0000" />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary-500 uppercase">Data do Casamento</label>
              <input type="date" name="weddingDate" value={formData.weddingDate} onChange={handleChange} className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary-500 uppercase">Origem (Onde nos conheceu?)</label>
              <select name="leadSource" value={formData.leadSource} onChange={handleChange} className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="REFERRAL">Indicação</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="GOOGLE">Google</option>
                <option value="WALK_IN">Presencial</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-secondary-500 uppercase">Observações Importantes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none h-24 resize-none" placeholder="Preferências, estilo de vestido, orçamentos passados..." />
            </div>
            
            <div className="flex gap-3 md:col-span-2 pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (editingId ? 'Salvar Alterações' : 'Confirmar Cadastro')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listagem de Clientes */}
      <div className="bg-white border border-secondary-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary-600" size={40} />
            <p className="text-secondary-500 font-medium">Carregando base de clientes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-secondary-500">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-secondary-500">Contato</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-secondary-500">Casamento</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-secondary-500 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-secondary-900">{customer.name}</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary-100 text-secondary-600 mt-1">
                        {customer.leadSource}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-secondary-700">{customer.email}</div>
                      <div className="text-xs text-secondary-500">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-secondary-700">
                      {customer.weddingDate ? (
                        new Date(customer.weddingDate + 'T12:00:00').toLocaleDateString('pt-BR')
                      ) : (
                        <span className="text-secondary-300 italic">Não agendado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(customer)} 
                          className="p-2 text-primary-600 hover:bg-primary-100 rounded-full transition-colors"
                          title="Editar cadastro"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)} 
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Remover cliente"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      <p className="text-secondary-400 italic">Nenhum cliente encontrado para sua busca.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}