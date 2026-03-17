import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, ShoppingCart, Receipt, Loader2, X, Scissors, Download, Calculator } from 'lucide-react'
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

  // ESTADO PARA AS PARCELAS EDITÁVEIS
  const [listaParcelas, setListaParcelas] = useState([])

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

  // LÓGICA DA CALCULADORA (IGUAL AO ALUGUEL)
  useEffect(() => {
    const saldo = Number(formData.totalValue) - Number(formData.valorEntrada);
    const n = parseInt(formData.numParcelas);

    if (saldo > 0) {
      const valorCada = (saldo / n).toFixed(2);
      
      setListaParcelas(prev => {
        const novasParcelas = [];
        for (let i = 1; i <= n; i++) {
          const parcelaExistente = prev.find(p => p.numero === i);
          let dataVencimento = parcelaExistente?.vencimento;

          if (!dataVencimento) {
            const data = new Date();
            data.setMonth(data.getMonth() + i);
            dataVencimento = data.toISOString().split('T')[0];
          }

          novasParcelas.push({
            numero: i,
            valor: parseFloat(valorCada),
            vencimento: dataVencimento
          });
        }
        return novasParcelas;
      });
    } else {
      setListaParcelas([]);
    }
  }, [formData.totalValue, formData.valorEntrada, formData.numParcelas]);

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
        api.get('/quotes')
      ])
      
      setSales(salesRes.data.data || [])
      setCustomers(customersRes.data.data || [])
      setProducts(productsRes.data.data || [])
      
      const quotes = quotesRes.data.data || []
      // Filtra apenas orçamentos aprovados que ainda não viraram venda
      const filtered = quotes.filter(q => 
        q.status?.toUpperCase() === 'APROVADO' && q.isConverted !== true
      )
      setApprovedQuotes(filtered)
      
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleImportQuote = (quoteId) => {
    if (!quoteId) return
    const quote = approvedQuotes.find(q => q.id === quoteId)
    if (!quote) return

    setFormData(prev => ({
      ...prev,
      customerId: quote.customerId || '',
      items: quote.items?.map(item => ({
        productId: item.productId || item.id || '',
        quantity: item.quantity || 1,
        price: item.price || 0
      })) || [{ productId: '', quantity: 1, price: 0 }],
      totalValue: quote.totalValue || 0,
      quoteId: quote.id,
      notes: `Projeto Sob Medida: Importado do Orçamento #${quote.id.substring(0,5)}`
    }))
    setIsSobMedida(true)
  }

  const handleAddItem = () => {
    setFormData({ ...formData, items: [...formData.items, { productId: '', quantity: 1, price: 0 }] })
  }

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0)
    setFormData({ ...formData, items: newItems, totalValue: newTotal })
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.customerId || formData.items.length === 0) return alert('Selecione o cliente e os itens.')

    try {
      setIsSubmitting(true)
      const customer = customers.find(c => c.id === formData.customerId)
      
      const payload = {
        ...formData,
        customerName: customer?.name || "Cliente",
        parcelasAgendadas: listaParcelas, // CRUCIAL: Envia as parcelas da tabela preta
        createdAt: new Date()
      }

      await api.post('/sales', payload)
      
      setShowForm(false)
      setIsSobMedida(false)
      setFormData({ customerId: '', items: [{ productId: '', quantity: 1, price: 0 }], totalValue: 0, valorEntrada: 0, numParcelas: 1, notes: '', quoteId: null })
      setListaParcelas([])
      fetchData()
      alert('Venda registrada e orçamentos atualizados!')
    } catch (error) {
      alert('Erro ao salvar venda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredProducts = useMemo(() => products, [products]);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary-600" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-sm">
        <div className="text-left">
          <h1 className="text-2xl font-black text-secondary-900 flex items-center gap-2 uppercase italic tracking-tighter">
            <ShoppingCart className="text-primary-600" /> Vendas e Pedidos
          </h1>
          <p className="text-secondary-400 text-[10px] font-black uppercase tracking-widest">Painel de faturamento e projetos</p>
        </div>
        <button onClick={() => { setShowForm(true); setIsSobMedida(false); }} className="bg-primary-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg font-black text-xs uppercase italic">
          <Plus size={20} /> Nova Venda
        </button>
      </div>

      {/* TABELA DE VENDAS */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-secondary-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-secondary-50/50 border-b border-secondary-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Cliente</th>
              <th className="px-8 py-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Data</th>
              <th className="px-8 py-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Total</th>
              <th className="px-8 py-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-50">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-secondary-50/50 transition-colors">
                <td className="px-8 py-5">
                    <div className="flex flex-col">
                        <span className="font-bold text-secondary-900">{sale.customerName}</span>
                        {sale.quoteId && <span className="text-[9px] text-primary-500 font-black flex items-center gap-1 uppercase tracking-tighter mt-1"><Scissors size={10}/> Projeto Sob Medida</span>}
                    </div>
                </td>
                <td className="px-8 py-5 text-xs font-bold text-secondary-400 italic">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-5 text-right font-black text-secondary-900">{formatCurrency(sale.totalValue)}</td>
                <td className="px-8 py-5 text-center">
                  <button onClick={() => api.delete(`/sales/${sale.id}`).then(() => fetchData())} className="p-2 text-secondary-200 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE FORMULÁRIO */}
      {showForm && (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30">
              <h2 className="text-lg font-black text-secondary-900 flex items-center gap-2 uppercase italic tracking-tighter">
                <Receipt className="text-primary-600" /> Registrar Pedido
              </h2>
              <button onClick={() => setShowForm(false)} className="text-secondary-400 hover:text-secondary-600 bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              {/* BOTÃO SOB MEDIDA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${isSobMedida ? 'border-primary-600 bg-primary-50 shadow-inner' : 'border-secondary-100 bg-secondary-50'}`} onClick={() => setIsSobMedida(!isSobMedida)}>
                  <Scissors className={isSobMedida ? 'text-primary-600' : 'text-secondary-400'} size={20} />
                  <div>
                    <p className="font-black text-[9px] uppercase tracking-widest text-secondary-900">Sob Medida</p>
                    <p className="text-[8px] text-secondary-400 font-bold uppercase tracking-tighter">Peça exclusiva</p>
                  </div>
                </div>
                {isSobMedida && (
                  <div className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 flex items-center gap-3 animate-in slide-in-from-top-2">
                    <Download className="text-amber-600" size={20} />
                    <select className="bg-transparent text-[9px] font-black uppercase outline-none w-full cursor-pointer" onChange={(e) => handleImportQuote(e.target.value)} value={formData.quoteId || ''}>
                      <option value="">Importar Orçamento...</option>
                      {approvedQuotes.map(q => <option key={q.id} value={q.id}>{q.customerName} - {formatCurrency(q.totalValue)}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* CLIENTE */}
              <div className="text-left">
                <label className="block text-[9px] font-black text-secondary-400 uppercase mb-1 ml-2 italic tracking-widest">Cliente</label>
                <select required className="w-full px-4 py-3 bg-secondary-50 border-2 border-transparent focus:border-primary-600 rounded-xl font-bold text-sm outline-none transition-all" value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}>
                  <option value="">Selecione a cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* ITENS */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                    <label className="text-[9px] font-black text-secondary-400 uppercase italic tracking-widest">Itens do Pedido</label>
                    <button type="button" onClick={handleAddItem} className="text-primary-600 text-[9px] font-black hover:scale-105 transition-transform uppercase">+ ADD ITEM</button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center bg-secondary-50 p-3 rounded-xl border border-secondary-100 transition-all">
                    <select required className="flex-1 bg-transparent text-xs font-bold outline-none" value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)}>
                      <option value="">Buscar produto...</option>
                      {filteredProducts.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                    <input type="number" placeholder="Qtd" className="w-12 p-2 bg-white rounded-lg text-center text-xs font-black border border-secondary-100 outline-none" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} />
                    <input type="number" placeholder="Preço" className="w-20 p-2 bg-white rounded-lg text-right text-xs font-black border border-secondary-100 outline-none" value={item.price} onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))} />
                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-secondary-300 hover:text-rose-500 p-1"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              {/* ÁREA FINANCEIRA PRETA (IGUAL ALUGUEL) */}
              <div className="mt-6 bg-secondary-900 rounded-[2.5rem] p-6 text-white shadow-2xl space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black text-secondary-500 uppercase block tracking-widest italic">Financeiro</span>
                    <h3 className="text-base font-black italic uppercase">Condições de Pagamento</h3>
                  </div>
                  <Calculator size={20} className="text-primary-400" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary-800 p-3 rounded-2xl border border-secondary-700">
                    <label className="text-[8px] font-black text-secondary-400 uppercase block mb-1">Total Venda</label>
                    <input type="number" className="w-full bg-transparent border-none p-0 outline-none font-black text-sm" value={formData.totalValue} onChange={(e) => setFormData({...formData, totalValue: Number(e.target.value)})} />
                  </div>
                  <div className="bg-secondary-800 p-3 rounded-2xl border border-secondary-700">
                    <label className="text-[8px] font-black text-emerald-400 uppercase block mb-1">Entrada</label>
                    <input type="number" className="w-full bg-transparent border-none p-0 outline-none font-black text-sm text-emerald-400" value={formData.valorEntrada} onChange={(e) => setFormData({...formData, valorEntrada: Number(e.target.value)})} />
                  </div>
                  <div className="bg-secondary-800 p-3 rounded-2xl border border-secondary-700">
                    <label className="text-[8px] font-black text-secondary-400 uppercase block mb-1">Parcelas</label>
                    <select className="w-full bg-transparent border-none p-0 font-black text-sm outline-none cursor-pointer" value={formData.numParcelas} onChange={(e) => setFormData({...formData, numParcelas: Number(e.target.value)})}>
                      {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n} className="text-black">{n}x</option>)}
                    </select>
                  </div>
                </div>

                {/* TABELA DE PARCELAS EDITÁVEIS */}
                {listaParcelas.length > 0 && (
                  <div className="bg-secondary-800/40 rounded-2xl overflow-hidden border border-secondary-700/50">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-secondary-800/80 text-[8px] font-black text-secondary-500 uppercase tracking-wider">
                          <th className="px-4 py-2">Parc.</th>
                          <th className="px-4 py-2">Vencimento</th>
                          <th className="px-4 py-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px]">
                        {listaParcelas.map((p, idx) => (
                          <tr key={idx} className="border-t border-secondary-700/30">
                            <td className="px-4 py-2 font-bold text-secondary-400">{p.numero}ª</td>
                            <td className="px-4 py-2">
                              <input 
                                type="date" 
                                style={{ colorScheme: 'dark' }}
                                className="bg-secondary-700/50 border border-secondary-600 text-primary-400 font-bold outline-none cursor-pointer rounded-lg px-2 py-1 hover:bg-secondary-700 transition-all" 
                                value={p.vencimento} 
                                onChange={(e) => {
                                  const atualizadas = [...listaParcelas];
                                  atualizadas[idx].vencimento = e.target.value;
                                  setListaParcelas(atualizadas);
                                }} 
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-black text-white italic">R$ {p.valor.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'FINALIZAR E GERAR PEDIDO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}