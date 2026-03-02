import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, BarChart3, Users, ShoppingCart, Home } from 'lucide-react'
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

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/crm', label: 'Clientes', icon: Users },
    { path: '/vendas', label: 'Vendas', icon: ShoppingCart },
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
        <div className="p-4 border-b border-secondary-200">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-white">I</span>
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-bold text-secondary-900 text-sm">Intracking</p>
                <p className="text-xs text-secondary-600">CRM</p>
              </div>
            )}
          </Link>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-secondary-200 space-y-3">
          {sidebarOpen && (
            <div className="bg-primary-50 rounded-lg p-3">
              <p className="text-xs text-secondary-600">Usuário</p>
              <p className="text-sm font-semibold text-secondary-900 truncate">{user?.name}</p>
              <p className="text-xs text-secondary-600 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <div className="p-2 border-t border-secondary-200">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X size={20} className="mx-auto text-secondary-600" />
            ) : (
              <Menu size={20} className="mx-auto text-secondary-600" />
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
              <p className="text-xs text-secondary-600">{user?.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
