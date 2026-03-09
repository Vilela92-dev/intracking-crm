import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

// Importação das Páginas
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { CRM } from './pages/CRM'
import { Vendas } from './pages/Vendas'
import Aluguel from './pages/Aluguel' 
import { Relatorios } from './pages/Relatorios'
import { NotFound } from './pages/NotFound'
import { Estoque } from './pages/Estoque'
import { Fornecedores } from './pages/Fornecedores'
import { Financeiro } from './pages/Financeiro'
import { Calendario } from './pages/Calendario'
import { Orcamentos } from './pages/Orcamentos' // <--- ADICIONADO: Importação da nova página

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rota Pública de Acesso */}
          <Route path="/login" element={<Login />} />

          {/* Rotas Protegidas com Layout Integrado */}
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/crm" 
            element={<ProtectedRoute><Layout><CRM /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/calendario" 
            element={<ProtectedRoute><Layout><Calendario /></Layout></ProtectedRoute>} 
          />
          
          {/* Módulos de Operação (Vendas, Locação e Orçamentos) */}
          <Route 
            path="/vendas" 
            element={<ProtectedRoute><Layout><Vendas /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/orcamentos" // <--- ADICIONADO: Nova rota para Orçamentos
            element={<ProtectedRoute><Layout><Orcamentos /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/aluguel" 
            element={<ProtectedRoute><Layout><Aluguel /></Layout></ProtectedRoute>} 
          />

          {/* Gestão de Insumos e Financeiro */}
          <Route 
            path="/estoque" 
            element={<ProtectedRoute><Layout><Estoque /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/fornecedores" 
            element={<ProtectedRoute><Layout><Fornecedores /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/financeiro" 
            element={<ProtectedRoute><Layout><Financeiro /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/relatorios" 
            element={<ProtectedRoute><Layout><Relatorios /></Layout></ProtectedRoute>} 
          />
          
          {/* Redirecionamento Inicial e Página Não Encontrada */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App