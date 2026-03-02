import { useEffect, useState } from 'react'
import { TrendingUp, Users, ShoppingCart, DollarSign, Loader2 } from 'lucide-react'
import api from '../services/api'

export function Dashboard() {
  const [stats, setStats] = useState({
    totalVendas: 0,
    totalClientes: 0,
    receitaTotal: 0,
    ticketMedio: 0,
  })
  const [recentSales, setRecentSales] = useState([])
  const [recentCustomers, setRecentCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const [vendasRes, clientesRes] = await Promise.all([
          api.get('/sales'),
          api.get('/crm/customers'),
        ])

        const vendas = vendasRes.data.data || []
        const clientes = clientesRes.data.data || []

        const totalVendas = vendas.length
        const totalClientes = clientes.length
        const receitaTotal = vendas.reduce((sum, v) => sum + (Number(v.total) || 0), 0)
        const ticketMedio = totalVendas > 0 ? receitaTotal / totalVendas : 0

        setStats({
          totalVendas,
          totalClientes,
          receitaTotal,
          ticketMedio,
        })

        setRecentSales(vendas.slice(-5).reverse())
        setRecentCustomers(clientes.slice(-5).reverse())
      } catch (err) {
        console.error('Erro ao buscar estatísticas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (val) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const cards = [
    { title: 'Total de Vendas', value: stats.totalVendas, icon: ShoppingCart, bg: 'bg-primary-50' },
    { title: 'Total de Clientes', value: stats.totalClientes, icon: Users, bg: 'bg-blue-50' },
    { title: 'Receita Total', value: formatCurrency(stats.receitaTotal), icon: DollarSign, bg: 'bg-green-50' },
    { title: 'Ticket Médio', value: formatCurrency(stats.ticketMedio), icon: TrendingUp, bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Dashboard</h1>
        <p className="text-secondary-600 mt-1">Visão geral do seu ateliê</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className={`${card.bg} border border-secondary-200 rounded-xl p-6 shadow-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-secondary-500 text-xs font-bold uppercase tracking-wider">{card.title}</h3>
                <Icon className="text-primary-600" size={20} />
              </div>
              <div className="text-2xl font-black text-secondary-900">
                {loading ? <Loader2 className="animate-spin text-secondary-300" size={20} /> : card.value}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas Recentes */}
        <div className="bg-white border border-secondary-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-secondary-900 mb-6 flex items-center gap-2 border-b pb-4">
            <ShoppingCart size={18} className="text-primary-600" /> Vendas Recentes
          </h2>
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary-200" /></div>
            ) : recentSales.length > 0 ? (
              recentSales.map((venda) => (
                <div key={venda.id} className="flex justify-between items-center border-b border-secondary-50 pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-secondary-800">{venda.customerName || 'Consumidor'}</p>
                    <p className="text-[10px] text-secondary-400 uppercase font-medium">{new Date(venda.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="text-sm font-black text-primary-600">
                    {formatCurrency(Number(venda.total))}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-secondary-400 text-sm italic text-center py-6">Nenhum pedido hoje.</p>
            )}
          </div>
        </div>

        {/* Clientes Novos */}
        <div className="bg-white border border-secondary-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-secondary-900 mb-6 flex items-center gap-2 border-b pb-4">
            <Users size={18} className="text-blue-600" /> Novos Clientes
          </h2>
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary-200" /></div>
            ) : recentCustomers.length > 0 ? (
              recentCustomers.map((cliente) => (
                <div key={cliente.id} className="flex justify-between items-center border-b border-secondary-50 pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-secondary-800">{cliente.name}</p>
                    <p className="text-[10px] text-secondary-400">{cliente.email}</p>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold uppercase tracking-tighter">
                    {cliente.leadSource || 'Direto'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-secondary-400 text-sm italic text-center py-6">Sem novos cadastros.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}