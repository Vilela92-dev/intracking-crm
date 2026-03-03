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
  Calendar 
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

  // LISTA DE ITENS DO MENU
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/crm', label: 'Clientes', icon: Users },
    { path: '/calendario', label: 'Agenda / Visitas', icon: Calendar },
    { path: '/vendas', label: 'Vendas', icon: ShoppingCart },
    { path: '/estoque', label: 'Estoque', icon: Package },
    { path: '/fornecedores', label: 'Fornecedores', icon: Truck },
    { path: '/financeiro', label: 'Financeiro', icon: Landmark },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-secondary-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-secondary-200 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-secondary-200 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex-shrink-0 flex items-center justify-center">
            <span className="text-white font-bold text-xl">I</span>
          </div>
          {sidebarOpen && (
            <span className="font-bold text-xl text-secondary-900 truncate">Intracking</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-secondary-600 hover:bg-secondary-100'
              }`}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-secondary-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <div className="p-2 border-t border-secondary-200">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-2 hover:bg-secondary-100 rounded-lg transition-colors flex items-center justify-center"
          >
            {sidebarOpen ? (
              <X size={20} className="text-secondary-600" />
            ) : (
              <Menu size={20} className="text-secondary-600" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-secondary-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-secondary-900">Intracking CRM</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-secondary-900">{user?.name}</p>
              <p className="text-xs text-secondary-600">
                {user?.role === 'admin' ? 'Administrador' : 'Utilizador'}
              </p>
            </div>
            <div className="w-10 h-10 bg-secondary-200 rounded-full flex items-center justify-center text-secondary-600 font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}