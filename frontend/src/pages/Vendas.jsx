import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, ShoppingCart, Receipt, Loader2, X, CreditCard } from 'lucide-react'
import api from '../services/api'

export function Vendas() {
  // --- ESTADOS ---
  const [sales, setSales] = useState([])         
  const [customers, setCustomers] = useState([]) 
  const [products, setProducts] = useState([])   
  const [loading, setLoading] = useState(true)   
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) 
  
  // O formData guarda o que estamos digitando no momento
  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 1, price: 0 }],
    paymentMethod: 'CASH',
    installments: 1,       
    notes: '',
  })

  // Transforma 1000 em R$ 1.000,00
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
        api.get('/products'),
      ])
      
      setSales(salesRes.data.data || [])
      setCustomers(customersRes.data.data || [])
      setProducts(productsRes.data.data || [])
    } catch (err) { 
      console.error("Erro ao buscar dados:", err) 
    } finally { 
      setLoading(false) 
    }
  }, [])

  useEffect(() => { 
    fetchData() 
  }, [fetchData])

  // --- LÓGICA DO FORMULÁRIO ---

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    if (field === 'productId') {
      const selectedProd = products.find(p => p.id === value)
      newItems[index] = {
        ...newItems[index],
        productId: value,
        price: selectedProd ? selectedProd.price : 0
      }
    } else {
      newItems[index][field] = value
    }
    setFormData({ ...formData, items: newItems })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, price: 0 }]
    })
  }

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.customerId) return alert("Selecione um cliente!")
    
    try {
      setIsSubmitting(true)
      const total = calculateTotal()
      const customer = customers.find(c => c.id === formData.customerId)
      
      const payload = {
        ...formData,
        total,
        customerName: customer?.name || 'Cliente',
        createdAt: new Date()
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
      fetchData() 
      alert("Venda realizada com sucesso!")
    } catch (err) { 
      alert("Erro ao finalizar venda.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-2">
            <ShoppingCart className="text-primary-600" /> Vendas e Pedidos
          </h1>
          <p className="text-secondary-600">Gestão de saídas e baixa automática de estoque</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            showForm ? 'bg-secondary-100 text-secondary-600' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md'
          }`}
        >
          {showForm ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Nova Venda</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-primary-100 p-6 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SELECT CLIENTE */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase">Cliente</label>
                <select 
                  value={formData.customerId} 
                  onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  required className="w-full p-2.5 border border-secondary-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecione o Cliente</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* SELECT PAGAMENTO */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase">Forma de Pagamento</label>
                <select 
                  value={formData.paymentMethod} 
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value, installments: 1})}
                  className="w-full p-2.5 border border-secondary-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="CASH">Dinheiro / PIX</option>
                  <option value="CREDIT">Cartão de Crédito</option>
                  <option value="DEBIT">Cartão de Débito</option>
                  <option value="TRANSFER">Transferência</option>
                </select>
              </div>

              {/* SELECT PARCELAS (Só aparece se for crédito) */}
              {formData.paymentMethod === 'CREDIT' && (
                <div className="space-y-1 animate-in zoom-in duration-200">
                  <label className="text-xs font-bold text-primary-600 uppercase flex items-center gap-1">
                    <CreditCard size={12} /> Parcelamento
                  </label>
                  <select 
                    value={formData.installments} 
                    onChange={(e) => setFormData({...formData, installments: Number(e.target.value)})}
                    className="w-full p-2.5 border border-primary-300 bg-primary-50 rounded-lg outline-none font-bold text-primary-700"
                  >
                    {[1,2,3,4,5,6,10,12].map(n => (
                      <option key={n} value={n}>
                        {n}x de {formatCurrency(calculateTotal() / n)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* LISTA DE PRODUTOS NO FORMULÁRIO */}
            <div className="space-y-3 bg-secondary-50 p-4 rounded-xl border border-secondary-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-secondary-700 text-sm uppercase">Produtos da Venda</h3>
                <button type="button" onClick={addItem} className="text-xs bg-white border border-primary-200 text-primary-600 px-3 py-1 rounded-full hover:bg-primary-50 transition-colors">
                  + Adicionar Item
                </button>
              </div>
              
              {formData.items.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-2 items-center bg-white p-3 rounded-lg border border-secondary-200 shadow-sm">
                  <select 
                    value={item.productId} 
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    className="flex-1 p-2 bg-transparent outline-none text-sm"
                    required
                  >
                    <option value="">Escolha o Produto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} - Est: {p.stock} {p.unit}
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative">
                       <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-secondary-400">R$</span>
                       <input 
                        type="number" step="0.01" value={item.price} 
                        onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                        className="w-28 pl-7 pr-2 py-2 border rounded-lg text-sm text-right font-medium"
                      />
                    </div>
                    <input 
                      type="number" value={item.quantity} 
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-16 p-2 border rounded-lg text-center text-sm font-bold"
                      min="1"
                    />
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={18}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-end pt-3 border-t border-secondary-200 font-bold text-xl">
                <span className="text-secondary-500 mr-2 text-sm self-center uppercase">Total:</span>
                <span className="text-primary-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><Receipt size={20} /> Finalizar Venda</>}
            </button>
          </form>
        </div>
      )}

      {/* TABELA DE HISTÓRICO */}
      <div className="bg-white border border-secondary-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase text-secondary-500">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-secondary-500">Data</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-secondary-500">Pagamento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-secondary-500 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-secondary-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-secondary-900">{sale.customerName}</td>
                  <td className="px-6 py-4 text-sm text-secondary-500">
                    {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-secondary-100 text-secondary-600 rounded text-[10px] font-bold uppercase">
                      {sale.paymentMethod === 'CREDIT' ? `${sale.installments}x Cartão` : sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-primary-600">
                    {formatCurrency(sale.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}