import { useEffect, useState, useCallback, useMemo } from 'react'
import { 
  Landmark, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Scale, Trash2, X, DollarSign
} from 'lucide-react'
import api from '../services/api'

const toDateString = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export function Financeiro() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('month') 
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  
  // Estados para Liquidação
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)
  const [paymentData, setPaymentData] = useState({ paidValue: '', newDueDate: '' })

  const [formData, setFormData] = useState({
    description: '', value: '', type: 'despesa', category: 'FIXA', 
    dueDate: new Date().toISOString().split('T')[0], status: 'PENDENTE'
  })

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/finance/bills')
      const data = res.data.data || res.data || []
      setBills(Array.isArray(data) ? data : [])
    } catch (err) { console.error("Erro ao carregar:", err) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchFinanceData() }, [fetchFinanceData])

  // Abre o modal de pagamento com os dados da conta
  const openPayModal = (bill) => {
    setSelectedBill(bill)
    setPaymentData({ 
      paidValue: bill.value, 
      newDueDate: bill.dueDate.split('T')[0] 
    })
    setShowPayModal(true)
  }

  const handleConfirmPayment = async () => {
    try {
      const paidValueNum = parseFloat(paymentData.paidValue);
      const isPartial = paidValueNum < selectedBill.value;
      
      const payload = {
        paidValue: paidValueNum,
        newDueDate: isPartial ? paymentData.newDueDate : undefined 
      };

      await api.patch(`/finance/bills/${selectedBill.id}/pay`, payload)
      setShowPayModal(false)
      fetchFinanceData()
    } catch (err) {
      alert("Erro ao processar baixa: " + (err.response?.data?.message || "Verifique os valores"))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este lançamento?")) return;
    try {
      await api.delete(`/finance/bills/${id}`)
      await fetchFinanceData()
    } catch (err) { alert("Erro ao excluir registro") }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData, value: Number(formData.value) }
      await api.post('/finance/bills', payload)
      setShowModal(false)
      setFormData({ 
        description: '', value: '', type: 'despesa', category: 'FIXA', 
        dueDate: new Date().toISOString().split('T')[0], status: 'PENDENTE' 
      })
      fetchFinanceData()
    } catch (err) { alert("Erro ao salvar") }
  }

  const navigate = (direction) => {
    const newDate = new Date(referenceDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + direction)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction * 7))
    else newDate.setMonth(newDate.getMonth() + direction)
    setReferenceDate(newDate)
  }

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  // Memoização do relatório para performance
  const report = useMemo(() => {
    const todayStr = toDateString(new Date());
    const refStr = toDateString(referenceDate);

    const startWeek = new Date(referenceDate);
    const day = startWeek.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startWeek.setDate(startWeek.getDate() - diff);
    
    const startMonthStr = `${refStr.substring(0, 7)}-01`;
    const endMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    const endMonthStr = toDateString(endMonth);

    return bills.reduce((acc, b) => {
      const bDateStr = b.dueDate.split('T')[0];
      const val = parseFloat(b.value) || 0;

      if (b.status === 'PAGO') {
        acc.saldoRealTotal += (b.type === 'receita' ? val : -val);
      }

      if (b.status === 'PENDENTE' && bDateStr < todayStr) {
        acc.pendenciasAnteriores += val;
      }

      let isInPeriod = false;
      if (viewMode === 'day') isInPeriod = bDateStr === refStr;
      else if (viewMode === 'week') {
        const endWeek = new Date(startWeek);
        endWeek.setDate(startWeek.getDate() + 6);
        isInPeriod = bDateStr >= toDateString(startWeek) && bDateStr <= toDateString(endWeek);
      }
      else isInPeriod = bDateStr >= startMonthStr && bDateStr <= endMonthStr;

      if (isInPeriod) {
        if (b.type === 'receita') {
          acc.periodoEntrada += val;
          if (b.status === 'PENDENTE') acc.pendenteNoPeriodo += val;
        } else {
          acc.periodoSaida += val;
          if (b.status === 'PENDENTE') acc.pendenteNoPeriodo -= val;
        }
      }

      acc.projeçãoFechamento = acc.saldoRealTotal + acc.pendenteNoPeriodo;
      return acc
    }, { 
      saldoRealTotal: 0, periodoEntrada: 0, periodoSaida: 0, 
      pendenciasAnteriores: 0, pendenteNoPeriodo: 0, projeçãoFechamento: 0 
    })
  }, [bills, referenceDate, viewMode])

  const filteredBills = useMemo(() => {
    const refStr = toDateString(referenceDate);
    return bills.filter(b => {
      const bDateStr = b.dueDate.split('T')[0];
      let isPeriod = false;

      if (viewMode === 'day') isPeriod = bDateStr === refStr;
      else if (viewMode === 'week') {
        const startWeek = new Date(referenceDate);
        const day = startWeek.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startWeek.setDate(startWeek.getDate() - diff);
        const endWeek = new Date(startWeek);
        endWeek.setDate(startWeek.getDate() + 6);
        isPeriod = bDateStr >= toDateString(startWeek) && bDateStr <= toDateString(endWeek);
      } else {
        const startMonthStr = `${refStr.substring(0, 7)}-01`;
        const endMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
        isPeriod = bDateStr >= startMonthStr && bDateStr <= toDateString(endMonth);
      }

      const isTab = activeTab === 'all' ? true : b.type === activeTab;
      return isPeriod && isTab;
    }).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills, referenceDate, viewMode, activeTab])

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-2 italic">
            <Landmark className="text-indigo-600" size={32} /> FINANCEIRO
          </h1>
          <div className="flex gap-2 mt-3">
            {['day', 'week', 'month'].map(mode => (
              <button key={mode} onClick={() => { setViewMode(mode); setReferenceDate(new Date()); }}
                className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${viewMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-secondary-400 border border-secondary-100'}`}>
                {mode === 'day' ? 'Hoje' : mode === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center bg-white border-2 border-secondary-100 rounded-3xl p-1.5 shadow-sm">
          <button onClick={() => navigate(-1)} className="p-2 text-secondary-400 hover:bg-secondary-50 rounded-xl"><ChevronLeft/></button>
          <div className="px-6 text-center min-w-[200px]">
             <p className="text-sm font-black text-secondary-800 uppercase">
              {viewMode === 'day' ? referenceDate.toLocaleDateString('pt-BR') : 
               viewMode === 'week' ? `Semana Atual` :
               referenceDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => navigate(1)} className="p-2 text-secondary-400 hover:bg-secondary-50 rounded-xl"><ChevronRight/></button>
        </div>

        <button onClick={() => setShowModal(true)} className="bg-red-500 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase hover:bg-black transition-all shadow-xl">
          + Novo Lançamento
        </button>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-secondary-900 p-6 rounded-[2.5rem] text-white shadow-2xl relative">
          <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Saldo Real (Pago)</p>
          <h2 className="text-3xl font-black mt-1">{formatCurrency(report.saldoRealTotal)}</h2>
          <div className="mt-4 flex items-center gap-2 text-[9px] text-emerald-400 font-bold bg-white/10 px-3 py-1.5 rounded-full w-fit">
            <CheckCircle2 size={12}/> Dinheiro Confirmado
          </div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative">
          <div className="absolute right-6 top-6 opacity-20"><Scale size={24}/></div>
          <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest text-indigo-100">Projeção Fim do Período</p>
          <h2 className="text-3xl font-black mt-1">{formatCurrency(report.projeçãoFechamento)}</h2>
          <p className="text-[10px] text-indigo-200 mt-4 font-bold italic underline underline-offset-4 tracking-tight">Saldo Real + Pendentes</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-secondary-50 flex flex-col justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Entradas do Período</p>
            <h3 className="text-xl font-black text-secondary-800">{formatCurrency(report.periodoEntrada)}</h3>
          </div>
          <div className="pt-4 border-t border-secondary-50 mt-4">
             <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Saídas do Período</p>
             <h3 className="text-xl font-black text-secondary-800">{formatCurrency(report.periodoSaida)}</h3>
          </div>
        </div>

        <div className={`p-6 rounded-[2.5rem] border-2 transition-all ${report.pendenciasAnteriores > 0 ? 'bg-amber-50 border-amber-100 animate-pulse' : 'bg-white border-secondary-50 opacity-40'}`}>
          <div className="flex justify-between">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Atrasados (Pré-Hoje)</p>
            <AlertCircle size={18} className="text-amber-500"/>
          </div>
          <h2 className="text-3xl font-black text-amber-700 mt-1">{formatCurrency(report.pendenciasAnteriores)}</h2>
          <p className="text-[10px] text-amber-600 mt-2 font-bold uppercase">Liquide para atualizar</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border-2 border-secondary-50 rounded-[3rem] overflow-hidden shadow-xl">
        <div className="px-10 py-8 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/30">
          <div className="flex gap-4">
            {['all', 'receita', 'despesa'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-secondary-900 text-white' : 'text-secondary-400 hover:text-secondary-900'}`}>
                {t === 'all' ? 'Ver Tudo' : t === 'receita' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary-50/20">
                <th className="px-10 py-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-10 py-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Lançamento</th>
                <th className="px-10 py-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-10 py-5 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-50">
              {filteredBills.map(bill => (
                <tr key={bill.id} className="hover:bg-secondary-50/50 transition-colors">
                  <td className="px-10 py-6 font-black text-xs text-secondary-900 uppercase">
                    {new Date(bill.dueDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-xs font-black text-secondary-800 uppercase mb-1">{bill.description}</p>
                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">{bill.category}</span>
                  </td>
                  <td className={`px-10 py-6 text-right font-black text-sm ${bill.type === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {bill.type === 'receita' ? '+ ' : '- '} {formatCurrency(bill.value)}
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {bill.status === 'PENDENTE' ? (
                        <button onClick={() => openPayModal(bill)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all">
                          Liquidar
                        </button>
                      ) : (
                        <div className="text-emerald-600 font-black text-[9px] uppercase bg-emerald-50 py-2 px-4 rounded-full">Confirmado</div>
                      )}
                      <button onClick={() => handleDelete(bill.id)} className="p-2 text-secondary-300 hover:text-red-500 transition-all">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBills.length === 0 && <div className="p-20 text-center text-secondary-300 font-bold italic uppercase tracking-widest text-xs">Sem lançamentos para este período.</div>}
        </div>
      </div>

      {/* MODAL DE LIQUIDAÇÃO */}
      {showPayModal && selectedBill && (
        <div className="fixed inset-0 bg-secondary-900/95 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] w-full max-w-lg shadow-2xl p-12 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowPayModal(false)} className="absolute top-10 right-10 text-secondary-300 hover:text-black transition-colors"><X size={32}/></button>
            
            <div className="mb-10 text-center">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 block">Confirmar Recebimento/Pagamento</span>
              <h2 className="text-3xl font-black text-secondary-900 uppercase italic line-clamp-2">{selectedBill.description}</h2>
              <div className="h-1 w-20 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
            </div>

            <div className="space-y-8">
              <div>
                <label className="text-[11px] font-black uppercase text-secondary-400 mb-3 block text-center tracking-widest">Valor da Baixa</label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-secondary-300 text-xl group-focus-within:text-indigo-600 transition-colors">R$</span>
                  <input 
                    type="number" 
                    className="w-full p-8 pl-16 bg-secondary-50 rounded-[2.5rem] border-2 border-transparent focus:border-indigo-600 outline-none font-black text-4xl text-secondary-900 transition-all text-center"
                    value={paymentData.paidValue}
                    onChange={(e) => setPaymentData({...paymentData, paidValue: e.target.value})}
                  />
                </div>
              </div>

              {parseFloat(paymentData.paidValue) < selectedBill.value && (
                <div className="p-6 bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-amber-600 mb-2 block flex items-center gap-2 justify-center">
                      <Clock size={14}/> Reagendar saldo restante para:
                    </label>
                    <input 
                      type="date" 
                      className="w-full p-4 bg-white border-2 border-amber-200 rounded-2xl outline-none font-black text-secondary-800 text-center"
                      value={paymentData.newDueDate}
                      onChange={(e) => setPaymentData({...paymentData, newDueDate: e.target.value})}
                    />
                  </div>
                  <p className="text-[10px] text-amber-700 text-center font-bold uppercase leading-relaxed opacity-70">
                    O título atual será quitado parcialmente e uma nova pendência de {formatCurrency(selectedBill.value - paymentData.paidValue)} será gerada.
                  </p>
                </div>
              )}

              <button 
                onClick={handleConfirmPayment}
                className="w-full py-8 bg-secondary-900 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95"
              >
                {parseFloat(paymentData.paidValue) < selectedBill.value ? "Confirmar Baixa Parcial" : "Liquidar Totalmente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO LANÇAMENTO (Mantido o original) */}
      {showModal && (
        <div className="fixed inset-0 bg-secondary-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] w-full max-w-lg shadow-2xl p-12 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-secondary-300 hover:text-black"><X size={30}/></button>
            <div className="mb-10 text-center">
               <h2 className="text-3xl font-black text-secondary-900 uppercase italic">Novo Registro</h2>
               <div className="h-1 w-20 bg-indigo-600 mx-auto mt-2 rounded-full"></div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-center">
                <label className="text-[10px] font-black uppercase text-secondary-400">Tipo</label>
                <div className="flex gap-4 p-2 bg-secondary-50 rounded-3xl">
                  <button type="button" onClick={() => setFormData({...formData, type: 'receita'})} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${formData.type === 'receita' ? 'bg-emerald-500 text-white' : 'text-secondary-400'}`}>Receita</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'despesa'})} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${formData.type === 'despesa' ? 'bg-red-500 text-white' : 'text-secondary-400'}`}>Despesa</button>
                </div>
              </div>
              <input required className="w-full p-6 bg-secondary-50 border-2 border-transparent focus:border-indigo-600 rounded-[2rem] outline-none font-bold text-sm" placeholder="Descrição" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" step="0.01" className="w-full p-6 bg-secondary-50 border-2 border-transparent focus:border-indigo-600 rounded-[2rem] outline-none font-black text-lg" placeholder="0,00" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
                <input required type="date" className="w-full p-6 bg-secondary-50 border-2 border-transparent focus:border-indigo-600 rounded-[2rem] outline-none font-bold text-sm" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
              </div>
              <button className="w-full py-7 bg-secondary-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-2xl">Confirmar Lançamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}