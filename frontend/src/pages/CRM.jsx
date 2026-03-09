import { useEffect, useState, useCallback, useMemo } from 'react'
import { 
  Plus, Users, Calendar, Trash2, Edit3, Loader2, X, 
  Phone, CheckCircle2, Ruler, Palette, Info, Save, Image as ImageIcon,
  ChevronRight, Clock, Calculator, Ban, ShoppingBag, MessageCircle, CalendarDays, Send,
  FileText, CheckCircle, History, TrendingUp, AlertCircle, ClipboardCheck, Link as LinkIcon, 
  ExternalLink, FileDown, Share2, Printer
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'

/**
 * COMPONENTE CRM - GESTÃO DE NOIVAS, MEDIDAS E ORÇAMENTOS
 * Integração com Backend Node.js (v1)
 */
export function CRM() {
  const [searchParams] = useSearchParams()
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(null)
  const [viewMode, setViewMode] = useState('CARDS') 
  const [activeTab, setActiveTab] = useState('DADOS')
  
  // Contexto para saber qual prova está disparando a medição atual
  const [selectedTrialContext, setSelectedTrialContext] = useState(null)

  // Estrutura padrão de medidas (vazio)
  const emptyMeasurements = {
    pescoco: '', entreCavas: '', distanciaBusto: '', alturaBusto: '', raioBusto: '',
    alturaCorpoFrente: '', ombro: '', circunferenciaBusto: '', circunferenciaCintura: '',
    lateralAlturaCava: '', costado: '', alturaMeioCostas: '', alturaCorpoCostas: '',
    quadril: '', alturaQuadril: '', larguraQuadril: '', comprimentoLongoSaia: '',
    observacoes: ''
  }

  // Estado inicial do formulário de Noiva
  const initialForm = {
    name: '', 
    phone: '', 
    eventDate: '', 
    weddingTime: '', // Campo para horário do evento
    status: 'PROSPECÇÃO',
    trials: [], 
    sketchUrl: '', 
    measurements: { ...emptyMeasurements },
    measurementsHistory: [],
    budget: { items: [], laborCost: 0, markup: 100, status: 'PENDENTE' }
  }

  const [formData, setFormData] = useState(initialForm)

  // ==========================================
  // BUSCA DE DADOS (API)
  // ==========================================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [custRes, prodRes] = await Promise.all([
        api.get('/crm/customers'),
        api.get('/products')
      ])
      const fetchedCustomers = custRes.data.data || custRes.data || []
      setCustomers(fetchedCustomers)
      setProducts(prodRes.data.data || prodRes.data || [])

      // Auto-abre noiva se houver ID na URL (Deep Linking)
      const customerIdFromUrl = searchParams.get('id')
      if (customerIdFromUrl) {
        const noiva = fetchedCustomers.find(c => String(c.id) === String(customerIdFromUrl))
        if (noiva) handleEdit(noiva)
      }
    } catch (err) { 
      console.error("Erro ao buscar dados:", err) 
    } finally { setLoading(false) }
  }, [searchParams])

  useEffect(() => { fetchData() }, [fetchData])

  // ==========================================
  // LÓGICA DE NEGÓCIO E PERSISTÊNCIA
  // ==========================================

  /**
   * Salva ou Atualiza o registro da Noiva.
   * @param {boolean} forceSnapshot - Se true, o backend criará uma cópia das medidas no histórico.
   */
  const handleSubmit = async (e, forceSnapshot = false) => {
    if (e) e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        totalValue: precoFinal, 
        costValue: custoTotal,
        saveSnapshot: forceSnapshot, // Envia comando para o backend gerar histórico
        status: isEditing ? formData.status : 'PROSPECÇÃO' 
      }
      
      if (isEditing) {
        await api.put(`/crm/customers/${isEditing}`, payload)
      } else {
        await api.post('/crm/customers', payload)
      }

      if (e) { // Se for submit via botão "Salvar Registro"
        closeForm(); 
        fetchData();
        alert("Cadastro salvo com sucesso!")
      }
    } catch (err) { alert("Erro ao salvar cadastro.") }
  }

  /**
   * Dispara o backup das medidas atuais para a timeline (Histórico).
   */
  const handleSaveSnapshot = async () => {
    // Label para identificar a medição no histórico
    const trialLabel = selectedTrialContext 
      ? `Prova ${selectedTrialContext.index} (${new Date(selectedTrialContext.date).toLocaleDateString('pt-BR')})`
      : "Medição Avulsa";
    
    // Atualizamos localmente para feedback visual e enviamos para o servidor
    await handleSubmit(null, true);
    
    setSelectedTrialContext(null);
    fetchData(); // Recarrega para trazer o novo histórico do banco
    alert(`Snapshot "${trialLabel}" registrado no histórico!`);
  }

  // ==========================================
  // HELPERS DE UI
  // ==========================================

  const handleWhatsApp = (phone, name) => {
    if (!phone) return alert("Por favor, insira um número de telefone.");
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name || 'Noiva'}, tudo bem?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  const handleStartTrialMeasurement = (trialDate, index) => {
    setSelectedTrialContext({ date: trialDate, index: index + 1 });
    setActiveTab('MEDIDAS'); 
  }

  // Cálculos dinâmicos de orçamento (Insumos + Mão de Obra + Markup)
  const subtotalInsumos = useMemo(() => (formData.budget?.items || []).reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0), [formData.budget?.items])
  const custoTotal = useMemo(() => subtotalInsumos + Number(formData.budget?.laborCost || 0), [subtotalInsumos, formData.budget?.laborCost])
  const precoFinal = useMemo(() => {
    const markupVal = Number(formData.budget?.markup || 0)
    return custoTotal + (custoTotal * (markupVal / 100))
  }, [custoTotal, formData.budget?.markup])

  const handleEdit = (noiva) => {
    setIsEditing(noiva.id)
    setFormData({
      ...initialForm, ...noiva,
      measurements: { ...initialForm.measurements, ...(noiva.measurements || {}) },
      budget: { ...initialForm.budget, ...(noiva.budget || {}) }
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false); setIsEditing(null); setActiveTab('DADOS');
    setFormData(initialForm); setSelectedTrialContext(null);
  }

  const handleDelete = async (id) => {
    if(!window.confirm("Deseja excluir permanentemente esta noiva?")) return
    try {
      await api.delete(`/crm/customers/${id}`)
      setCustomers(prev => prev.filter(c => c.id !== id))
    } catch (err) { alert("Erro ao deletar registro.") }
  }

  /**
   * Finaliza orçamento, gera reserva de estoque e abre PDF para impressão.
   */
  const handleFinalizeQuote = async () => {
    if (!isEditing) return alert("Salve o registro da noiva primeiro.");
    if (formData.budget.items.length === 0) return alert("Adicione insumos ao orçamento.");

    try {
      await handleSubmit(); // Salva estado atual
      const quotePayload = {
        customerId: isEditing,
        customerName: formData.name,
        items: formData.budget.items,
        laborCost: formData.budget.laborCost,
        totalValue: precoFinal,
        status: 'PENDENTE'
      };

      await api.post('/quotes', quotePayload);
      setFormData(prev => ({ ...prev, status: 'ORÇAMENTO' }));
      
      alert("Orçamento gerado! Abrindo para impressão...");
      window.open(`${api.defaults.baseURL}/quotes/${isEditing}/print`, '_blank');
      fetchData();
    } catch (error) { alert("Erro ao processar orçamento."); }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  return (
    <div className="space-y-6 p-2">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-secondary-100 gap-4">
        <div>
          <h1 className="text-2xl font-black text-secondary-900 flex items-center gap-2 italic uppercase tracking-tighter">
            <Users className="text-indigo-600" size={28} /> Ateliê CRM
          </h1>
          <div className="flex gap-4 mt-3">
             <button onClick={() => setViewMode('CARDS')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'CARDS' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-secondary-400'}`}>Noivas</button>
             <button onClick={() => window.location.href='/agenda'} className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Agenda</button>
          </div>
        </div>
        <button onClick={() => { if(showForm) closeForm(); else setShowForm(true); }} className="bg-secondary-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 flex items-center gap-2 shadow-xl transition-all">
          {showForm ? <><X size={18}/> Fechar</> : <><Plus size={18}/> Nova Noiva</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-secondary-100 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
           {/* NAVEGAÇÃO DE ABAS */}
           <div className="flex bg-secondary-50 border-b border-secondary-100 overflow-x-auto">
             {[
               { id: 'DADOS', icon: Info, label: 'Dados e Cronograma' },
               { id: 'MEDIDAS', icon: Ruler, label: 'Medidas' },
               { id: 'DESIGN', icon: Palette, label: 'Design' },
               { id: 'ORCAMENTO', icon: Calculator, label: 'Orçamento' }
             ].map(tab => (
               <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[150px] py-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-secondary-400'}`}>
                 <tab.icon size={16}/> {tab.label}
               </button>
             ))}
           </div>

           <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* ABA 1: DADOS E CRONOGRAMA */}
              {activeTab === 'DADOS' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-secondary-400 uppercase">Nome da Noiva</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-secondary-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-secondary-400 uppercase">WhatsApp</label>
                      <div className="relative flex items-center">
                        <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-secondary-50 rounded-2xl font-bold text-indigo-600 outline-none pr-14" />
                        <button type="button" onClick={() => handleWhatsApp(formData.phone, formData.name)} className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-md">
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    </div>

                    {/* SELETOR DE DATA E HORA (PONTO 1 DAS INSTRUÇÕES) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-secondary-400 uppercase">Data e Hora Casamento</label>
                      <div className="flex gap-2">
                        <input type="date" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} className="flex-1 p-4 bg-indigo-50 rounded-2xl font-black text-indigo-600 outline-none" />
                        <input type="time" value={formData.weddingTime} onChange={e => setFormData({...formData, weddingTime: e.target.value})} className="w-24 p-4 bg-indigo-50 rounded-2xl font-black text-indigo-600 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* DATAS DE PROVA */}
                  <div className="bg-secondary-50 p-8 rounded-[2.5rem] border border-secondary-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-[11px] font-black text-secondary-900 uppercase italic flex items-center gap-2">
                        <CalendarDays className="text-indigo-600" size={18}/> Cronograma de Provas
                      </h3>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, trials: [...p.trials, ""] }))} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">+ Adicionar Prova</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {formData.trials.map((trial, index) => {
                        const jaMediu = formData.measurementsHistory?.some(h => h.trialReference === trial);
                        return (
                          <div key={index} className="bg-white p-5 rounded-2xl border-2 border-transparent hover:border-indigo-100 transition-all shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <p className="text-[10px] font-black text-indigo-600">PROVA {index + 1}</p>
                              <button type="button" onClick={() => setFormData(p => ({ ...p, trials: p.trials.filter((_, i) => i !== index) }))} className="text-rose-300 hover:text-rose-600"><Trash2 size={14}/></button>
                            </div>
                            <input type="date" value={trial} onChange={e => {
                              const n = [...formData.trials]; n[index] = e.target.value;
                              setFormData(p => ({ ...p, trials: n }))
                            }} className="w-full text-sm font-black outline-none mb-4" />
                            {trial && (
                              <button type="button" onClick={() => handleStartTrialMeasurement(trial, index)}
                                className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${jaMediu ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-secondary-900 text-white hover:bg-indigo-600'}`}>
                                {jaMediu ? <><ClipboardCheck size={14}/> Medidas Lançadas</> : <><Ruler size={14}/> Lançar Medidas</>}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: MEDIDAS E HISTÓRICO SNAPSHOT (PONTO 2 DAS INSTRUÇÕES) */}
              {activeTab === 'MEDIDAS' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-4">
                   <div className="lg:col-span-7 space-y-6">
                      <div className="flex justify-between items-center border-b-2 border-secondary-100 pb-4">
                        <h3 className="text-secondary-900 font-black text-lg uppercase italic tracking-tighter">
                          {selectedTrialContext ? `Lançando: Prova ${selectedTrialContext.index}` : 'Tabela de Medidas'}
                        </h3>
                        {/* BOTÃO QUE ACIONA O BACKUP AUTOMÁTICO DO BACKEND */}
                        <button type="button" onClick={handleSaveSnapshot} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg">
                          <History size={18}/> Salvar e Gerar Snapshot
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.keys(formData.measurements).filter(k => k !== 'observacoes').map(f => (
                           <div key={f} className="space-y-1">
                             <label className="text-[9px] font-black text-secondary-400 uppercase block ml-1">{f}</label>
                             <input value={formData.measurements[f]} onChange={e => setFormData(prev => ({...prev, measurements: {...prev.measurements, [f]: e.target.value}}))} className="w-full p-3 bg-secondary-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold text-sm outline-none" />
                           </div>
                        ))}
                      </div>
                   </div>
                   
                   {/* TIMELINE DE EVOLUÇÃO (DADOS VINDOS DO BACKEND) */}
                   <div className="lg:col-span-5 bg-secondary-50 rounded-[2.5rem] p-6 border border-secondary-100">
                      <h3 className="text-secondary-900 font-black text-sm uppercase italic flex items-center gap-2 mb-6">
                        <TrendingUp className="text-indigo-600" size={18}/> Histórico de Evolução
                      </h3>
                      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.measurementsHistory?.length > 0 ? formData.measurementsHistory.map((snap, i) => (
                          <div key={i} className="relative pl-8 border-l-2 border-indigo-200 py-2">
                             <div className="absolute -left-[9px] top-4 w-4 h-4 bg-indigo-600 rounded-full ring-4 ring-white" />
                             <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg">Snapshot {new Date(snap.date).toLocaleDateString()}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-secondary-600 uppercase">
                                   <div>Busto: {snap.data?.circunferenciaBusto || '-'}</div>
                                   <div>Cintura: {snap.data?.circunferenciaCintura || '-'}</div>
                                   <div>Quadril: {snap.data?.quadril || '-'}</div>
                                </div>
                             </div>
                          </div>
                        )) : (
                          <p className="text-[10px] font-black text-secondary-400 uppercase text-center py-10">Nenhum snapshot registrado ainda.</p>
                        )}
                      </div>
                   </div>
                </div>
              )}

              {/* ABA 3: DESIGN (CROQUI) */}
              {activeTab === 'DESIGN' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-secondary-50 p-8 rounded-[2.5rem] border border-secondary-100">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-[11px] font-black text-secondary-900 uppercase italic flex items-center gap-2">
                         <Palette className="text-indigo-600" size={18}/> Design e Croqui
                       </h3>
                       {formData.sketchUrl && (
                         <button type="button" onClick={() => window.open(formData.sketchUrl, '_blank')} className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 hover:underline">
                           Abrir Original <ExternalLink size={14}/>
                         </button>
                       )}
                    </div>
                    <input placeholder="URL do Croqui (Canva ou Imagem)..." value={formData.sketchUrl} onChange={e => setFormData({...formData, sketchUrl: e.target.value})} className="w-full p-4 bg-white rounded-2xl font-bold text-indigo-600 outline-none border-2 border-transparent focus:border-indigo-600" />
                  </div>
                  <div className="bg-secondary-50 rounded-[3rem] border-2 border-dashed border-secondary-200 min-h-[500px] flex items-center justify-center overflow-hidden">
                    {formData.sketchUrl ? (
                      formData.sketchUrl.includes('canva.com') ? (
                        <iframe src={`${formData.sketchUrl.split('?')[0]}/view?embed`} className="w-full h-[600px] border-none rounded-[2.5rem]" allowFullScreen />
                      ) : (
                        <img src={formData.sketchUrl} alt="Croqui" className="max-w-full max-h-[600px] object-contain shadow-2xl rounded-2xl" onError={(e) => { e.target.src = "https://placehold.co/600x400?text=Erro+ao+carregar+imagem"; }} />
                      )
                    ) : (
                      <div className="text-center space-y-4 opacity-30">
                        <ImageIcon size={64} className="mx-auto" />
                        <p className="text-xs font-black uppercase tracking-widest">Aguardando Croqui</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 4: ORÇAMENTO (CALCULADORA) */}
              {activeTab === 'ORCAMENTO' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in zoom-in">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase text-indigo-600">Composição do Vestido (Insumos)</label>
                    <select className="w-full p-4 bg-secondary-900 text-white rounded-2xl font-bold text-xs outline-none shadow-lg" onChange={(e) => {
                        const product = products.find(p => p.id === e.target.value);
                        if(product) setFormData(prev => ({...prev, budget: {...prev.budget, items: [...(prev.budget?.items || []), { productId: product.id, name: product.name, price: product.price, quantity: 1 }]}}))
                    }}>
                      <option value="">+ Selecionar Insumo/Produto</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
                    </select>
                    <div className="space-y-3 custom-scrollbar overflow-y-auto max-h-[400px] pr-2">
                      {(formData.budget?.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-secondary-100 shadow-sm">
                           <div className="flex-1">
                             <p className="text-xs font-black text-secondary-900 uppercase">{item.name}</p>
                             <p className="text-[10px] font-bold text-indigo-600">{formatCurrency(item.price)}</p>
                           </div>
                           <input type="number" value={item.quantity} onChange={e => {
                             const n = [...formData.budget.items]; n[idx].quantity = Number(e.target.value);
                             setFormData(p => ({...p, budget: {...p.budget, items: n}}))
                           }} className="w-16 p-2 bg-secondary-50 rounded-lg text-center font-black text-xs mr-4" />
                           <button type="button" onClick={() => setFormData(p => ({...p, budget: {...p.budget, items: p.budget.items.filter((_, i) => i !== idx)}}))} className="text-rose-400"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* CARD DE RESUMO FINANCEIRO */}
                  <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-between">
                     <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-white/20 pb-4">
                           <span className="text-[10px] font-black uppercase tracking-widest">Mão de Obra / Confecção</span>
                           <input type="number" value={formData.budget?.laborCost || 0} onChange={e => setFormData(p => ({...p, budget: {...p.budget, laborCost: e.target.value}}))} className="bg-transparent text-right font-black text-xl outline-none w-32" />
                        </div>
                        <div className="flex justify-between items-center border-b border-white/20 pb-4">
                           <span className="text-[10px] font-black uppercase tracking-widest">Markup (%)</span>
                           <input type="number" value={formData.budget?.markup || 100} onChange={e => setFormData(p => ({...p, budget: {...p.budget, markup: e.target.value}}))} className="bg-transparent text-right font-black text-xl outline-none w-32" />
                        </div>
                     </div>
                     <div className="mt-8 space-y-6">
                        <div>
                          <p className="text-[10px] font-black uppercase opacity-60">Valor Final Estimado</p>
                          <h2 className="text-5xl font-black italic tracking-tighter">{formatCurrency(precoFinal)}</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                          <button type="button" onClick={handleFinalizeQuote} className="w-full bg-white text-indigo-600 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-xl group">
                            <FileDown size={20} className="group-hover:scale-110 transition-transform" /> 
                            Finalizar e Imprimir Proposta
                          </button>
                          <p className="text-[8px] text-center uppercase opacity-50 font-black tracking-widest">Gera reserva automática no estoque</p>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {/* AÇÕES FINAIS DO FORMULÁRIO */}
              <div className="flex justify-end gap-4 pt-8 border-t border-secondary-100">
                <button type="button" onClick={closeForm} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase text-secondary-400">Cancelar</button>
                <button type="submit" className="bg-secondary-900 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 shadow-xl flex items-center gap-2">
                   <Save size={18}/> Salvar Registro
                </button>
              </div>
           </form>
        </div>
      )}

      {/* LISTAGEM EM CARDS */}
      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
          {customers.map(noiva => {
            const statusStyle = (s) => {
              if (s === 'CONTRATO FECHADO') return 'bg-emerald-100 text-emerald-700';
              if (s === 'ORÇAMENTO') return 'bg-amber-100 text-amber-700';
              return 'bg-slate-100 text-slate-600';
            };
            return (
              <div key={noiva.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-secondary-100 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden" onClick={() => handleEdit(noiva)}>
                <div className="flex justify-between items-start mb-6">
                   <div className={`${statusStyle(noiva.status)} p-3 rounded-2xl`}>
                     {noiva.status === 'CONTRATO FECHADO' ? <CheckCircle size={20}/> : <Clock size={20}/>}
                   </div>
                   <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleWhatsApp(noiva.phone, noiva.name); }} className="text-emerald-500 hover:bg-emerald-50 p-2 rounded-xl transition-colors"><MessageCircle size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(noiva.id); }} className="text-secondary-200 hover:text-rose-500 p-2 transition-colors"><Trash2 size={18} /></button>
                   </div>
                </div>
                <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tighter mb-1 truncate">{noiva.name}</h3>
                <div className="flex flex-col gap-1 mb-4">
                  <p className="text-[10px] font-black text-indigo-600 uppercase">Data: {noiva.eventDate ? new Date(noiva.eventDate).toLocaleDateString('pt-BR') : 'A definir'}</p>
                  {noiva.weddingTime && <p className="text-[9px] font-bold text-secondary-400 uppercase italic">Hora: {noiva.weddingTime}</p>}
                </div>
                <div className="flex items-center gap-2 text-secondary-400 mb-6">
                  <Phone size={14} /><span className="text-xs font-bold">{noiva.phone || 'Sem contato'}</span>
                </div>
                <div className="pt-6 border-t border-secondary-50 flex justify-between items-center">
                   <span className="text-[9px] font-black uppercase text-secondary-400">{noiva.status}</span>
                   {noiva.sketchUrl && <Palette size={14} className="text-indigo-400" />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>}
    </div>
  )
}