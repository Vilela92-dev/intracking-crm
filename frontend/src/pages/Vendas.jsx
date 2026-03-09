import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, ShoppingCart, Receipt, Loader2, X, Scissors, Download } from 'lucide-react'
import api from '../services/api'

export function Vendas() {
  const [sales, setSales] = useState([])         
  const [customers, setCustomers] = useState([]) 
  const [products, setProducts] = useState([])   
  const [approvedQuotes, setApprovedQuotes] = useState([]) 
  const [loading, setLoading] = useState(true)   
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) 
  const [isSobMedida, setIsSobMedida] = useState(false)

  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 1, price: 0 }],
    paymentMethod: 'CASH',
    totalValue: 0,
    valorEntrada: 0,
    numParcelas: 1,
    notes: '',
    quoteId: null 
  })

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [salesRes, customersRes, productsRes, quotesRes] = await Promise.all([
        api.get('/sales'),
        api.get('/crm/customers'),
        api.get('/products'),
        api.get('/quotes') // Busca todos
      ])
      
      setSales(salesRes.data.data || [])
      setCustomers(customersRes.data.data || [])
      setProducts(productsRes.data.data || [])
      
      // Filtra apenas os APROVADOS que ainda não foram FINALIZADOS
      const quotes = quotesRes.data.data || []
      setApprovedQuotes(quotes.filter(q => q.status === 'APROVADO'))
      
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // CORREÇÃO: Função de importação agora mapeia os campos corretamente
  const handleImportQuote = (quoteId) => {
    if (!quoteId) return
    const quote = approvedQuotes.find(q => q.id === quoteId)
    if (!quote) return

    setFormData(prev => ({
      ...prev,
      customerId: quote.customerId || '',
      items: quote.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      totalValue: quote.totalValue || 0,
      quoteId: quote.id,
      notes: `Importado do Orçamento #${quote.id.substring(0,5)}`
    }))
    setIsSobMedida(true)
  }

  const handleAddItem = () => {
    setFormData({ ...formData, items: [...formData.items, { productId: '', quantity: 1, price: 0 }] })
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
      if (product) newItems[index].price = product.price || 0
    }
    
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0)
    setFormData(prev => ({ ...prev, items: newItems, totalValue: newTotal }))
  }

  // CORREÇÃO: Função Delete que chama a rota correta do backend
  const handleDeleteSale = async (id) => {
    if (!confirm('Deseja realmente excluir esta venda? Isso não estornará o estoque automaticamente.')) return
    try {
      await api.delete(`/sales/${id}`)
      setSales(sales.filter(s => s.id !== id))
    } catch (error) {
      alert('Erro ao excluir venda.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.customerId || formData.items.length === 0) return alert('Dados incompletos.')

    try {
      setIsSubmitting(true)
      const customer = customers.find(c => c.id === formData.customerId)
      
      const payload = {
        ...formData,
        customerName: customer?.name || "Cliente não identificado",
        createdAt: new Date()
      }

      await api.post('/sales', payload)
      
      setShowForm(false)
      setIsSobMedida(false)
      setFormData({ customerId: '', items: [{ productId: '', quantity: 1, price: 0 }], totalValue: 0, valorEntrada: 0, numParcelas: 1, notes: '', quoteId: null })
      fetchData()
      alert('Venda realizada com sucesso!')
    } catch (error) {
      alert('Erro ao salvar venda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return products // Removido filtro restritivo para facilitar teste, mude conforme necessidade
  }, [products]);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
            <ShoppingCart className="text-primary-600" /> Vendas e Pedidos
          </h1>
          <p className="text-secondary-500 text-sm font-medium">Gerencie vendas e peças sob medida</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg font-black text-xs uppercase">
          <Plus size={20} /> Nova Venda
        </button>
      </div>

      {/* TABELA DE VENDAS */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-secondary-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-secondary-50/50 border-b border-secondary-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase">Data</th>
              <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase text-right">Total</th>
              <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-50">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-secondary-50/50 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-secondary-900">{sale.customerName}</span>
                        {sale.quoteId && <span className="text-[9px] text-primary-500 font-black flex items-center gap-1 uppercase"><Scissors size={10}/> Projeto Sob Medida</span>}
                    </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-secondary-400">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 text-right font-black text-secondary-900">{formatCurrency(sale.totalValue)}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-secondary-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-8 border-b border-secondary-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                <Receipt className="text-primary-600" /> Registrar Pedido
              </h2>
              <button onClick={() => setShowForm(false)} className="text-secondary-400 hover:text-secondary-600 bg-secondary-50 p-2 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${isSobMedida ? 'border-primary-600 bg-primary-50' : 'border-secondary-100 bg-secondary-50'}`} 
                  onClick={() => setIsSobMedida(!isSobMedida)}
                >
                  <Scissors className={isSobMedida ? 'text-primary-600' : 'text-secondary-400'} size={20} />
                  <div>
                    <p className="font-black text-[10px] uppercase tracking-widest text-secondary-900">Sob Medida</p>
                    <p className="text-[10px] text-secondary-400 font-bold">Peça exclusiva</p>
                  </div>
                </div>

                {isSobMedida && (
                  <div className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 flex items-center gap-3">
                    <Download className="text-amber-600" size={20} />
                    <select 
                      className="bg-transparent text-[10px] font-black uppercase outline-none w-full"
                      onChange={(e) => handleImportQuote(e.target.value)}
                      value={formData.quoteId || ''}
                    >
                      <option value="">Importar Orçamento...</option>
                      {approvedQuotes.map(q => <option key={q.id} value={q.id}>{q.customerName} - {formatCurrency(q.totalValue)}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-secondary-400 uppercase mb-2 ml-1">Cliente</label>
                <select required className="w-full px-4 py-3 bg-secondary-50 border-none rounded-xl font-bold text-sm" value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}>
                  <option value="">Selecione a cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Itens</label>
                    <button type="button" onClick={handleAddItem} className="text-primary-600 text-[10px] font-black hover:underline">+ ADD ITEM</button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center bg-secondary-50 p-3 rounded-xl border border-secondary-100">
                    <select required className="flex-1 bg-transparent text-xs font-bold outline-none" value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)}>
                      <option value="">Buscar produto...</option>
                      {filteredProducts.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                    <input type="number" className="w-12 bg-white rounded-lg p-1 text-center text-xs font-bold" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} />
                    <input type="number" className="w-20 bg-white rounded-lg p-1 text-right text-xs font-bold" value={item.price} onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))} />
                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 p-6 bg-secondary-900 rounded-[2rem] text-white shadow-xl">
                <div>
                  <label className="block text-[9px] uppercase opacity-50 mb-1 font-black tracking-widest">Preço Final</label>
                  <input type="number" className="bg-transparent border-b border-secondary-700 w-full text-lg font-black outline-none" value={formData.totalValue} onChange={(e) => setFormData({...formData, totalValue: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[9px] uppercase opacity-50 mb-1 font-black tracking-widest">Entrada</label>
                  <input type="number" className="bg-transparent border-b border-secondary-700 w-full text-lg font-black text-emerald-400 outline-none" value={formData.valorEntrada} onChange={(e) => setFormData({...formData, valorEntrada: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[9px] uppercase opacity-50 mb-1 font-black tracking-widest">Parcelas</label>
                  <select className="bg-transparent border-b border-secondary-700 w-full text-lg font-black outline-none" value={formData.numParcelas} onChange={(e) => setFormData({...formData, numParcelas: Number(e.target.value)})}>
                    {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n} className="text-black">{n}x</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-primary-700 shadow-xl flex items-center justify-center gap-2 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'CONFIRMAR VENDA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}