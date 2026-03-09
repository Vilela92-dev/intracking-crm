import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Menu, 
  X, 
  LogOut, 
  BarChart3, 
  Users, 
  ShoppingCart, 
  Home, 
  Package, 
  Truck, 
  Landmark, 
  Calendar,
  Layers,
  Calculator // NOVO: Ícone para Orçamentos
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // --- LISTA DE ITENS DO MENU ATUALIZADA ---
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/crm', label: 'Noivas (Clientes)', icon: Users },
    { path: '/calendario', label: 'Agenda de Provas', icon: Calendar },
    
    // NOVO: Orçamentos inserido no fluxo lógico antes da Venda
    { path: '/orcamentos', label: 'Orçamentos & Projetos', icon: Calculator },
    
    { path: '/vendas', label: 'Vendas / Sob Medida', icon: ShoppingCart },
    { path: '/aluguel', label: 'Aluguel de Vestidos', icon: Layers },
    
    { path: '/estoque', label: 'Estoque / Materiais', icon: Package },
    { path: '/fornecedores', label: 'Fornecedores', icon: Truck },
    { path: '/financeiro', label: 'Fluxo de Caixa', icon: Landmark },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-secondary-50 font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-secondary-200 transition-all duration-300 flex flex-col shadow-sm z-20`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-secondary-200 flex items-center gap-3 overflow-hidden bg-white">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex-shrink-0 flex items-center justify-center shadow-lg shadow-primary-200">
            <span className="text-white font-bold text-xl uppercase italic">I</span>
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
                <span className="font-black text-lg text-secondary-900 leading-tight">Intracking</span>
                <span className="text-[10px] text-primary-600 font-bold tracking-widest uppercase">Ateliê Pro</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                isActive(item.path)
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-100'
                  : 'text-secondary-500 hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              <item.icon 
                size={20} 
                className={`flex-shrink-0 ${isActive(item.path) ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} 
              />
              {sidebarOpen && <span className="font-semibold text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-secondary-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors group"
          >
            <LogOut size={18} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            {sidebarOpen && <span className="text-xs font-bold uppercase tracking-wider">Encerrar Sessão</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <div className="p-2 border-t border-secondary-100 bg-secondary-50/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center border border-transparent hover:border-secondary-200"
          >
            {sidebarOpen ? (
              <X size={18} className="text-secondary-400" />
            ) : (
              <Menu size={18} className="text-secondary-400" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-secondary-200 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-secondary-900">
                {menuItems.find(item => isActive(item.path))?.label || 'Painel'}
            </h1>
            <p className="text-[11px] text-secondary-400 font-medium">Gestão Inteligente de Ateliê</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-secondary-900">{user?.name || 'Usuário'}</p>
              <p className="text-[10px] font-bold text-primary-500 uppercase tracking-tighter">
                {user?.role === 'admin' ? 'Acesso Total' : 'Operacional'}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-100 border-2 border-white shadow-sm rounded-full flex items-center justify-center text-primary-700 font-black ring-2 ring-primary-50">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-[1600px] mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}