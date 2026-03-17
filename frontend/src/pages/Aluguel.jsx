import React, { useState, useEffect, useMemo } from 'react';
import { Package, Trash2, Loader2, Receipt, Calculator, Calendar, CheckCircle2, AlertCircle, X } from 'lucide-react';

const Aluguel = () => {
  const [rentals, setRentals] = useState([]);
  const [availableDresses, setAvailableDresses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issubmitting, setIsSubmitting] = useState(false);
  
  // Estados para o Modal de Devolução
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [returnStatus, setReturnStatus] = useState('AVAILABLE');

  const [formData, setFormData] = useState({
    productId: '',
    customerId: '',
    customerName: '',
    totalValue: 0,
    valorEntrada: 0,
    numParcelas: 1,
    dataProva: '',
    dataRetirada: '',
    dataDevolucao: '',
    dataCasamento: ''
  });

  const [listaParcelas, setListaParcelas] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Radar de Pendências (Filtra quem deve devolver hoje ou antes e ainda está ativo)
  const pendencias = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return rentals.filter(r => {
      if (!r.dataDevolucao || r.status === 'RETURNED') return false;
      const dataDev = new Date(r.dataDevolucao);
      return dataDev <= hoje;
    });
  }, [rentals]);

  useEffect(() => {
    const saldo = Number(formData.totalValue) - Number(formData.valorEntrada);
    const n = parseInt(formData.numParcelas);

    if (saldo > 0) {
      const valorCada = (saldo / n).toFixed(2);
      
      setListaParcelas(prev => {
        const novasParcelas = [];
        for (let i = 1; i <= n; i++) {
          const parcelaExistente = prev.find(p => p.numero === i);
          let dataVencimento = parcelaExistente?.vencimento;

          if (!dataVencimento) {
            const data = new Date();
            data.setMonth(data.getMonth() + i);
            dataVencimento = data.toISOString().split('T')[0];
          }

          novasParcelas.push({
            numero: i,
            valor: parseFloat(valorCada),
            vencimento: dataVencimento
          });
        }
        return novasParcelas;
      });
    } else {
      setListaParcelas([]);
    }
  }, [formData.totalValue, formData.valorEntrada, formData.numParcelas]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, rentRes, custRes] = await Promise.all([
        fetch('http://localhost:3000/api/v1/products/rentables'), 
        fetch('http://localhost:3000/api/v1/rentals'),
        fetch('http://localhost:3000/api/v1/crm/customers')
      ]);
      
      const prods = await prodRes.json();
      const rents = await rentRes.json();
      const custs = await custRes.json();

      const vestidosApenas = (prods.data || []).filter(p => 
        (p.tag?.toLowerCase() === 'vestido' || p.category === 'PEÇA_PRONTA') && 
        Number(p.price) > 100
      );

      setAvailableDresses(vestidosApenas);
      setRentals(rents.data || []);
      setCustomers(custs.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedRental) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/v1/rentals/${selectedRental.id}/return`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusEstoque: returnStatus })
      });

      if (response.ok) {
        setShowReturnModal(false);
        setSelectedRental(null);
        fetchData();
        alert("Devolução registrada e estoque atualizado!");
      }
    } catch (error) {
      alert("Erro ao registrar devolução.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerSelect = (name) => {
    const customer = customers.find(c => c.name === name);
    if (customer) {
      const dataCasamentoBase = customer.eventDate || customer.dataCasamento || '';
      const dataProvaBase = customer.trialDate || customer.dataProva || '';

      let sugerirRetirada = '';
      let sugerirDevolucao = '';

      if (dataCasamentoBase) {
        const dateObj = new Date(dataCasamentoBase);
        const r = new Date(dateObj);
        r.setDate(dateObj.getDate() - 2);
        sugerirRetirada = r.toISOString().split('T')[0];

        const d = new Date(dateObj);
        d.setDate(dateObj.getDate() + 2);
        sugerirDevolucao = d.toISOString().split('T')[0];
      }

      setFormData(prev => ({
        ...prev,
        customerName: name,
        customerId: customer.id,
        dataCasamento: dataCasamentoBase,
        dataProva: dataProvaBase,
        dataRetirada: sugerirRetirada,
        dataDevolucao: sugerirDevolucao
      }));
    } else {
      setFormData(prev => ({ ...prev, customerName: name }));
    }
  };

  const handleDressSelect = (id) => {
    const selected = availableDresses.find(d => String(d.id) === String(id));
    if (selected) {
      setFormData(prev => ({ 
        ...prev, 
        productId: id, 
        totalValue: selected.price 
      }));
    }
  };

  const handleCreateRental = async (e) => {
    e.preventDefault();
    if (!formData.productId) return alert("Selecione um vestido!");
    
    setIsSubmitting(true);
    const payload = {
      ...formData,
      totalValue: parseFloat(formData.totalValue),
      valorEntrada: parseFloat(formData.valorEntrada),
      numParcelas: parseInt(formData.numParcelas),
      parcelasAgendadas: listaParcelas,
      items: [{ productId: formData.productId, quantity: 1 }]
    };

    try {
      const response = await fetch('http://localhost:3000/api/v1/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Contrato Fechado com Sucesso!");
        setFormData({ 
          productId: '', customerId: '', customerName: '', totalValue: 0, 
          valorEntrada: 0, numParcelas: 1, dataProva: '', dataRetirada: '', dataDevolucao: '', dataCasamento: '' 
        });
        setListaParcelas([]);
        fetchData();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRental = async (rentId) => {
    if (!window.confirm("Deseja estornar este aluguel?")) return;
    await fetch(`http://localhost:3000/api/v1/rentals/${rentId}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-purple-600"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-8 bg-[#F8F9FD] min-h-screen font-sans text-left">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">Atelier Pro</h1>
        <p className="text-slate-500 font-medium italic">Gestão de Aluguéis & Finanças</p>
      </header>

      {/* RADAR DE PENDÊNCIAS (OPÇÃO B) */}
      {pendencias.length > 0 && (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <h2 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <AlertCircle size={14} /> Radar de Devoluções Pendentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendencias.map(p => (
              <div key={p.id} className="bg-white border-l-4 border-rose-500 p-5 rounded-2xl shadow-sm flex justify-between items-center group">
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase italic">{p.customerName}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Venceu em: {new Date(p.dataDevolucao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button 
                  onClick={() => { setSelectedRental(p); setShowReturnModal(true); }}
                  className="bg-slate-900 text-white p-2 px-4 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={14} /> Receber
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
            <h2 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
              <Package size={18} className="text-purple-500" /> Detalhes do Contrato
            </h2>

            <form onSubmit={handleCreateRental} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Vestido / Peça Pronta</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-600 focus:ring-2 focus:ring-purple-400 outline-none" 
                  value={formData.productId} 
                  onChange={(e) => handleDressSelect(e.target.value)} 
                  required
                >
                  <option value="">Selecione o Vestido</option>
                  {availableDresses.map(d => (
                    <option key={d.id} value={d.id}>{d.name} — R$ {Number(d.price).toLocaleString('pt-BR')}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cliente (CRM)</label>
                <input 
                  list="customers" 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-purple-400 outline-none" 
                  placeholder="Pesquisar cliente..." 
                  value={formData.customerName} 
                  onChange={(e) => handleCustomerSelect(e.target.value)} 
                  required 
                />
                <datalist id="customers">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase">Prova Final</label>
                  <input type="date" className="w-full p-2 bg-transparent border-b border-slate-200 outline-none font-bold text-xs" value={formData.dataProva} onChange={(e) => setFormData({...formData, dataProva: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-blue-400 uppercase">Retirada</label>
                  <input type="date" className="w-full p-2 bg-transparent border-b border-blue-100 outline-none font-bold text-xs text-blue-600" value={formData.dataRetirada} onChange={(e) => setFormData({...formData, dataRetirada: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-rose-400 uppercase">Devolução</label>
                  <input type="date" className="w-full p-2 bg-transparent border-b border-rose-100 outline-none font-bold text-xs text-rose-600" value={formData.dataDevolucao} onChange={(e) => setFormData({...formData, dataDevolucao: e.target.value})} />
                </div>
              </div>

              <div className="mt-6 bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase block tracking-widest">Financeiro</span>
                    <h3 className="text-lg font-black italic">Parcelamento</h3>
                  </div>
                  <Calculator size={24} className="text-emerald-400" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800 p-4 rounded-3xl border border-slate-700">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Entrada</label>
                    <div className="flex items-center gap-1 font-black text-xl">
                      <span className="text-sm text-slate-500">R$</span>
                      <input type="number" className="w-full bg-transparent border-none p-0 outline-none text-emerald-400" value={formData.valorEntrada} onChange={(e) => setFormData({...formData, valorEntrada: e.target.value})} />
                    </div>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-3xl border border-slate-700">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Parcelas</label>
                    <select className="w-full bg-transparent border-none p-0 font-black text-xl outline-none appearance-none cursor-pointer" value={formData.numParcelas} onChange={(e) => setFormData({...formData, numParcelas: e.target.value})}>
                      {[1,2,3,4,5,6,8,10,12].map(n => <option key={n} value={n} className="text-slate-900">{n}x</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-[1.5rem] overflow-hidden border border-slate-700/50 mb-6">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-800/80 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Parc.</th>
                        <th className="px-4 py-3">Vencimento</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaParcelas.map((p, idx) => (
                        <tr key={idx} className="border-t border-slate-700/30">
                          <td className="px-4 py-3 font-bold text-slate-400">{p.numero}ª</td>
                          <td className="px-4 py-3">
                            <input 
                              type="date" 
                              style={{ colorScheme: 'dark' }}
                              className="bg-transparent border-none text-emerald-400 font-bold outline-none cursor-pointer" 
                              value={p.vencimento} 
                              onChange={(e) => {
                                const atualizadas = [...listaParcelas];
                                atualizadas[idx].vencimento = e.target.value;
                                setListaParcelas(atualizadas);
                              }} 
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-black text-white italic">R$ {p.valor.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total</p>
                    <p className="text-3xl font-black text-white italic">R$ {Number(formData.totalValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>
                  <button 
                    type="submit" 
                    disabled={issubmitting} 
                    className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {issubmitting ? "Gravando..." : "Fechar Contrato"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase">
              <Receipt className="text-purple-600" /> Contratos em Aberto
            </h2>
            <span className="bg-white px-4 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-200">{rentals.filter(r => r.status !== 'RETURNED').length} ATIVOS</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rentals.filter(r => r.status !== 'RETURNED').map(rent => (
              <div key={rent.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <button onClick={() => handleDeleteRental(rent.id)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors bg-slate-50 rounded-xl opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                <div className="flex items-center gap-4 mb-6 text-left">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 font-black text-lg">{rent.customerName?.charAt(0)}</div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base leading-tight italic uppercase">{rent.customerName}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {rent.id.substring(0,8)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-blue-50/50 p-3 rounded-2xl text-center">
                    <p className="text-[8px] font-black text-blue-400 uppercase">Retirada</p>
                    <p className="text-xs font-bold text-blue-700">{rent.dataRetirada ? new Date(rent.dataRetirada).toLocaleDateString('pt-BR') : '--'}</p>
                  </div>
                  <div className="bg-rose-50/50 p-3 rounded-2xl text-center">
                    <p className="text-[8px] font-black text-rose-400 uppercase">Devolução</p>
                    <p className="text-xs font-bold text-rose-700">{rent.dataDevolucao ? new Date(rent.dataDevolucao).toLocaleDateString('pt-BR') : '--'}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="font-black text-[10px] text-slate-400 uppercase">Investimento</span>
                  <span className="font-black text-slate-800 text-lg italic">R$ {Number(rent.totalValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DE CHECK-IN (VISTORIA) */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Receber Peça</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <p className="text-xs font-bold text-slate-500 mb-6 uppercase">
              Confirme o estado do vestido da cliente <span className="text-purple-600">{selectedRental?.customerName}</span> para atualizar o estoque:
            </p>

            <div className="space-y-3 mb-8">
              {[
                { id: 'AVAILABLE', label: 'Perfeito Estado (Arara)', color: 'text-emerald-500', desc: 'Disponível imediatamente' },
                { id: 'MAINTENANCE', label: 'Precisa de Reparos', color: 'text-amber-500', desc: 'Indisponível para aluguel' },
                { id: 'LAUNDRY', label: 'Encaminhar Lavanderia', color: 'text-blue-500', desc: 'Aguardando higienização' }
              ].map(status => (
                <div 
                  key={status.id}
                  onClick={() => setReturnStatus(status.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${returnStatus === status.id ? 'border-purple-600 bg-purple-50' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className={`w-3 h-3 rounded-full bg-current ${status.color}`} />
                  <div className="text-left">
                    <p className={`font-black text-xs uppercase ${status.color}`}>{status.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{status.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleCheckIn}
              disabled={issubmitting}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {issubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar Recebimento'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Aluguel;