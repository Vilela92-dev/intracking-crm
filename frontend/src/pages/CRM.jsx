import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Edit2 } from 'lucide-react'
import api from '../services/api'

export function CRM() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null) // Novo estado para edição
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    weddingDate: '',
    leadSource: 'REFERRAL',
    notes: '',
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/crm/customers')
      setCustomers(response.data.data || [])
    } catch (err) {
      console.error('Erro ao buscar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Função para carregar dados no formulário para edição
  const handleEdit = (customer) => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      weddingDate: customer.weddingDate ? customer.weddingDate.split('T')[0] : '',
      leadSource: customer.leadSource || 'REFERRAL',
      notes: customer.notes || '',
    })
    setEditingId(customer.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        // Rota de atualização (PUT)
        await api.put(`/api/v1/crm/customers/${editingId}`, formData)
      } else {
        await api.post('/api/v1/crm/customers', formData)
      }
      
      setFormData({
        name: '', email: '', phone: '', weddingDate: '',
        leadSource: 'REFERRAL', notes: '',
      })
      setEditingId(null)
      setShowForm(false)
      fetchCustomers()
    } catch (err) {
      console.error('Erro ao salvar cliente:', err)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Clientes</h1>
          <p className="text-secondary-600 mt-1">Gerencie seus clientes e datas de casamento</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-secondary-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-bold text-secondary-900">
            {editingId ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="name" placeholder="Nome" value={formData.name} onChange={handleChange} required className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input type="tel" name="phone" placeholder="Telefone" value={formData.phone} onChange={handleChange} className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            
            <div className="flex flex-col">
              <label className="text-xs text-secondary-500 ml-1 mb-1">Data do Casamento</label>
              <input type="date" name="weddingDate" value={formData.weddingDate} onChange={handleChange} className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            <select name="leadSource" value={formData.leadSource} onChange={handleChange} className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="REFERRAL">Indicação</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="GOOGLE">Google</option>
              <option value="WALK_IN">Presencial</option>
              <option value="OTHER">Outro</option>
            </select>
            <textarea name="notes" placeholder="Notas" value={formData.notes} onChange={handleChange} className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 md:col-span-2" />
            
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Salvar</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 bg-secondary-200 text-secondary-900 px-4 py-2 rounded-lg">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Table - Incluindo botão de editar funcional */}
      <div className="bg-white border border-secondary-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary-50 border-b border-secondary-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Data Casamento</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="border-b hover:bg-secondary-50">
                <td className="px-6 py-4 text-sm">{customer.name}</td>
                <td className="px-6 py-4 text-sm">{customer.weddingDate ? new Date(customer.weddingDate).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-6 py-4 text-sm flex justify-center gap-2">
                  <button onClick={() => handleEdit(customer)} className="text-primary-600 hover:text-primary-700">
                    <Edit2 size={16} />
                  </button>
                  <button className="text-red-600 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}