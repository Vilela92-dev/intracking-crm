import { useEffect, useState, useCallback } from 'react'
import { 
  Calculator, Search, CheckCircle2, Clock, Trash2, 
  Loader2, Ban, Filter, ShoppingBag, ArrowUpRight, 
  FileText, Calendar, XCircle
} from 'lucide-react'
import api from '../services/api'

export function Orcamentos() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('TODOS')

  // --- BUSCA DE DADOS ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/quotes')
      // Ajuste para garantir que pegamos o array independentemente do formato da resposta
      const data = res.data.data || res.data || []
      setQuotes(data)
    } catch (err) {
      console.error("Erro ao carregar orçamentos:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // --- LÓGICA DE GESTÃO (CORRIGIDA) ---

  // Função genérica para atualizar status e garantir integridade
  const updateQuoteStatus = async (id, newStatus, confirmMsg) => {
    if (!window.confirm(confirmMsg)) return
    
    try {
      // Usando PUT com o status no body para maior compatibilidade com o backend
      await api.put(`/quotes/${id}`, { status: newStatus })
      
      // Feedback visual imediato e recarregamento dos dados para validar estoque
      alert(`Orçamento ${newStatus.toLowerCase()} com sucesso!`)
      fetchData()
    } catch (err) {
      console.error(`Erro ao atualizar para ${newStatus}:`, err)
      const errorMsg = err.response?.data?.message || "Erro na comunicação com o servidor."
      alert(`Falha na operação: ${errorMsg}`)
    }
  }

  const handleApprove = (id) => 
    updateQuoteStatus(id, 'APROVADO', "Deseja aprovar este orçamento? Isso confirmará a reserva dos materiais no estoque.")

  const handleReject = (id) => 
    updateQuoteStatus(id, 'REPROVADO', "Deseja reprovar este orçamento? Os materiais reservados ficarão disponíveis novamente.")

  const handleDelete = async (id) => {
    if (!window.confirm("ATENÇÃO: Excluir permanentemente este registro? Esta ação não pode ser desfeita.")) return
    try {
      await api.delete(`/quotes/${id}`)
      setQuotes(prev => prev.filter(q => q.id !== id))
      alert("Registro removido com sucesso.")
    } catch (err) {
      console.error("Erro ao excluir:", err)
      alert("Erro ao excluir. Verifique se o registro ainda existe.")
    }
  }

  // --- UTILITÁRIOS ---
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  const filteredQuotes = quotes.filter(q => {
    const name = q.customerName || ""
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'TODOS' || q.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // --- RENDERIZAÇÃO ---
  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  )

  return (
    <div className="space-y-6 p-2">
      {/* HEADER GESTÃO */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-secondary-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-secondary-900 flex items-center gap-2 italic uppercase tracking-tighter">
            <Calculator className="text-indigo-600" size={28} /> Orçamentos na Mesa
          </h1>
          <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mt-1">
            Controle de propostas e reservas de estoque
          </p>
        </div>

        <div className="flex flex-1 max-w-xl w-full gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300" size={18} />
            <input 
              type="text" 
              placeholder="Buscar noiva..." 
              className="w-full pl-12 pr-4 py-4 bg-secondary-50 rounded-2xl border-none outline-none font-bold text-xs focus:ring-2 ring-indigo-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="bg-secondary-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase outline-none border-none cursor-pointer hover:bg-indigo-600 transition-colors"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="TODOS">Todos Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="APROVADO">Aprovados</option>
            <option value="REPROVADO">Reprovados</option>
          </select>
        </div>
      </div>

      {/* RESUMO RÁPIDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-secondary-100 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Soma de Propostas (Filtro)</p>
            <p className="text-2xl font-black text-secondary-900">
              {formatCurrency(filteredQuotes.reduce((acc, curr) => acc + (Number(curr.totalValue) || 0), 0))}
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* LISTAGEM EM CARDS */}
      <div className="grid grid-cols-1 gap-4">
        {filteredQuotes.length > 0 ? (
          filteredQuotes.map(quote => (
            <div key={quote.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-secondary-50 hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col md:flex-row items-center gap-6 group">
              
              {/* ÍCONE DE STATUS DINÂMICO */}
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                quote.status === 'APROVADO' ? 'bg-emerald-50 text-emerald-500' : 
                quote.status === 'REPROVADO' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
              }`}>
                {quote.status === 'APROVADO' ? <CheckCircle2 size={32}/> : 
                 quote.status === 'REPROVADO' ? <XCircle size={32}/> : <Clock size={32}/>}
              </div>

              {/* INFO DA NOIVA */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <span className="text-[9px] font-black bg-secondary-100 text-secondary-500 px-2 py-0.5 rounded-md uppercase">ID: {quote.id?.substring(0,8)}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                    quote.status === 'APROVADO' ? 'bg-emerald-500 text-white' : 
                    quote.status === 'REPROVADO' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                  }`}>{quote.status}</span>
                </div>
                <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">{quote.customerName || 'Cliente não identificado'}</h3>
                <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                   <div className="flex items-center gap-1 text-secondary-400 font-bold text-[10px] uppercase">
                      <Calendar size={12}/> {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('pt-BR') : '--/--/--'}
                   </div>
                   <div className="flex items-center gap-1 text-indigo-500 font-bold text-[10px] uppercase">
                      <ShoppingBag size={12}/> {quote.items?.length || 0} Insumos
                   </div>
                </div>
              </div>

              {/* FINANCEIRO */}
              <div className="px-10 border-y-2 md:border-y-0 md:border-x-2 border-secondary-50 py-4 md:py-0 text-center min-w-[200px]">
                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-1">Valor do Contrato</p>
                <p className="text-2xl font-black text-secondary-900 tracking-tighter">{formatCurrency(quote.totalValue)}</p>
              </div>

              {/* AÇÕES EXECUTIVAS */}
              <div className="flex flex-wrap justify-center gap-2">
                {quote.status === 'PENDENTE' && (
                  <>
                    <button 
                      onClick={() => handleApprove(quote.id)}
                      className="bg-emerald-500 text-white p-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 active:scale-90"
                      title="Confirmar e Baixar Estoque"
                    >
                      <CheckCircle2 size={22}/>
                    </button>
                    <button 
                      onClick={() => handleReject(quote.id)}
                      className="bg-rose-500 text-white p-4 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 active:scale-90"
                      title="Reprovar e Liberar Insumos"
                    >
                      <Ban size={22}/>
                    </button>
                  </>
                )}
                
                {quote.status === 'APROVADO' && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase italic border border-emerald-100">
                    <CheckCircle2 size={16}/> Produção Confirmada
                  </div>
                )}

                <button 
                  onClick={() => handleDelete(quote.id)}
                  className="p-4 bg-secondary-50 text-secondary-300 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all active:scale-90"
                  title="Excluir Permanentemente"
                >
                  <Trash2 size={22}/>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-secondary-100 shadow-inner">
            <Calculator size={48} className="mx-auto text-secondary-100 mb-4" />
            <p className="text-secondary-400 font-black uppercase text-xs tracking-widest">Nenhum orçamento encontrado nesta categoria</p>
          </div>
        )}
      </div>
    </div>
  )
}