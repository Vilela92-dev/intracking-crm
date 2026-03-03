import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, ShoppingCart, Receipt, Loader2, X, CreditCard, AlertTriangle } from 'lucide-react'
import api from '../services/api'

export function Vendas() {
  // --- ESTADOS ---
  const [sales, setSales] = useState([])         
  const [customers, setCustomers] = useState([]) 
  const [products, setProducts] = useState([])   
  const [loading, setLoading] = useState(true)   
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) 
  
  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 1, price: 0 }],
    paymentMethod: 'CASH',
    installments: 1,       
    notes: '',
  })

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }

  // --- BUSCA DE DADOS (API) ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [salesRes, customersRes, productsRes] = await Promise.all([
        api.get('/sales'),
        api.get('/crm/customers'),
        api.get('/products')
      ])
      
      setSales(salesRes.data.data || salesRes.data || [])
      setCustomers(customersRes.data.data || customersRes.data || [])
      setProducts(productsRes.data.data || productsRes.data || [])
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- LÓGICA DO FORMULÁRIO ---
  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, price: 0 }]
    })
  }

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value

    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].price = product.price || 0
      }
    }
    
    setFormData({ ...formData, items: newItems })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  }

  // --- SUBMISSÃO CORRIGIDA PARA O SERVER.JS ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.customerId || formData.items.some(i => !i.productId)) {
      alert('Por favor, selecione o cliente e os produtos.')
      return
    }

    try {
      setIsSubmitting(true)
      const customer = customers.find(c => c.id === formData.customerId)
      
      // Mapeamento de nomes para bater com o Backend (server.js)
      const payload = {
        customerId: formData.customerId,
        customerName: customer?.name || 'Cliente Desconhecido',
        items: formData.items,
        paymentMethod: formData.paymentMethod,
        totalValue: calculateTotal(), // Nome esperado pelo server
        numParcelas: formData.paymentMethod === 'CREDIT' ? formData.installments : 0, // Nome esperado pelo server
        notes: formData.notes,
        createdAt: new Date().toISOString()
      }

      await api.post('/sales', payload)
      
      setShowForm(false)
      setFormData({
        customerId: '',
        items: [{ productId: '', quantity: 1, price: 0 }],
        paymentMethod: 'CASH',
        installments: 1,
        notes: '',
      })
      await fetchData() 
      alert('Venda registada com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      alert('Erro ao processar venda. Verifique a consola.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id, name, total) => {
    if (window.confirm(`Deseja cancelar a venda de ${name}?`)) {
      try {
        await api.delete(`/sales/${id}`)
        fetchData()
      } catch (error) {
        console.error('Erro ao eliminar:', error)
      }
    }
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={40} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
            <ShoppingCart className="text-primary-600" /> Vendas e Pedidos
          </h1>
          <p className="text-secondary-500 text-sm">Gerencie as vendas e baixas de estoque do ateliê</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-all shadow-sm"
        >
          <Plus size={20} /> Nova Venda
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-secondary-50 border-b border-secondary-200">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-secondary-700">Cliente</th>
              <th className="px-6 py-4 text-sm font-bold text-secondary-700">Data</th>
              <th className="px-6 py-4 text-sm font-bold text-secondary-700">Pagamento</th>
              <th className="px-6 py-4 text-sm font-bold text-secondary-700 text-right">Total</th>
              <th className="px-6 py-4 text-sm font-bold text-secondary-700 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-secondary-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-secondary-900">{sale.customerName}</td>
                <td className="px-6 py-4 text-sm text-secondary-500">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-secondary-100 text-secondary-600 rounded text-[10px] font-bold uppercase">
                    {sale.paymentMethod === 'CREDIT' ? `${sale.numParcelas || sale.installments}x Cartão` : sale.paymentMethod}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-primary-600">{formatCurrency(sale.totalValue || sale.total)}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => handleDelete(sale.id, sale.customerName, sale.totalValue)} className="p-2 text-secondary-400 hover:text-red-600 rounded-lg transition-all">
                    <Trash2 size={18}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
              <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2"><Receipt className="text-primary-600" /> Novo Pedido</h2>
              <button onClick={() => setShowForm(false)} className="text-secondary-400 hover:text-secondary-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-secondary-700 mb-2">Cliente</label>
                <select required className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl bg-white" value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}>
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-secondary-700">Produtos</label>
                  <button type="button" onClick={handleAddItem} className="text-primary-600 text-sm font-bold">+ Adicionar Item</button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end bg-secondary-50 p-3 rounded-xl">
                    <div className="col-span-6">
                      <select required className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)}>
                        <option value="">Selecione...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="1" className="w-full px-3 py-2 border rounded-lg text-sm" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))} />
                    </div>
                    <div className="col-span-3">
                      <input type="number" step="0.01" className="w-full px-3 py-2 border rounded-lg text-sm" value={item.price} onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => handleRemoveItem(index)} className="text-secondary-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-secondary-700 mb-2">Pagamento</label>
                  <select className="w-full px-4 py-2 border rounded-xl bg-white" value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}>
                    <option value="CASH">Dinheiro / PIX</option>
                    <option value="CREDIT">Cartão de Crédito</option>
                  </select>
                </div>
                {formData.paymentMethod === 'CREDIT' && (
                  <div>
                    <label className="block text-sm font-bold text-secondary-700 mb-2">Parcelas</label>
                    <select className="w-full px-4 py-2 border rounded-xl bg-white" value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}>
                      {[1,2,3,4,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-primary-50 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-primary-700 font-bold">Total:</span>
                <span className="text-2xl font-black text-primary-600">{formatCurrency(calculateTotal())}</span>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar Venda'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}