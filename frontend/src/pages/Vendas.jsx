import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import api from '../services/api'

export function Vendas() {
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 1, price: 0 }],
    paymentMethod: 'CASH',
    installments: 1,
    installmentValue: 0,
    notes: '',
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [salesRes, customersRes, productsRes] = await Promise.all([
        api.get('/api/v1/sales'),
        api.get('/api/v1/crm/customers'),
        api.get('/api/v1/products'),
      ])
      setSales(salesRes.data.data || [])
      setCustomers(customersRes.data.data || [])
      setProducts(productsRes.data.data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const handleAddItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { productId: '', quantity: 1, price: 0 }] }))
  }

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    if (field === 'productId') {
      const selectedProd = products.find(p => p.id === value)
      if (selectedProd) newItems[index].price = selectedProd.price
    }
    setFormData({ ...formData, items: newItems })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/sales', formData)
      setShowForm(false)
      fetchData()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Nova Venda
        </button>
      </div>

      {showForm && (
        <div className="bg-white border p-6 rounded-lg shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select 
                value={formData.customerId} 
                onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                required className="p-2 border rounded-lg"
              >
                <option value="">Selecionar Cliente</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select 
                value={formData.paymentMethod} 
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="p-2 border rounded-lg"
              >
                <option value="CASH">Dinheiro / PIX</option>
                <option value="CREDIT">Cartão de Crédito</option>
                <option value="DEBIT">Débito</option>
              </select>
            </div>

            {/* SEÇÃO DE ITENS / PRODUTOS */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <h3 className="font-semibold text-secondary-700">Produtos / Serviços</h3>
                <button type="button" onClick={handleAddItem} className="text-primary-600 text-sm font-medium">+ Adicionar Item</button>
              </div>
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select 
                    value={item.productId} 
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    className="flex-1 p-2 border rounded-lg"
                  >
                    <option value="">Produto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input 
                    type="number" placeholder="R$" value={item.price} 
                    onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                    className="w-24 p-2 border rounded-lg"
                  />
                  <input 
                    type="number" placeholder="Qtd" value={item.quantity} 
                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                    className="w-16 p-2 border rounded-lg"
                  />
                  {index > 0 && <button type="button" onClick={() => removeItem(index)} className="text-red-500"><Trash2 size={18}/></button>}
                </div>
              ))}
            </div>

            {/* LÓGICA DE PARCELAMENTO */}
            {formData.paymentMethod === 'CREDIT' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary-50 rounded-lg">
                <div>
                  <label className="text-sm block mb-1">Parcelas</label>
                  <input type="number" value={formData.installments} onChange={(e) => setFormData({...formData, installments: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm block mb-1">Valor da Parcela</label>
                  <input type="number" value={formData.installmentValue} onChange={(e) => setFormData({...formData, installmentValue: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-primary-600 text-white p-2 rounded-lg">Salvar Venda</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-secondary-200 p-2 rounded-lg">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      {/* Tabela de Vendas (Manter a que você já tem no arquivo original) */}
    </div>
  )
}