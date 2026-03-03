import { useEffect, useState, useCallback } from 'react'
import { Plus, Truck, Phone, Mail, Trash2, Edit3, Loader2, X } from 'lucide-react'
import api from '../services/api'

export function Fornecedores() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
    category: 'Tecidos'
  })

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/suppliers')
      setSuppliers(res.data.data || [])
    } catch (err) {
      console.error("Erro ao carregar fornecedores:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isEditing) {
        await api.put(`/suppliers/${isEditing}`, formData)
      } else {
        await api.post('/suppliers', formData)
      }
      setShowForm(false)
      setIsEditing(null)
      setFormData({ name: '', cnpj: '', phone: '', email: '', category: 'Tecidos' })
      fetchSuppliers()
    } catch (err) {
      alert("Erro ao salvar fornecedor")
    }
  }

  const handleDelete = async (id, name) => {
    if (window.confirm(`Excluir fornecedor ${name}?`)) {
      try {
        await api.delete(`/suppliers/${id}`)
        fetchSuppliers()
      } catch (err) {
        alert("Erro ao excluir")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-2">
            <Truck className="text-primary-600" /> Fornecedores
          </h1>
          <p className="text-secondary-600">Cadastro de parceiros e fabricantes</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setIsEditing(null); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-all"
        >
          <Plus size={20} /> Novo Fornecedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary-50 text-primary-600 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-colors">
                <Truck size={24}/>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => { setIsEditing(supplier.id); setFormData(supplier); setShowForm(true); }}
                  className="p-1.5 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-all"
                >
                  <Edit3 size={18}/>
                </button>
                <button 
                  onClick={() => handleDelete(supplier.id, supplier.name)}
                  className="p-1.5 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
            <h3 className="font-bold text-lg text-secondary-900">{supplier.name}</h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-secondary-100 text-secondary-500 rounded mb-4 inline-block">
              {supplier.category}
            </span>
            <div className="space-y-2 border-t pt-4 border-secondary-100 mt-2">
              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <Phone size={14} className="text-secondary-400"/> {supplier.phone || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <Mail size={14} className="text-secondary-400"/> {supplier.email || 'N/A'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
              <h2 className="text-xl font-bold text-secondary-900">{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <button onClick={() => setShowForm(false)} className="text-secondary-400 hover:text-secondary-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase">Nome / Razão Social</label>
                <input 
                  required type="text" value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Tecidos Imperial LTDA"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary-500 uppercase">Categoria</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2.5 border border-secondary-200 rounded-lg outline-none bg-white"
                  >
                    <option value="Tecidos">Tecidos</option>
                    <option value="Acessórios">Acessórios</option>
                    <option value="Serviços">Serviços</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary-500 uppercase">Telefone</label>
                  <input 
                    type="text" value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-2.5 border border-secondary-200 rounded-lg outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-secondary-200 text-secondary-600 rounded-xl font-semibold">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200">Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}