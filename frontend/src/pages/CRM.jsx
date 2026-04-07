import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Plus, Users, Calendar, Trash2, Loader2, X,
  Ruler, Save, Image as ImageIcon,
  Calculator, CalendarDays, TrendingUp, MessageCircle,
  ShoppingCart, FileText, AlertTriangle, History, ChevronDown, ChevronRight, Printer, Share2,
  ExternalLink, Upload, CheckCircle2, FileBadge, PenTool, FileType
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

/**
 * CRM ATELIÊ PRO - Versão 2.4.0 (Full Contract & PDF Support)
 * Diretrizes: Código 100% íntegro, sem simplificações.
 */
export default function CRM() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('DADOS E CRONOGRAMA')
  const [expandedSnapshot, setExpandedSnapshot] = useState(null)

  const emptyMeasurements = {
    pescoco: '', entreCavas: '', distanciaBusto: '', alturaBusto: '', raioBusto: '',
    alturaCorpoFrente: '', ombro: '', circunferenciaBusto: '', circunferenciaCintura: '',
    lateralAlturaCava: '', costado: '', alturaMeioCostas: '', alturaCorpoCostas: '',
    quadril: '', alturaQuadril: '', larguraQuadril: '', comprimentoLongoSaia: '',
    observacoes: ''
  }

  const initialForm = {
    name: '', 
    phone: '', 
    cpf: '', 
    rg: '',  
    address: '', 
    eventDate: '', 
    weddingTime: '',
    projectDescription: '', 
    status: 'PROSPECÇÃO', 
    trials: [], 
    sketchUrl: '',
    trialDate: '', 
    measurements: { ...emptyMeasurements },
    measurementsHistory: [],
    budget: { id: null, items: [], laborCost: 0, markup: 100, status: 'PENDENTE' }
  }

  const [formData, setFormData] = useState(initialForm)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [custRes, prodRes] = await Promise.all([
        api.get('/crm/customers'),
        api.get('/products')
      ])
      setCustomers(custRes.data.data || [])
      setProducts(prodRes.data.data || [])
    } catch (err) {
      console.error("Ateliê PRO - Erro ao carregar dados:", err)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limite de 10MB para suportar PDFs de alta qualidade
    if (file.size > 10 * 1024 * 1024) {
      return alert("Arquivo muito grande. Máximo de 10MB.");
    }

    try {
      setIsUploading(true);
      const data = new FormData();
      data.append('file', file);
      const res = await api.post('/upload', data);
      
      setFormData(prev => ({
        ...prev,
        sketchUrl: res.data.url
      }));
      alert("Documento/Imagem enviado com sucesso!");
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Falha ao subir arquivo. Verifique se o backend aceita o formato selecionado.");
    } finally {
      setIsUploading(false);
    }
  };

  const subtotalInsumos = useMemo(() =>
    (formData.budget?.items || []).reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0),
    [formData.budget?.items]
  )
  const custoTotal = useMemo(() => subtotalInsumos + Number(formData.budget?.laborCost || 0), [subtotalInsumos, formData.budget?.laborCost])
  const precoFinal = useMemo(() => custoTotal + (custoTotal * (Number(formData.budget?.markup || 0) / 100)), [custoTotal, formData.budget?.markup])

  const persistQuoteRecord = async () => {
    let currentCustomerId = isEditing;
    if (!currentCustomerId) {
      try {
        const resNoiva = await api.post('/crm/customers', formData);
        currentCustomerId = resNoiva.data.id;
        setIsEditing(currentCustomerId);
      } catch (err) {
        alert("Erro ao salvar noiva antes de gerar o orçamento.");
        return null;
      }
    }

    try {
      const quotePayload = {
        customerId: currentCustomerId,
        customerName: formData.name,
        items: formData.budget.items,
        projectDescription: formData.projectDescription,
        totalValue: precoFinal,
        laborCost: formData.budget.laborCost,
        markup: formData.budget.markup,
        status: formData.budget.status || 'PENDENTE'
      };

      if (formData.budget?.id) {
        const res = await api.put(`/quotes/${formData.budget.id}`, quotePayload);
        return { ...res.data, id: formData.budget.id };
      } else {
        const res = await api.post('/quotes', quotePayload);
        setFormData(prev => ({ ...prev, budget: { ...prev.budget, id: res.data.id } }));
        return res.data;
      }
    } catch (err) {
      console.error("Erro ao persistir orçamento:", err);
      return null;
    }
  };

  const handlePrintQuote = async () => {
    setIsSaving(true);
    const savedQuote = await persistQuoteRecord();
    setIsSaving(false);
    if (savedQuote && (savedQuote.id || savedQuote._id)) {
      const id = savedQuote.id || savedQuote._id;
      window.open(`${api.defaults.baseURL}/quotes/${id}/print`, '_blank');
    }
  }

  const handleGoToQuotes = async () => {
    setIsSaving(true);
    const savedQuote = await persistQuoteRecord();
    setIsSaving(false);
    if (savedQuote) navigate('/orcamentos');
  }

  const handleShareWhatsApp = () => {
    if (!formData.phone) return alert("Cliente sem WhatsApp cadastrado.");
    const cleanPhone = formData.phone.replace(/\D/g, '');
    const text = `Olá ${formData.name}!\nSegue o orçamento do seu projeto exclusivo: ${new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(precoFinal)}.`;
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  const handleSubmit = async (e, forceSnapshot = false) => {
    if (e) e.preventDefault();
    if (!formData.name) return alert("O nome da noiva é obrigatório.");

    try {
      setIsSaving(true);
      const payload = { ...formData, saveSnapshot: forceSnapshot, totalValue: precoFinal, costValue: custoTotal }
      const response = isEditing
        ? await api.put(`/crm/customers/${isEditing}`, payload)
        : await api.post('/crm/customers', payload);

      setFormData(prev => ({
        ...prev,
        ...response.data,
        measurementsHistory: response.data.measurementsHistory || []
      }));

      if (forceSnapshot) {
        alert("Snapshot de medidas registrado com sucesso!");
      } else {
        alert("Dados salvos com sucesso!");
        if(!isEditing) closeForm();
      }
      
      fetchData();
      if(!isEditing && response.data.id) setIsEditing(response.data.id);
    } catch (err) { 
      console.error(err);
      alert("Erro ao salvar dados.");
    } finally { setIsSaving(false); }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta noiva?")) return;
    try {
      await api.delete(`/crm/customers/${id}`);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err) { alert("Erro ao deletar."); }
  }

  const handleEdit = (noiva) => {
    setIsEditing(noiva.id);
    setFormData({
      ...initialForm, 
      ...noiva,
      measurements: { ...emptyMeasurements, ...(noiva.measurements || {}) },
      budget: {
        id: noiva.budget?.id || null,
        items: noiva.budget?.items || [],
        laborCost: noiva.budget?.laborCost || 0,
        markup: noiva.budget?.markup || 100
      }
    });
    setShowForm(true);
  }

  const closeForm = () => { 
    setShowForm(false); 
    setIsEditing(null); 
    setFormData(initialForm); 
    setActiveTab('DADOS E CRONOGRAMA');
  }

  return (
    <div className="space-y-6 p-2">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-secondary-100 gap-4">
        <h1 className="text-2xl font-black text-secondary-900 italic uppercase flex items-center gap-2 tracking-tighter">
          <Users className="text-indigo-600" /> CRM Ateliê PRO
        </h1>
        <button 
          onClick={() => showForm ? closeForm() : setShowForm(true)} 
          className="w-full md:w-auto bg-secondary-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
        >
          {showForm ? <X size={18}/> : <Plus size={18}/>} 
          {showForm ? 'Fechar Painel' : 'Cadastrar Nova Noiva'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-secondary-100 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="flex bg-secondary-50 border-b border-secondary-100 overflow-x-auto">
            {['DADOS E CRONOGRAMA', 'MEDIDAS', 'DESIGN', 'ORÇAMENTO'].map(tab => (
              <button 
                key={tab} 
                type="button" 
                onClick={() => setActiveTab(tab)} 
                className={`flex-1 py-5 min-w-[150px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-secondary-400'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => handleSubmit(e, false)} className="p-8 space-y-8">
            {activeTab === 'DADOS E CRONOGRAMA' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Nome da Noiva</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-secondary-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none transition-all" />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">WhatsApp</label>
                    <div className="flex gap-2">
                      <input 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        className="flex-1 p-4 bg-secondary-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-600 transition-all" 
                        placeholder="(00) 00000-0000"
                      />
                      <button type="button" onClick={handleShareWhatsApp} className="bg-emerald-500 text-white p-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-md active:scale-90">
                        <MessageCircle size={20} />
                      </button>
                    </div>
                  </div>

                  {/* DOCUMENTAÇÃO */}
                  <div className="pt-4 border-t border-secondary-100 space-y-4">
                    <p className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2 tracking-widest">
                      <FileBadge size={14}/> Documentação p/ Contrato
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-secondary-400 uppercase ml-1">CPF</label>
                        <input value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full p-3 bg-secondary-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-indigo-400" placeholder="000.000.000-00" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-secondary-400 uppercase ml-1">RG</label>
                        <input value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} className="w-full p-3 bg-secondary-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-indigo-400" placeholder="00.000.000-0" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-secondary-400 uppercase ml-1">Endereço Completo</label>
                      <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 bg-secondary-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-indigo-400" placeholder="Rua, nº, Bairro, Cidade - UF" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Status da Jornada</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-4 bg-secondary-50 rounded-2xl font-black text-xs uppercase outline-none cursor-pointer">
                      <option>PROSPECÇÃO</option>
                      <option>ORÇAMENTO</option>
                      <option>CONTRATO FECHADO</option>
                      <option>CONCLUÍDO</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 bg-secondary-50 p-6 rounded-[2.5rem] border border-secondary-100">
                    <h3 className="text-[10px] font-black uppercase mb-4 text-indigo-600 flex items-center gap-2 tracking-widest">Cronograma Crítico</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label className="text-[9px] font-bold text-secondary-500 uppercase">Data do Casamento</label>
                         <input type="date" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} className="w-full p-4 bg-white rounded-2xl font-black text-indigo-600 shadow-sm outline-none" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-bold text-rose-500 uppercase flex items-center gap-1"><CalendarDays size={12}/> Prova Final</label>
                          <input type="date" value={formData.trialDate} onChange={e => setFormData({...formData, trialDate: e.target.value})} className="w-full p-4 bg-rose-50 border border-rose-100 rounded-2xl font-black text-rose-600 shadow-sm outline-none focus:border-rose-400" />
                       </div>
                       <div className="md:col-span-2 space-y-2 border-t border-secondary-200 pt-4 mt-2">
                         <label className="text-[9px] font-bold text-secondary-500 uppercase">Provas Anteriores</label>
                         {formData.trials.map((t, i) => (
                             <div key={i} className="bg-white p-2 rounded-xl flex items-center justify-between mb-2 shadow-sm border border-secondary-100">
                                <input type="date" value={t} onChange={e => {
                                  const n = [...formData.trials]; n[i] = e.target.value;
                                  setFormData({...formData, trials: n});
                                }} className="text-xs font-bold bg-transparent outline-none" />
                                <button type="button" onClick={() => setFormData(p => ({...p, trials: p.trials.filter((_, idx) => idx !== i)}))} className="text-rose-400 hover:text-rose-600"><Trash2 size={14}/></button>
                             </div>
                         ))}
                         <button type="button" onClick={() => setFormData({...formData, trials: [...formData.trials, ""]})} className="text-[9px] font-black uppercase text-indigo-600 hover:underline">+ Novo Registro</button>
                       </div>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'MEDIDAS' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right duration-300">
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="font-black uppercase italic text-secondary-900 tracking-tighter">Medidas Técnicas</h2>
                    <button type="button" onClick={() => handleSubmit(null, true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-xl active:scale-95">
                      <History size={16}/> Snapshot
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-secondary-50 p-8 rounded-[3rem] shadow-inner">
                    {Object.keys(formData.measurements).filter(k => k !== 'observacoes').map(key => (
                      <div key={key}>
                        <label className="text-[8px] font-black text-secondary-400 uppercase block ml-2 mb-1">{key.replace(/([A-Z])/g, ' $1')}</label>
                        <input type="number" step="0.01" value={formData.measurements[key]} onChange={e => setFormData({...formData, measurements: {...formData.measurements, [key]: e.target.value}})} className="w-full p-3 bg-white rounded-xl font-bold text-xs border-2 border-transparent focus:border-indigo-600 outline-none shadow-sm transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-5 bg-secondary-900 rounded-[3rem] p-8 text-white h-[550px] flex flex-col shadow-2xl">
                  <h3 className="text-[10px] font-black uppercase mb-6 flex items-center gap-2 text-indigo-400 tracking-widest"><TrendingUp size={16}/> Evolução</h3>
                  <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                    {formData.measurementsHistory?.length > 0 ? [...formData.measurementsHistory].reverse().map((h, i) => (
                      <div key={i} className="border border-white/10 rounded-2xl overflow-hidden">
                        <button type="button" onClick={() => setExpandedSnapshot(expandedSnapshot === i ? null : i)} className={`w-full p-4 flex justify-between items-center transition-colors ${expandedSnapshot === i ? 'bg-indigo-600' : 'bg-white/5 hover:bg-white/10'}`}>
                          <span className="text-[10px] font-black uppercase">{new Date(h.date).toLocaleDateString()}</span>
                          {expandedSnapshot === i ? <ChevronDown size={18}/> : <ChevronRight size={18} />}
                        </button>
                        {expandedSnapshot === i && (
                          <div className="p-5 bg-white/5 grid grid-cols-2 gap-2">
                            {Object.entries(h.data).map(([l, v]) => (
                              <div key={l} className="flex justify-between border-b border-white/5 pb-1">
                                <span className="text-[8px] font-black uppercase opacity-40">{l}</span>
                                <span className="text-[10px] font-bold text-indigo-300">{v || '--'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )) : <p className="text-[10px] uppercase opacity-30 text-center py-20 italic">Sem histórico</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ORÇAMENTO' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in zoom-in-95 duration-300">
                <div className="space-y-4">
                  <div className="bg-secondary-900 p-8 rounded-[2.5rem] text-white border border-white/5">
                    <label className="text-[10px] font-black uppercase text-indigo-400 mb-3 block italic tracking-widest">Insumos Detalhados</label>
                    <select className="w-full p-4 bg-white/10 rounded-2xl font-bold text-xs outline-none border border-white/10 focus:border-indigo-500 cursor-pointer"
                      onChange={(e) => {
                        const prod = products.find(p => p.id === e.target.value);
                        if(prod && !formData.budget.items.find(i => i.productId === prod.id)) {
                          setFormData(p => ({...p, budget: {...p.budget, items: [...(p.budget?.items || []), { productId: prod.id, name: prod.name, price: prod.price, quantity: 1, stockAvailable: Number(prod.stock) || 0 }]}}))
                        }
                      }}>
                      <option value="" className="text-black">Adicionar material ao projeto...</option>
                      {products.map(p => (<option key={p.id} value={p.id} disabled={(p.stock || 0) <= 0} className="text-black">{p.name} - R$ {p.price}</option>))}
                    </select>
                  </div>
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                    {formData.budget.items.map((item, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-5 rounded-[2rem] border ${item.quantity > item.stockAvailable ? 'bg-rose-50 border-rose-200' : 'bg-white border-secondary-100 shadow-sm'}`}>
                         <div className="flex-1">
                           <p className="text-xs font-black uppercase text-secondary-900">{item.name}</p>
                           <p className="text-[10px] font-bold text-indigo-600">Estoque: {item.stockAvailable} | Un: R$ {item.price}</p>
                         </div>
                         <div className="flex items-center gap-4">
                            <input type="number" step="0.1" value={item.quantity} onChange={e => {
                               const n = [...formData.budget.items]; n[idx].quantity = Number(e.target.value);
                               setFormData(p => ({...p, budget: {...p.budget, items: n}}))
                            }} className="w-16 p-2 text-center font-black rounded-lg bg-secondary-50 outline-none border border-secondary-100" />
                            <button type="button" onClick={() => setFormData(p => ({...p, budget: {...p.budget, items: p.budget.items.filter((_, i) => i !== idx)}}))} className="text-rose-300 hover:text-rose-600"><Trash2 size={20}/></button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-indigo-600 rounded-[3.5rem] p-10 text-white shadow-2xl flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <label className="text-[10px] font-black uppercase opacity-60">Mão de Obra</label>
                        <input type="number" value={formData.budget?.laborCost} onChange={e => setFormData(p => ({...p, budget: {...p.budget, laborCost: e.target.value}}))} className="bg-white/10 w-32 p-3 rounded-2xl font-black text-right outline-none" />
                      </div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <label className="text-[10px] font-black uppercase opacity-60">Margem (%)</label>
                        <input type="number" value={formData.budget?.markup} onChange={e => setFormData(p => ({...p, budget: {...p.budget, markup: e.target.value}}))} className="bg-white/10 w-24 p-3 rounded-2xl font-black text-right outline-none" />
                      </div>
                    </div>
                    <div className="text-right mt-10">
                      <p className="text-5xl font-black italic tracking-tighter mb-8">{new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(precoFinal)}</p>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={handlePrintQuote} className="flex-1 bg-white/10 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-white/10"><Printer size={16}/> Impressão</button>
                          <button type="button" onClick={handleShareWhatsApp} className="flex-1 bg-emerald-500 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><MessageCircle size={16}/> WhatsApp</button>
                        </div>
                        <button type="button" onClick={handleGoToQuotes} className="w-full bg-secondary-900/40 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-white/10"><FileText size={16}/> Ver em Orçamentos</button>
                      </div>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'DESIGN' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                 <div className="bg-secondary-50 p-8 rounded-[2.5rem] border border-secondary-200">
                    <label className="text-[10px] font-black text-indigo-600 uppercase mb-3 block flex items-center gap-2 tracking-widest">
                      <PenTool size={14}/> Descrição Comercial para o Contrato
                    </label>
                    <textarea 
                      value={formData.projectDescription} 
                      onChange={e => setFormData({...formData, projectDescription: e.target.value})} 
                      className="w-full p-6 bg-white rounded-3xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-600 shadow-inner h-32 resize-none"
                      placeholder="Ex: Vestido de Noiva em Zibeline de Seda, modelo sereia com rendas aplicadas manualmente..."
                    />
                    <p className="mt-2 text-[9px] font-bold text-secondary-400 uppercase italic">* Este texto será usado como item principal no contrato de venda.</p>
                 </div>

                 <div className="bg-secondary-900 p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-6 items-center border border-white/5">
                    <div className="bg-indigo-500/20 p-4 rounded-full"><ImageIcon className="text-indigo-400" size={32} /></div>
                    <div className="flex-1">
                      <h3 className="text-white font-black uppercase text-sm tracking-widest">Croqui e Documentos</h3>
                      <p className="text-white/40 text-[10px] uppercase font-bold">Aceita PDF, JPG ou PNG (Máx 10MB)</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
                    <button type="button" disabled={isUploading} onClick={() => fileInputRef.current.click()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all">
                      {isUploading ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18}/>}
                      {formData.sketchUrl ? 'Substituir' : 'Upload'}
                    </button>
                 </div>
                 
                 <div className="bg-secondary-50 border-4 border-dashed border-secondary-200 rounded-[4rem] h-[550px] flex items-center justify-center overflow-hidden shadow-inner relative">
                    {formData.sketchUrl ? (
                      formData.sketchUrl.toLowerCase().endsWith('.pdf') ? (
                        <div className="text-center space-y-4">
                          <FileType size={80} className="mx-auto text-indigo-600" />
                          <p className="text-[12px] font-black uppercase italic text-secondary-600">Documento PDF Vinculado</p>
                          <a href={formData.sketchUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold text-xs uppercase">Visualizar Arquivo</a>
                        </div>
                      ) : (
                        <><img src={formData.sketchUrl} alt="Croqui" className="max-h-full object-contain" /><div className="absolute top-6 right-6 bg-emerald-500 text-white p-3 rounded-full shadow-lg"><CheckCircle2 size={24}/></div></>
                      )
                    ) : ( <div className="text-center space-y-4 opacity-20"><Upload size={64} className="mx-auto" /><p className="text-[12px] font-black uppercase italic">Nenhum anexo encontrado</p></div> )}
                 </div>
              </div>
            )}

            <div className="flex justify-end gap-6 pt-10 border-t border-secondary-100">
              <button type="button" onClick={closeForm} className="text-[11px] font-black uppercase text-secondary-400 px-8 hover:text-secondary-900 transition-colors">Descartar</button>
              <button type="submit" disabled={isSaving} className="bg-secondary-900 text-white px-14 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
                {isEditing ? 'Salvar Alterações' : 'Finalizar Cadastro'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          {customers.length > 0 ? customers.map(c => (
            <div key={c.id} onClick={() => handleEdit(c)} className="bg-white p-8 rounded-[3rem] border border-secondary-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 cursor-pointer transition-all duration-300 group relative overflow-hidden active:scale-95">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[5rem] -mr-16 -mt-16 transition-all duration-500 group-hover:bg-indigo-600 group-hover:-mr-12 group-hover:-mt-12 opacity-50 group-hover:opacity-10"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="bg-secondary-50 p-4 rounded-2xl text-secondary-400 group-hover:text-indigo-600 group-hover:bg-white transition-all shadow-inner"><Users size={24}/></div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${c.phone?.replace(/\D/g, '')}`, '_blank'); }} className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all"><MessageCircle size={20}/></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="bg-rose-50 text-rose-400 p-3 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={20}/></button>
                </div>
              </div>
              <h3 className="text-2xl font-black text-secondary-900 uppercase tracking-tighter truncate mb-1 group-hover:text-indigo-600">{c.name}</h3>
              <p className="text-[11px] font-black text-indigo-600 uppercase italic mb-6">Evento: {c.eventDate ? new Date(c.eventDate).toLocaleDateString() : 'A definir'}</p>
              <div className="pt-6 border-t border-secondary-50 flex justify-between items-center relative z-10">
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${c.status === 'CONTRATO FECHADO' ? 'bg-indigo-100 text-indigo-600' : 'bg-secondary-50 text-secondary-400'}`}>{c.status}</span>
                <div className="flex gap-3 items-center">
                  {c.trialDate && <Calendar size={14} className="text-rose-400" />}
                  {c.sketchUrl && <ImageIcon size={14} className="text-indigo-400" />}
                  {c.budget?.items?.length > 0 && <Calculator size={14} className="text-amber-500" />}
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center space-y-4 opacity-30"><Users size={48} className="mx-auto" /><p className="font-black uppercase italic tracking-widest">Nenhuma noiva cadastrada</p></div>
          )}
        </div>
      )}
    </div>
  )
}