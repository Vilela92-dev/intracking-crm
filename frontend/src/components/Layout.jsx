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
  Calculator,
  MessageSquare, // Ícone para a Miranda
  Send,
  Paperclip
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mirandaOpen, setMirandaOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Olá! Sou a Miranda, sua Arquiteta de QA. Como posso ajudar no refinamento do Ateliê PRO hoje?' }
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // --- LOGICA DA MIRANDA ---
  const handleSendToMiranda = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    const userMsg = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    const formData = new FormData();
    formData.append('chatInput', inputText);
    // Aqui você pode adicionar o append de arquivos futuramente conforme sua necessidade

    try {
      // URL do seu n8n que configuramos anteriormente
      const response = await fetch('https://intracking.app.n8n.cloud/webhook/a598084a-06c2-4af5-8f39-fd1de6d2c763/chatN', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'bot', content: data.output || 'Análise concluída com sucesso.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Erro ao conectar com a Miranda. Verifique o Webhook.' }]);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/crm', label: 'Noivas (Clientes)', icon: Users },
    { path: '/calendario', label: 'Agenda de Provas', icon: Calendar },
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
    <div className="flex h-screen bg-secondary-50 font-sans relative overflow-hidden">
      {/* Sidebar Principal */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-secondary-200 transition-all duration-300 flex flex-col shadow-sm z-20`}
      >
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

        <div className="p-4 border-t border-secondary-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors group"
          >
            <LogOut size={18} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            {sidebarOpen && <span className="text-xs font-bold uppercase tracking-wider">Encerrar Sessão</span>}
          </button>
        </div>

        <div className="p-2 border-t border-secondary-100 bg-secondary-50/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center border border-transparent hover:border-secondary-200"
          >
            {sidebarOpen ? <X size={18} className="text-secondary-400" /> : <Menu size={18} className="text-secondary-400" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
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

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-[1600px] mx-auto p-8">
            {children}
          </div>
        </main>

        {/* --- BOTÃO FLUTUANTE MIRANDA --- */}
        <button 
          onClick={() => setMirandaOpen(!mirandaOpen)}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 ${mirandaOpen ? 'bg-secondary-900 rotate-90' : 'bg-primary-600 hover:scale-110'}`}
        >
          {mirandaOpen ? <X className="text-white" /> : <MessageSquare className="text-white" />}
        </button>

        {/* --- SIDEBAR DA MIRANDA --- */}
        <aside 
          className={`fixed top-0 right-0 h-full w-[450px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-40 transition-transform duration-500 ease-in-out border-l border-secondary-200 flex flex-col ${mirandaOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-6 border-b border-secondary-100 bg-secondary-900 text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center font-black">M</div>
              <div>
                <h3 className="font-bold text-sm">Miranda AI</h3>
                <p className="text-[10px] text-secondary-400 uppercase tracking-widest">Arquiteta de QA Sênior</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-secondary-50/30 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'bg-white border border-secondary-200 text-secondary-800 shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start italic text-xs text-secondary-400 animate-pulse">
                Miranda está analisando o contexto...
              </div>
            )}
          </div>

          <div className="p-6 border-t border-secondary-100 bg-white">
            <div className="relative">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Descreva o comportamento ou cole um erro..."
                className="w-full bg-secondary-50 border border-secondary-200 rounded-xl p-4 pr-12 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none h-24"
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button className="p-2 text-secondary-400 hover:text-primary-600 transition-colors">
                  <Paperclip size={18} />
                </button>
                <button 
                  onClick={handleSendToMiranda}
                  disabled={loading}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-secondary-400 mt-3 font-medium">
              A Miranda analisa o código atual e o último commit automaticamente.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}