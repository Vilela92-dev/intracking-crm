import React, { useState, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  Download,
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
// Importação da nossa API centralizada
import api from '../services/api'; 

export function Relatorios() {
  const [activeTab, setActiveTab] = useState('estoque');
  const [movimentacoesEstoque, setMovimentacoesEstoque] = useState([]);
  const [movimentacoesFinanceiras, setMovimentacoesFinanceiras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Substituído fetch(localhost) por api.get()
        const [resEstoque, resFinanceiro] = await Promise.all([
          api.get('/reports/stock-movements'),
          api.get('/finance/bills')
        ]);

        // No Axios, os dados chegam direto em .data
        const estoqueData = resEstoque.data;
        const financeiroData = resFinanceiro.data;

        // Ordenando por data mais recente primeiro
        const estoqueOrdenado = (estoqueData.data || []).sort((a, b) => new Date(b.data) - new Date(a.data));
        const financeiroOrdenado = (financeiroData.data || []).sort((a, b) => new Date(b.dueDate || b.createdAt) - new Date(a.dueDate || a.createdAt));

        setMovimentacoesEstoque(estoqueOrdenado);
        setMovimentacoesFinanceiras(financeiroOrdenado);
      } catch (err) {
        console.error("Erro na busca:", err);
        setError("Erro ao carregar dados. Verifique a conexão com o servidor.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // Cálculos de Fluxo de Caixa
  const totalReceitas = movimentacoesFinanceiras
    .filter(f => f.type === 'receita' && f.status === 'PAGO')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  const totalDespesas = movimentacoesFinanceiras
    .filter(f => f.type === 'despesa' && f.status === 'PAGO')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  const saldoEmCaixa = totalReceitas - totalDespesas;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-secondary-400">
        <Loader2 className="animate-spin mb-4 text-primary-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sincronizando Ateliê...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-secondary-900 uppercase italic tracking-tighter leading-none">Intelligence</h2>
          <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.4em] mt-2">Relatórios de Alta Performance</p>
        </div>
        
        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-secondary-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-secondary-500 hover:bg-secondary-50 transition-all shadow-sm">
          <Download size={14}/> Exportar Dados
        </button>
      </div>

      {/* TABS NAVEGAÇÃO */}
      <div className="flex gap-8 border-b border-secondary-100">
        <button 
          onClick={() => setActiveTab('estoque')}
          className={`pb-4 px-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'estoque' ? 'text-primary-600' : 'text-secondary-400'}`}
        >
          <Package size={14} /> Movimentação de Materiais
          {activeTab === 'estoque' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-600 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('financeiro')}
          className={`pb-4 px-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'financeiro' ? 'text-primary-600' : 'text-secondary-400'}`}
        >
          <DollarSign size={14} /> Fluxo de Caixa
          {activeTab === 'financeiro' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-600 rounded-t-full" />}
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'estoque' && (
          <div className="bg-white rounded-[2.5rem] border border-secondary-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary-50/20">
                  <th className="px-8 py-4 text-[9px] font-black text-secondary-400 uppercase">Data</th>
                  <th className="px-8 py-4 text-[9px] font-black text-secondary-400 uppercase">Item / Operação</th>
                  <th className="px-8 py-4 text-[9px] font-black text-secondary-400 uppercase">Qtd</th>
                  <th className="px-8 py-4 text-[9px] font-black text-secondary-400 uppercase text-right">Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-50">
                {movimentacoesEstoque.length > 0 ? (
                  movimentacoesEstoque.map((mov) => (
                    <tr key={mov.id} className="hover:bg-secondary-50/50 transition-all">
                      <td className="px-8 py-5 text-[10px] font-bold text-secondary-400 italic">
                        {new Date(mov.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-secondary-900 uppercase tracking-tight">{mov.item}</span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${mov.tipo === 'entrada' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                            {mov.tipo}
                          </span>
                        </div>
                        <p className="text-[9px] text-secondary-400 font-bold uppercase mt-0.5">{mov.origem_destino}</p>
                      </td>
                      <td className={`px-8 py-5 text-xs font-black ${mov.tipo === 'saida' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {mov.tipo === 'saida' ? '-' : '+'} {mov.qtd}
                      </td>
                      <td className="px-8 py-5 text-right font-black text-secondary-300 text-[10px] tracking-widest">{mov.doc_referencia}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="px-8 py-20 text-center text-[10px] font-black text-secondary-300 uppercase tracking-widest">Aguardando primeiras movimentações...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm">
                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={12} className="text-emerald-500"/> Entradas (Pagas)
                </p>
                <p className="text-3xl font-black text-emerald-600 italic">{formatCurrency(totalReceitas)}</p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm">
                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingDown size={12} className="text-rose-500"/> Saídas (Pagas)
                </p>
                <p className="text-3xl font-black text-rose-600 italic">{formatCurrency(totalDespesas)}</p>
              </div>
              <div className="bg-secondary-900 p-8 rounded-[2.5rem] shadow-xl text-white">
                <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Disponibilidade Real</p>
                <p className="text-3xl font-black text-white italic">{formatCurrency(saldoEmCaixa)}</p>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-secondary-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary-50/20">
                    <th className="px-8 py-4 text-[9px] font-black text-secondary-400 uppercase">Vencimento</th>
                    <th className="px-8 py-4 text-[9px] font-black text-secondary-400 uppercase">Descrição / Cliente</th>
                    <th className="px-8 py-4 text-[9px] font-black text-secondary-400 uppercase">Status</th>
                    <th className="px-8 py-4 text-[9px] font-black text-secondary-400 uppercase text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-50">
                  {movimentacoesFinanceiras.length > 0 ? (
                    movimentacoesFinanceiras.map((mov) => (
                      <tr key={mov.id} className="hover:bg-secondary-50/50 transition-all">
                        <td className="px-8 py-5 text-[10px] font-bold text-secondary-400 italic">
                          {new Date(mov.dueDate || mov.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-secondary-900 uppercase tracking-tight block">{mov.description}</span>
                          {mov.customerName && <span className="text-[9px] text-primary-600 font-bold uppercase italic">{mov.customerName}</span>}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase ${mov.status === 'PAGO' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {mov.status}
                          </span>
                        </td>
                        <td className={`px-8 py-5 text-right font-black text-sm ${mov.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {mov.type === 'receita' ? '+' : '-'} {formatCurrency(mov.value)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="px-8 py-20 text-center text-[10px] font-black text-secondary-300 uppercase tracking-widest">Nenhuma transação financeira encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}