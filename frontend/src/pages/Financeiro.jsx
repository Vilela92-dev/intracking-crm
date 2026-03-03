import { useEffect, useState, useCallback } from 'react'
import { Landmark, Calendar, AlertCircle, CheckCircle2, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import api from '../services/api'

export function Financeiro() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/finance/bills')
      // Ajuste para garantir que pegamos a array corretamente
      const data = res.data.data || res.data || []
      setBills(data)
    } catch (err) {
      console.error("Erro ao carregar financeiro:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFinanceData() }, [fetchFinanceData])

  // Função para dar baixa em um boleto (Pagar/Receber)
  const handlePay = async (id) => {
    try {
      await api.patch(`/finance/bills/${id}/pay`)
      fetchFinanceData() // Recarrega os dados
    } catch (err) {
      alert("Erro ao processar pagamento")
    }
  }

  const formatCurrency = (val) => {
    const number = parseFloat(val) || 0
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number)
  }

  // Totais com tratamento para garantir que são números
  const totalReceitas = bills
    .filter(b => b.type === 'receita')
    .reduce((acc, b) => acc + (parseFloat(b.value) || 0), 0)

  const totalDespesas = bills
    .filter(b => b.type === 'despesa')
    .reduce((acc, b) => acc + (parseFloat(b.value) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-2">
            <Landmark className="text-primary-600" /> Movimentação Financeira
          </h1>
          <p className="text-secondary-600">Controle de receitas de vendas e contas a pagar de fornecedores</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase">Total a Receber / Recebido</p>
            <h2 className="text-2xl font-black text-emerald-600">{formatCurrency(totalReceitas)}</h2>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={24}/></div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase">Total a Pagar (Fornecedores)</p>
            <h2 className="text-2xl font-black text-red-600">{formatCurrency(totalDespesas)}</h2>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl"><TrendingDown size={24}/></div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex items-center justify-between md:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase">Saldo Projetado</p>
            <h2 className={`text-2xl font-black ${totalReceitas - totalDespesas >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatCurrency(totalReceitas - totalDespesas)}
            </h2>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={24}/></div>
        </div>
      </div>

      <div className="bg-white border border-secondary-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={40} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary-50 border-b border-secondary-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase">Vencimento</th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase text-right">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase text-center">Status / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {bills.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).map((bill) => (
                  <tr key={bill.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-secondary-900">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-secondary-400"/>
                        {new Date(bill.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-600">
                      {bill.description}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${bill.type === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {bill.type === 'receita' ? '+ ' : '- '}
                      {formatCurrency(bill.value)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center gap-2">
                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          bill.status === 'PENDENTE' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {bill.status === 'PENDENTE' ? <AlertCircle size={12}/> : <CheckCircle2 size={12}/>}
                          {bill.status}
                        </span>
                        
                        {bill.status === 'PENDENTE' && (
                          <button 
                            onClick={() => handlePay(bill.id)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors border border-emerald-100"
                            title="Confirmar Recebimento/Pagamento"
                          >
                            <CheckCircle2 size={16}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}