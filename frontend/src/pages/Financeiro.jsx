import { useEffect, useState, useCallback, useMemo } from 'react'
import { 
  Landmark, Calendar, AlertCircle, CheckCircle2, Loader2, TrendingUp, 
  TrendingDown, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, 
  Banknote, Plus, X, Tag
} from 'lucide-react'
import api from '../services/api'

// Configuração de Categorias focada em Despesas do Ateliê
const CATEGORIES = [
  { id: 'FIXA', label: 'Custo Fixo (Aluguel/Luz/Água)', color: 'bg-purple-100 text-purple-700' },
  { id: 'OPERACIONAL', label: 'Operacional (Materiais/Insumos)', color: 'bg-blue-100 text-blue-700' },
  { id: 'MARKETING', label: 'Marketing e Divulgação', color: 'bg-pink-100 text-pink-700' },
  { id: 'PESSOAL', label: 'Pró-labore e Equipe', color: 'bg-amber-100 text-amber-700' },
  { id: 'OUTROS', label: 'Outras Despesas', color: 'bg-secondary-100 text-secondary-700' },
]

export function Financeiro() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  
  // Estado do Formulário: Fixo como 'despesa' para evitar redundância com Vendas
  const [formData, setFormData] = useState({
    description: '', 
    value: '', 
    type: 'despesa', 
    category: 'FIXA', 
    dueDate: new Date().toISOString().split('T')[0], 
    status: 'PENDENTE'
  })

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/finance/bills')
      const data = res.data.data || res.data || []
      setBills(data)
    } catch (err) {
      console.error("Erro ao carregar financeiro:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFinanceData() }, [fetchFinanceData])

  const handlePay = async (id) => {
    try {
      await api.patch(`/finance/bills/${id}/pay`)
      fetchFinanceData()
    } catch (err) {
      alert("Erro ao processar pagamento")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/finance/bills', formData)
      setShowModal(false)
      // Reseta o form para o padrão de despesa
      setFormData({ 
        description: '', value: '', type: 'despesa', category: 'FIXA', 
        dueDate: new Date().toISOString().split('T')[0], status: 'PENDENTE' 
      })
      fetchFinanceData()
    } catch (err) {
      alert("Erro ao salvar despesa")
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  const financeReport = useMemo(() => {
    return bills.reduce((acc, b) => {
      const val = parseFloat(b.value) || 0
      if (b.status === 'PAGO') {
        if (b.type === 'receita') acc.caixaReal += val
        else acc.caixaReal -= val
      } else {
        if (b.type === 'receita') acc.aReceber += val
        else acc.aPagar += val
      }
      return acc
    }, { caixaReal: 0, aReceber: 0, aPagar: 0 })
  }, [bills])

  const saldoProjetado = financeReport.caixaReal + financeReport.aReceber - financeReport.aPagar

  const filteredBills = useMemo(() => {
    let list = activeTab === 'all' ? bills : bills.filter(b => b.type === activeTab)
    return list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  }, [bills, activeTab])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-2">
            <Landmark className="text-indigo-600" /> Gestão Financeira
          </h1>
          <p className="text-secondary-600">Acompanhe suas receitas de vendas e controle seus gastos fixos.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-600 shadow-lg shadow-red-100 transition-all"
        >
          <Plus size={18}/> Nova Despesa
        </button>
      </div>

      {/* DASHBOARD DE FLUXO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-100 text-white">
          <div className="flex justify-between items-start mb-2 opacity-80">
            <p className="text-xs font-bold uppercase tracking-wider">Saldo Atual</p>
            <Banknote size={20} />
          </div>
          <h2 className="text-2xl font-black">{formatCurrency(financeReport.caixaReal)}</h2>
          <p className="text-[10px] mt-2 opacity-70 italic">* Dinheiro líquido disponível</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-secondary-500 uppercase">A Receber (Vendas)</p>
            <ArrowUpCircle className="text-emerald-500" size={20} />
          </div>
          <h2 className="text-2xl font-black text-emerald-600">{formatCurrency(financeReport.aReceber)}</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-secondary-500 uppercase">A Pagar (Despesas)</p>
            <ArrowDownCircle className="text-red-500" size={20} />
          </div>
          <h2 className="text-2xl font-black text-red-600">{formatCurrency(financeReport.aPagar)}</h2>
        </div>

        <div className="bg-secondary-50 p-6 rounded-2xl border border-secondary-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-secondary-500 uppercase">Saldo Projetado</p>
            <Wallet className="text-secondary-400" size={20} />
          </div>
          <h2 className={`text-2xl font-black ${saldoProjetado >= 0 ? 'text-secondary-900' : 'text-orange-600'}`}>
            {formatCurrency(saldoProjetado)}
          </h2>
        </div>
      </div>

      {/* ABAS DE FILTRO */}
      <div className="flex border-b border-secondary-200 gap-8">
        {[
          { id: 'all', label: 'Visão Geral', icon: <Landmark size={18}/> },
          { id: 'receita', label: 'Receitas (Vendas)', icon: <TrendingUp size={18}/> },
          { id: 'despesa', label: 'Despesas (Saídas)', icon: <TrendingDown size={18}/> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === tab.id 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-secondary-500 hover:text-secondary-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* LISTAGEM FINANCEIRA */}
      <div className="bg-white border border-secondary-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary-50 border-b border-secondary-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-secondary-500 uppercase">Data</th>
                  <th className="px-6 py-4 font-bold text-secondary-500 uppercase">Descrição</th>
                  <th className="px-6 py-4 font-bold text-secondary-500 uppercase">Categoria</th>
                  <th className="px-6 py-4 font-bold text-secondary-500 uppercase text-right">Valor</th>
                  <th className="px-6 py-4 font-bold text-secondary-500 uppercase text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredBills.map((bill) => {
                  const catStyle = CATEGORIES.find(c => c.id === bill.category) || { color: 'bg-secondary-100 text-secondary-600', label: 'Venda/Serviço' }
                  return (
                    <tr key={bill.id} className={`hover:bg-secondary-50 transition-colors ${bill.status === 'PAGO' ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 font-medium text-secondary-900">
                        {new Date(bill.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-secondary-800">{bill.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${catStyle.color}`}>
                          {bill.category || 'SERVIÇO'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-black ${bill.type === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {bill.type === 'receita' ? '+ ' : '- '} {formatCurrency(bill.value)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {bill.status === 'PENDENTE' ? (
                            <button 
                              onClick={() => handlePay(bill.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-secondary-600 border border-secondary-200 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                            >
                              <CheckCircle2 size={14}/> Baixar
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase bg-emerald-50 px-2 py-1 rounded-md">
                              PAGO
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: APENAS NOVA DESPESA */}
      {showModal && (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 flex justify-between items-center border-b bg-red-50/30">
              <div>
                <h2 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                  <TrendingDown className="text-red-500" /> Lançar Despesa
                </h2>
                <p className="text-xs text-secondary-500 font-medium uppercase tracking-widest">Saída de Caixa Manual</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary-100 rounded-full transition-all"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">O que você pagou?</label>
                <input required autoFocus className="w-full p-4 border rounded-2xl outline-none focus:border-red-500 transition-all text-sm font-medium" 
                  placeholder="Ex: Aluguel Ateliê Março, Internet, Luz..." value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Valor (R$)</label>
                  <input required type="number" step="0.01" className="w-full p-4 border rounded-2xl outline-none text-sm font-bold text-red-600" 
                    placeholder="0,00" value={formData.value} 
                    onChange={e => setFormData({...formData, value: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Data de Vencimento</label>
                  <input required type="date" className="w-full p-4 border rounded-2xl outline-none text-sm font-medium" 
                    value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Categoria da Conta</label>
                <select 
                  className="w-full p-4 border rounded-2xl outline-none bg-white text-sm font-medium focus:border-red-500"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                </select>
              </div>

              <div className="bg-secondary-50 p-4 rounded-2xl flex items-center gap-3 border border-dashed border-secondary-200">
                <input 
                  type="checkbox" 
                  id="paid" 
                  className="w-5 h-5 rounded border-secondary-300 text-red-600 focus:ring-red-500"
                  checked={formData.status === 'PAGO'}
                  onChange={e => setFormData({...formData, status: e.target.checked ? 'PAGO' : 'PENDENTE'})}
                />
                <label htmlFor="paid" className="text-xs font-bold text-secondary-700 cursor-pointer">Marcar como pago (Liquidado hoje)</label>
              </div>

              <button className="w-full py-5 mt-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-600 transition-all transform hover:-translate-y-1">
                Salvar Despesa no Caixa
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}