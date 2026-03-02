import { useEffect, useState } from 'react'
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react'
import api from '../services/api'

export function Dashboard() {
  const [stats, setStats] = useState({
    totalVendas: 0,
    totalClientes: 0,
    receitaTotal: 0,
    ticketMedio: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [vendas, clientes] = await Promise.all([
          api.get('/api/v1/sales'),
          api.get('/api/v1/crm/customers'),
        ])

        const totalVendas = vendas.data.data?.length || 0
        const totalClientes = clientes.data.data?.length || 0
        const receitaTotal = vendas.data.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
        const ticketMedio = totalVendas > 0 ? receitaTotal / totalVendas : 0

        setStats({
          totalVendas,
          totalClientes,
          receitaTotal,
          ticketMedio,
        })
      } catch (err) {
        console.error('Erro ao buscar estatísticas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const cards = [
    {
      title: 'Total de Vendas',
      value: stats.totalVendas,
      icon: ShoppingCart,
      color: 'primary',
      bg: 'bg-primary-50',
    },
    {
      title: 'Total de Clientes',
      value: stats.totalClientes,
      icon: Users,
      color: 'blue',
      bg: 'bg-blue-50',
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.receitaTotal.toFixed(2)}`,
      icon: DollarSign,
      color: 'green',
      bg: 'bg-green-50',
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${stats.ticketMedio.toFixed(2)}`,
      icon: TrendingUp,
      color: 'purple',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Dashboard</h1>
        <p className="text-secondary-600 mt-1">Bem-vindo ao Intracking CRM</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div
              key={index}
              className={`${card.bg} border border-secondary-200 rounded-lg p-6 space-y-3 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-secondary-600 text-sm font-medium">{card.title}</h3>
                <Icon className="text-primary-600" size={24} />
              </div>
              <div className="text-3xl font-bold text-secondary-900">
                {loading ? '...' : card.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white border border-secondary-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-secondary-900 mb-4">Vendas Recentes</h2>
          <div className="space-y-3">
            <p className="text-secondary-600 text-sm">Nenhuma venda registrada ainda</p>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="bg-white border border-secondary-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-secondary-900 mb-4">Clientes Recentes</h2>
          <div className="space-y-3">
            <p className="text-secondary-600 text-sm">Nenhum cliente registrado ainda</p>
          </div>
        </div>
      </div>
    </div>
  )
}
