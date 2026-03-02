import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="text-6xl font-bold text-white">404</div>
        <h1 className="text-3xl font-bold text-white">Página não encontrada</h1>
        <p className="text-primary-100 max-w-md">
          Desculpe, a página que você está procurando não existe ou foi movida.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
        >
          <Home size={18} />
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
