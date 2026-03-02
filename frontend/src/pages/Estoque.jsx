import { useEffect, useState, useCallback } from 'react'
import { Plus, Package, Ruler, Scissors, Loader2 } from 'lucide-react'
import api from '../services/api'

export function Estoque() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '', price: '', stock: '', minStock: '0', category: 'PEÇA', largura: '', tamanho: ''
  })

  // Usando useCallback para seguir boas práticas
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      // CORREÇÃO: Removido /api/v1 (já está na baseURL)
      const res = await api.get('/products') 
      setProducts(res.data.data || [])
    } catch (err) {
      console.error("Erro ao carregar estoque:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // CORREÇÃO: Removido /api/v1
      await api.post('/products', {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock)
      })
      setShowForm(false)
      setFormData({ name: '', price: '', stock: '', minStock: '0', category: 'PEÇA', largura: '', tamanho: '' })
      fetchProducts()
    } catch (err) {
      alert("Erro ao cadastrar produto. Verifique o console.")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-secondary-900">
            <Scissors className="text-primary-600" /> Gestão de Ateliê
        </h1>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          {showForm ? 'Fechar' : <><Plus size={18} /> Novo Item</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 border border-primary-100 rounded-xl shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Nome do Item</label>
              <input required className="w-full border border-secondary-200 p-2 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Vestido Sereia ou Renda Francesa" />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Categoria</label>
              <select className="w-full border border-secondary-200 p-2 rounded-lg outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="PEÇA">Peça Acabada</option>
                <option value="INSUMO">Insumo (Tecidos)</option>
              </select>
            </div>
            
            {formData.category === 'PEÇA' ? (
              <input placeholder="Tamanho (Ex: 42 ou M)" className="border border-secondary-200 p-2 rounded-lg" value={formData.tamanho} onChange={e => setFormData({...formData, tamanho: e.target.value})} />
            ) : (
              <input placeholder="Largura (metros)" type="number" step="0.01" className="border border-secondary-200 p-2 rounded-lg" value={formData.largura} onChange={e => setFormData({...formData, largura: e.target.value})} />
            )}

            <input type="number" step="0.01" placeholder="Preço R$" className="border border-secondary-200 p-2 rounded-lg" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            <input type="number" placeholder="Estoque Inicial" className="border border-secondary-200 p-2 rounded-lg" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required />
          </div>
          <button className="w-full bg-primary-600 text-white p-3 rounded-lg font-bold hover:bg-primary-700 transition-colors">Cadastrar no Inventário</button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-white border border-secondary-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${p.category === 'INSUMO' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                  {p.category === 'INSUMO' ? <Ruler className="text-purple-600" /> : <Package className="text-blue-600" />}
                </div>
                <span className="text-[10px] font-black bg-secondary-100 px-2 py-1 rounded text-secondary-500 uppercase">{p.unit}</span>
              </div>
              <h3 className="text-lg font-bold mt-4 text-secondary-900">{p.name}</h3>
              <p className="text-xs text-secondary-400">{p.category === 'PEÇA' ? `Tamanho: ${p.tamanho || 'N/A'}` : `Largura: ${p.largura}m`}</p>
              
              <div className="mt-4 flex justify-between items-end border-t pt-4">
                <div>
                  <p className="text-[10px] text-secondary-400 uppercase font-bold">Preço</p>
                  <p className="text-lg font-bold text-primary-600">R$ {Number(p.price).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-secondary-400 uppercase font-bold">Saldo</p>
                  <p className={`text-xl font-black ${p.stock < 3 ? 'text-red-500' : 'text-green-600'}`}>{p.stock}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}