import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, Users, Calendar, AlertTriangle, 
  DollarSign, CheckCircle, Clock, ArrowRight,
  ShoppingBag, Package, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // IMPORTADO: Para navegação entre rotas
import api from '../services/api';

export function Dashboard() {
  const navigate = useNavigate(); // INICIALIZADO: Hook de navegação
  const [data, setData] = useState({
    customers: [],
    quotes: [],
    rentals: [],
    appointments: [],
    products: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [cust, quo, rent, appo, prod] = await Promise.all([
          api.get('/crm/customers'),
          api.get('/quotes'),
          api.get('/rentals'),
          api.get('/appointments'),
          api.get('/products')
        ]);
        setData({
          customers: cust.data.data || cust.data || [],
          quotes: quo.data.data || quo.data || [],
          rentals: rent.data.data || rent.data || [],
          appointments: appo.data.data || appo.data || [],
          products: prod.data.data || prod.data || []
        });
      } catch (err) {
        console.error("Erro ao carregar dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const pendingQuotes = data.quotes.filter(q => q.status === 'PENDENTE');
    const closedContracts = data.customers.filter(c => c.status === 'CONTRATO FECHADO');
    const totalPotential = pendingQuotes.reduce((sum, q) => sum + (Number(q.totalValue) || 0), 0);
    
    // Filtra agendamentos de hoje
    const todayTrials = data.appointments.filter(a => a.date === today);

    // Alertas de Devolução Dinâmico
    const pendingReturns = data.rentals.filter(r => r.returnDate === today && r.status !== 'CONCLUIDO');

    return {
      totalPotential,
      pendingQuotesCount: pendingQuotes.length,
      closedCount: closedContracts.length,
      todayTrials,
      lowStock: data.products.filter(p => p.stock < 3).length,
      pendingReturns
    };
  }, [data]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black text-[10px] uppercase tracking-widest text-secondary-400 italic">Sincronizando Ateliê...</p>
    </div>
  );

  return (
    <div className="space-y-8 p-2 animate-in fade-in duration-700">
      
      {/* MÉTRICAS DE IMPACTO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-secondary-50 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4"><DollarSign size={20}/></div>
          <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Em Orçamento</p>
          <p className="text-2xl font-black text-secondary-900 mt-1">{formatCurrency(stats.totalPotential)}</p>
          <p className="text-[9px] text-secondary-400 mt-1 uppercase font-bold">{stats.pendingQuotesCount} propostas em aberto</p>
        </div>

        <div className="bg-secondary-900 p-6 rounded-[2rem] shadow-xl text-white">
          <div className="p-3 bg-white/10 text-white rounded-2xl w-fit mb-4"><CheckCircle size={20}/></div>
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Contratos Fechados</p>
          <p className="text-2xl font-black mt-1">{stats.closedCount}</p>
          <p className="text-[9px] text-white/40 mt-1 uppercase font-bold">Noivas Ativas no Sistema</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border-2 border-secondary-50 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-4"><Calendar size={20}/></div>
          <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Provas Hoje</p>
          <p className="text-2xl font-black text-secondary-900 mt-1">{stats.todayTrials.length}</p>
          <p className="text-[9px] text-secondary-400 mt-1 uppercase font-bold">Agendamentos para agora</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border-2 border-secondary-50 shadow-sm">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit mb-4"><Package size={20}/></div>
          <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Estoque Baixo</p>
          <p className="text-2xl font-black text-secondary-900 mt-1">{stats.lowStock}</p>
          <p className="text-[9px] text-secondary-400 mt-1 uppercase font-bold">Insumos precisando de compra</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* AGENDA DE PROVAS */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border-2 border-secondary-50 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-secondary-50 flex justify-between items-center">
            <h3 className="font-black text-secondary-900 text-[10px] uppercase tracking-widest flex items-center gap-2 italic">
              <Clock className="text-indigo-600" size={16}/> Cronograma de Hoje
            </h3>
          </div>
          <div className="divide-y divide-secondary-50">
            {stats.todayTrials.length > 0 ? stats.todayTrials.map(trial => (
              <div 
                key={trial.id} 
                onClick={() => navigate(`/crm?id=${trial.customerId}`)} // CORRIGIDO: Agora usa o navigate do Router
                className="p-6 flex items-center justify-between hover:bg-secondary-50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-secondary-900 rounded-xl flex items-center justify-center text-white font-black text-sm uppercase">
                    {trial.title?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="font-black text-secondary-900 text-sm uppercase leading-tight">{trial.title}</p>
                    <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest flex items-center gap-2">
                       <Clock size={12}/> {trial.time || 'Horário não definido'}
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-secondary-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            )) : (
              <div className="p-20 text-center space-y-2">
                <div className="bg-secondary-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-secondary-200" size={24}/>
                </div>
                <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.2em]">Tudo limpo! Sem provas hoje.</p>
              </div>
            )}
          </div>
        </div>

        {/* FUNIL E ALERTAS DINÂMICOS */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border-2 border-secondary-50 shadow-sm p-8 space-y-6">
            <h3 className="font-black text-secondary-900 text-[10px] uppercase tracking-widest flex items-center gap-2 italic">
              <TrendingUp className="text-indigo-600" size={16}/> Saúde Comercial
            </h3>
            <div className="space-y-5">
              {['PROSPECÇÃO', 'ORÇAMENTO', 'CONTRATO FECHADO'].map(status => {
                const count = data.customers.filter(c => c.status === status).length;
                const total = data.customers.length || 1;
                const percentage = (count / total) * 100;
                
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">{status}</span>
                      <span className="text-xs font-black text-secondary-900">{count}</span>
                    </div>
                    <div className="h-2.5 bg-secondary-50 rounded-full overflow-hidden border border-secondary-100">
                      <div 
                        className={`h-full transition-all duration-1000 ${status === 'CONTRATO FECHADO' ? 'bg-indigo-600' : 'bg-secondary-300'}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-rose-50 rounded-[2.5rem] border-2 border-rose-100 p-8 space-y-4">
             <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle size={18} />
                <h3 className="text-[10px] font-black uppercase tracking-widest italic">Atenção Crítica</h3>
             </div>
             {stats.pendingReturns.length > 0 ? (
               <div className="space-y-3">
                 <p className="text-[11px] font-bold text-rose-900 leading-tight uppercase">
                   Você tem <span className="font-black underline">{stats.pendingReturns.length} vestido(s)</span> para receber hoje!
                 </p>
                 <button 
                  onClick={() => navigate('/aluguel')} // Navega para a tela de aluguel
                  className="w-full py-3 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all"
                 >
                   Ver Devoluções
                 </button>
               </div>
             ) : (
               <p className="text-[10px] font-bold text-rose-400 uppercase italic">
                 Nenhuma devolução pendente para hoje.
               </p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}