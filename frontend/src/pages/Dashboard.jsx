import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, Users, Calendar, AlertTriangle, 
  DollarSign, CheckCircle, Clock, ArrowRight,
  ShoppingBag, Heart, CalendarDays, Wallet, 
  MessageCircle, Repeat, Star, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    customers: [],
    quotes: [],
    rentals: [],
    appointments: [],
    products: [],
    sales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [cust, quo, rent, appo, prod, sale] = await Promise.all([
          api.get('/crm/customers'),
          api.get('/quotes'),
          api.get('/rentals'),
          api.get('/appointments'),
          api.get('/products'),
          api.get('/sales')
        ]);
        setData({
          customers: cust.data.data || [],
          quotes: quo.data.data || [],
          rentals: rent.data.data || [],
          appointments: appo.data.data || [],
          products: prod.data.data || [],
          sales: sale.data.data || []
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
    
    // Faturamento e Volumes
    const totalSales = data.sales.reduce((sum, s) => sum + (Number(s.totalValue) || 0), 0);
    const totalRentals = data.rentals.reduce((sum, r) => sum + (Number(r.totalValue) || 0), 0);
    const revenueTotal = totalSales + totalRentals;
    
    const countSales = data.sales.length;
    const countRentals = data.rentals.length;

    // Logística e Agenda
    const upcomingEvents = data.customers
      .filter(c => c.eventDate && c.eventDate >= today)
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 4);

    const todayTrials = data.appointments.filter(a => a.date === today);
    
    const pendingReturns = data.rentals.filter(r => {
      const returnDate = r.dataDevolucao || r.returnDate;
      return returnDate === today && r.status !== 'CONCLUIDO' && r.status !== 'DEVOLVIDO';
    });

    const lowStockCount = data.products.filter(p => p.stock < 3).length;

    return {
      totalSales,
      totalRentals,
      revenueTotal,
      countSales,
      countRentals,
      pendingQuotesCount: data.quotes.filter(q => q.status === 'PENDENTE').length,
      activeBrides: data.customers.filter(c => c.status === 'CONTRATO FECHADO').length,
      todayTrials,
      lowStockCount,
      pendingReturns,
      upcomingEvents
    };
  }, [data]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black text-[10px] uppercase tracking-widest text-secondary-400 italic">Sincronizando Ateliê...</p>
    </div>
  );

  return (
    <div className="space-y-8 p-2 animate-in fade-in duration-700 text-left pb-10">
      
      {/* HEADER DE PERFORMANCE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-secondary-900 uppercase italic tracking-tighter leading-none">Intelligence</h2>
          <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.4em] mt-2">Visão Consolidada de Receita</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-secondary-100 shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[8px] font-black text-secondary-400 uppercase italic">Faturamento Global</p>
            <p className="text-xl font-black text-secondary-900">{formatCurrency(stats.revenueTotal)}</p>
          </div>
          <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* 4 CARDS OPERACIONAIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button onClick={() => navigate('/vendas')} className="bg-white p-6 rounded-[2.5rem] border border-secondary-100 shadow-sm hover:border-emerald-500 transition-all group text-left">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all"><ShoppingBag size={20}/></div>
          <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Vendas de Peças</p>
          <p className="text-2xl font-black text-secondary-900 mt-2">{formatCurrency(stats.totalSales)}</p>
        </button>

        <button onClick={() => navigate('/aluguel')} className="bg-white p-6 rounded-[2.5rem] border border-secondary-100 shadow-sm hover:border-primary-500 transition-all group text-left">
          <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl w-fit mb-4 group-hover:bg-primary-600 group-hover:text-white transition-all"><Repeat size={20}/></div>
          <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Receita Aluguéis</p>
          <p className="text-2xl font-black text-secondary-900 mt-2">{formatCurrency(stats.totalRentals)}</p>
        </button>

        <button onClick={() => navigate('/crm')} className="bg-secondary-900 p-6 rounded-[2.5rem] shadow-xl text-white hover:scale-[1.02] transition-all relative overflow-hidden text-left group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><Heart size={60}/></div>
          <div className="p-3 bg-white/10 text-white rounded-2xl w-fit mb-4"><Users size={20}/></div>
          <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Noivas Ativas</p>
          <p className="text-2xl font-black mt-2">{stats.activeBrides}</p>
        </button>

        <button onClick={() => navigate('/agenda')} className="bg-white p-6 rounded-[2.5rem] border border-secondary-100 shadow-sm hover:border-amber-500 transition-all group text-left">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-4 group-hover:bg-amber-500 group-hover:text-white transition-all"><Calendar size={20}/></div>
          <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Provas Hoje</p>
          <p className="text-2xl font-black text-secondary-900 mt-2">{stats.todayTrials.length}</p>
        </button>
      </div>

      {/* PERFORMANCE GLOBAL (BARRA COMPARATIVA) */}
      <div className="bg-white rounded-[2.5rem] border border-secondary-100 shadow-sm overflow-hidden p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary-900 rounded-2xl flex items-center justify-center text-white italic font-black">PB</div>
            <div>
              <h3 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">Business Mix</h3>
              <p className="text-lg font-black text-secondary-900 italic uppercase">Equilíbrio de Receita</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-[8px] font-black text-secondary-400 uppercase">Faturamento Vendas</p>
              <p className="text-sm font-black text-emerald-600">{formatCurrency(stats.totalSales)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-secondary-400 uppercase">Faturamento Aluguéis</p>
              <p className="text-sm font-black text-primary-600">{formatCurrency(stats.totalRentals)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-3 bg-secondary-50 rounded-full overflow-hidden flex border border-secondary-100">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000" 
              style={{ width: `${(stats.totalSales / (stats.revenueTotal || 1)) * 100}%` }} 
            />
            <div 
              className="h-full bg-primary-500 transition-all duration-1000" 
              style={{ width: `${(stats.totalRentals / (stats.revenueTotal || 1)) * 100}%` }} 
            />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase text-secondary-400 tracking-widest">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> {stats.countSales} Vendas realizadas</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-primary-500"/> {stats.countRentals} Aluguéis ativos</span>
          </div>
        </div>
      </div>

      {/* GRID INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* AGENDA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-secondary-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30">
              <h3 className="font-black text-secondary-900 text-[10px] uppercase tracking-widest flex items-center gap-2 italic">
                <Clock className="text-primary-600" size={16}/> Cronograma Diário
              </h3>
            </div>
            <div className="divide-y divide-secondary-50">
              {stats.todayTrials.length > 0 ? stats.todayTrials.map(trial => (
                <div key={trial.id} className="p-6 flex items-center justify-between hover:bg-secondary-50 transition-all group">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/crm?id=${trial.customerId}`)}>
                    <div className="w-14 h-14 bg-secondary-100 rounded-2xl flex flex-col items-center justify-center text-secondary-900 font-black group-hover:bg-primary-600 group-hover:text-white transition-all">
                      <span className="text-xs leading-none">{trial.time}</span>
                      <span className="text-[8px] uppercase opacity-50 text-center block">h</span>
                    </div>
                    <div>
                      <p className="font-black text-secondary-900 text-sm uppercase leading-tight">{trial.title}</p>
                      <p className="text-[10px] font-bold text-secondary-400 uppercase italic tracking-widest">{trial.customerName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => window.open(`https://wa.me/${trial.customerPhone?.replace(/\D/g,'')}`, '_blank')} className="p-3 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><MessageCircle size={18} /></button>
                    <button onClick={() => navigate(`/crm?id=${trial.customerId}`)} className="p-3 text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-600 hover:text-white transition-all"><ArrowRight size={18} /></button>
                  </div>
                </div>
              )) : (
                <div className="p-16 text-center opacity-30 uppercase font-black text-[9px] tracking-widest italic">Aguardando atendimentos...</div>
              )}
            </div>
          </div>

          {/* EVENTOS */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm">
            <h3 className="font-black text-secondary-900 text-[10px] uppercase tracking-widest flex items-center gap-2 italic mb-6">
              <CalendarDays className="text-primary-600" size={16}/> Próximos Casamentos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.upcomingEvents.length > 0 ? stats.upcomingEvents.map(event => (
                <div key={event.id} className="p-4 rounded-2xl bg-secondary-50 flex justify-between items-center group cursor-pointer hover:bg-primary-50 transition-all" onClick={() => navigate(`/crm?id=${event.id}`)}>
                  <div className="flex flex-col text-left">
                    <span className="font-black text-[11px] text-secondary-900 uppercase group-hover:text-primary-600 transition-colors">{event.name}</span>
                    <span className="text-[8px] font-bold text-secondary-400 uppercase italic tracking-widest">Data Magna</span>
                  </div>
                  <span className="text-[10px] font-black text-primary-500">{new Date(event.eventDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )) : (
                <p className="text-[10px] text-secondary-300 font-bold uppercase col-span-2">Sem eventos cadastrados.</p>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR FINANCEIRO/LOGÍSTICO */}
        <div className="space-y-6">
          <div className="bg-secondary-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
             <div className="absolute -bottom-4 -right-4 opacity-5"><DollarSign size={120}/></div>
             <h3 className="text-[10px] font-black uppercase tracking-widest italic mb-6 opacity-50 tracking-[0.3em]">Business Summary</h3>
             <div className="space-y-6">
               <div className="flex justify-between items-end border-b border-white/10 pb-4 text-left">
                 <div>
                   <p className="text-[8px] font-bold uppercase opacity-40">Propostas Ativas</p>
                   <p className="font-black text-lg">{formatCurrency(data.quotes.filter(q => q.status === 'PENDENTE').reduce((sum, q) => sum + Number(q.totalValue), 0))}</p>
                 </div>
                 <span className="text-[10px] font-black text-primary-400 underline cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/orcamentos')}>Ver</span>
               </div>
               <div className="flex justify-between items-end text-left">
                 <div>
                   <p className="text-[8px] font-bold uppercase opacity-40">Ticket Médio (Vendas)</p>
                   <p className="font-black text-lg text-emerald-400">{formatCurrency(stats.totalSales / (stats.countSales || 1))}</p>
                 </div>
                 <Target className="text-emerald-500 mb-1" size={20} />
               </div>
             </div>
          </div>

          {/* ALERTAS CRÍTICOS */}
          <div className={`rounded-[2.5rem] p-8 border transition-all ${stats.pendingReturns.length > 0 ? 'bg-rose-50 border-rose-100' : 'bg-secondary-50 border-secondary-100 opacity-60'}`}>
              <div className="flex items-center gap-3 text-secondary-900 mb-4">
                <AlertTriangle size={18} className={stats.pendingReturns.length > 0 ? 'text-rose-600 animate-pulse' : 'text-secondary-400'} />
                <h3 className="text-[10px] font-black uppercase tracking-widest italic">Check-in de Aluguéis</h3>
              </div>
              {stats.pendingReturns.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-rose-900 leading-tight uppercase">
                    Atenção: <span className="font-black underline">{stats.pendingReturns.length} vestido(s)</span> devem retornar hoje.
                  </p>
                  <button onClick={() => navigate('/aluguel')} className="w-full py-4 bg-rose-600 text-white rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95">Confirmar Check-in</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-emerald-500" size={14} />
                  <p className="text-[10px] font-bold text-secondary-400 uppercase italic">Logística em Dia</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}