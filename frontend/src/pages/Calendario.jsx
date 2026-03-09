import { useEffect, useState, useCallback, useMemo } from 'react'
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, X, Heart, CircleDollarSign, Loader2, PackageOpen, Undo2, Trash2, Edit3,
  Search, MessageCircle, User, ExternalLink, CalendarDays
} from 'lucide-react'
import api from '../services/api'

const EVENT_TYPES = {
  NOIVA: { label: 'Prova de Noiva', color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-600', icon: <Heart size={14}/> },
  ORCAMENTO: { label: 'Orçamento/Confecção', color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-500', icon: <CircleDollarSign size={14}/> },
  RETIRADA: { label: 'Retirada de Aluguel', color: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-600', icon: <PackageOpen size={14}/> },
  DEVOLUCAO: { label: 'Devolução de Aluguel', color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-600', icon: <Undo2 size={14}/> },
  CASAMENTO: { label: 'GRANDE DIA', color: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-500', icon: <span className="text-xs">💍</span> }
}

export function Calendario() {
  const [view, setView] = useState('day')
  const [appointments, setAppointments] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null) // Para o Card de Resumo
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editingId, setEditingId] = useState(null)
  
  const [formData, setFormData] = useState({
    customerName: '', service: '', date: '', time: '09:00', type: 'NOIVA', duration: 60, customerId: ''
  })

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`), [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [appRes, custRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/crm/customers')
      ])
      
      const manualApps = appRes.data.data || appRes.data || []
      const allCustomers = custRes.data.data || custRes.data || []
      setCustomers(allCustomers)

      const crmEvents = []
      allCustomers.forEach(noiva => {
        if (noiva.eventDate) {
          crmEvents.push({
            id: `wedding-${noiva.id}`,
            customerName: noiva.name,
            date: noiva.eventDate.split('T')[0],
            time: noiva.weddingTime || '16:00',
            type: 'CASAMENTO',
            service: 'Cerimônia de Casamento',
            isSystem: true,
            customerId: noiva.id
          })
        }
        if (noiva.trials && Array.isArray(noiva.trials)) {
          noiva.trials.forEach((trialDate, idx) => {
            if(trialDate) {
              crmEvents.push({
                id: `trial-${noiva.id}-${idx}`,
                customerName: noiva.name,
                date: trialDate.split('T')[0],
                time: '09:00',
                type: 'NOIVA',
                service: `Prova nº ${idx + 1}`,
                isSystem: true,
                customerId: noiva.id
              })
            }
          })
        }
      })

      setAppointments([...manualApps, ...crmEvents])
    } catch (err) { console.error("Erro ao buscar dados da agenda:", err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const formatISO = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }

  const handleNavigate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(currentDate.getMonth() + direction);
    else if (view === 'week') newDate.setDate(currentDate.getDate() + (direction * 7));
    else newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  }

  const handleOpenEvent = (app) => {
    setSelectedEvent(app);
  }

  const handleEdit = (app) => {
    if(app.isSystem) return alert("Este evento é gerado automaticamente pelo CRM.");
    setEditingId(app.id)
    setFormData({
      customerName: app.customerName,
      service: app.service || app.type,
      date: app.date,
      time: app.time,
      type: app.type,
      duration: 60,
      customerId: app.customerId || ''
    })
    setSelectedEvent(null);
    setShowModal(true)
  }

  const handleDelete = async (id, name) => {
    if (window.confirm(`Deseja cancelar o agendamento de "${name}"?`)) {
      try {
        await api.delete(`/appointments/${id}`)
        setSelectedEvent(null);
        fetchData()
      } catch (err) { alert("Erro ao cancelar.") }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (editingId) await api.put(`/appointments/${editingId}`, payload);
      else await api.post('/appointments', payload);
      setShowModal(false);
      setEditingId(null);
      fetchData();
      setFormData({ customerName: '', service: '', date: '', time: '09:00', type: 'NOIVA', duration: 60, customerId: '' });
    } catch(err) { alert("Erro ao salvar.") }
  }

  // --- RENDERS ---
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
      <div className="flex-1 bg-white rounded-xl border grid grid-cols-7 overflow-hidden">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="p-2 border-b bg-secondary-50 text-[10px] font-black uppercase text-center text-secondary-400">{d}</div>
        ))}
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="border-b border-r bg-secondary-50/20" />;
          const dateStr = formatISO(day);
          const dayApps = appointments.filter(a => a.date === dateStr);
          const isToday = formatISO(new Date()) === dateStr;
          return (
            <div key={dateStr} onClick={() => { setEditingId(null); setFormData({...formData, date: dateStr}); setShowModal(true); }}
              className="border-b border-r p-2 min-h-[100px] hover:bg-indigo-50/20 transition-all cursor-pointer group">
              <span className={`text-xs font-bold ${isToday ? 'bg-indigo-600 text-white px-2 py-1 rounded-full' : 'text-secondary-600'}`}>{day.getDate()}</span>
              <div className="mt-1 space-y-1">
                {dayApps.slice(0, 3).map((app, i) => (
                  <div key={i} onClick={(e) => { e.stopPropagation(); handleOpenEvent(app); }} 
                    className={`${EVENT_TYPES[app.type]?.color} h-1.5 rounded-full w-full mb-0.5`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    return (
      <div className="flex-1 bg-white rounded-xl border grid grid-cols-7 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
          const dateStr = formatISO(d);
          const dayApps = appointments.filter(a => a.date === dateStr);
          return (
            <div key={i} className="border-r last:border-r-0 flex flex-col group">
              <div className="p-3 border-b text-center bg-secondary-50/50">
                <p className="text-[9px] font-black uppercase opacity-70">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                <p className="text-sm font-black">{d.getDate()}</p>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[400px]">
                {dayApps.map((app, idx) => (
                  <div key={idx} onClick={(e) => { e.stopPropagation(); handleOpenEvent(app); }} 
                    className={`${EVENT_TYPES[app.type]?.light} p-2 rounded border-l-2 ${EVENT_TYPES[app.type]?.border} cursor-pointer hover:brightness-95 transition-all shadow-sm`}>
                    <p className="text-[9px] font-black text-secondary-900 truncate uppercase">{app.customerName}</p>
                    <p className="text-[8px] opacity-70 font-bold">{app.time}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    )
  }

  const renderDayView = () => {
    const dateStr = formatISO(currentDate);
    return (
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border flex flex-col custom-scrollbar">
        <div className="p-4 border-b bg-secondary-50/50 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-sm font-black text-secondary-900 uppercase">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </h2>
        </div>
        {hours.map(hour => {
          const appsInHour = appointments.filter(a => a.date === dateStr && a.time?.startsWith(hour.split(':')[0]));
          return (
            <div key={hour} className="grid grid-cols-[80px_1fr] border-b min-h-[80px] group">
              <div className="p-4 border-r text-[10px] text-secondary-400 font-bold text-center bg-secondary-50/30 flex items-center justify-center">{hour}</div>
              <div className="p-2 flex flex-col gap-2 relative">
                {appsInHour.map((app, index) => (
                  <div key={index} 
                    onClick={() => handleOpenEvent(app)}
                    className={`${EVENT_TYPES[app.type]?.light} border-l-4 ${EVENT_TYPES[app.type]?.border} p-3 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:scale-[1.01] transition-transform`}>
                    <div className="flex-1">
                      <p className="font-bold text-secondary-900 text-sm flex items-center gap-2 uppercase">
                        {app.customerName} {app.isSystem && <span className="text-[7px] border px-1 rounded bg-white/50">SISTEMA</span>}
                      </p>
                      <p className={`text-[10px] ${EVENT_TYPES[app.type]?.text} flex items-center gap-1 font-black mt-1 uppercase italic`}>
                        {EVENT_TYPES[app.type]?.icon} {app.service}
                      </p>
                    </div>
                    <div className="text-[10px] font-black opacity-40 italic">{app.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black text-secondary-900 flex items-center gap-2">
            <CalendarIcon className="text-indigo-600" size={22}/> Agenda Ateliê
          </h1>
          <div className="flex items-center gap-2 bg-secondary-50 p-1.5 rounded-xl border">
            <button onClick={() => handleNavigate(-1)} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronLeft size={20}/></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 text-[10px] font-black uppercase">Hoje</button>
            <button onClick={() => handleNavigate(1)} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronRight size={20}/></button>
          </div>
          <span className="text-sm font-black text-secondary-600 uppercase italic">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-secondary-100 p-1 rounded-xl border">
            {[{ id: 'day', label: 'Dia' }, { id: 'week', label: 'Semana' }, { id: 'month', label: 'Mês' }].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${view === v.id ? 'bg-white shadow-md text-indigo-600' : 'text-secondary-500 hover:text-secondary-700'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setEditingId(null); setFormData({...formData, date: formatISO(currentDate)}); setShowModal(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl transition-all active:scale-95">
            <Plus size={18}/> Novo Agendamento
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 bg-white rounded-2xl border flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>
        ) : (
          view === 'month' ? renderMonthView() : view === 'week' ? renderWeekView() : renderDayView()
        )}
      </div>

      {/* MODAL DE RESUMO (QUICK VIEW) */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-8 ${EVENT_TYPES[selectedEvent.type]?.color} text-white relative`}>
              <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 p-2 bg-black/10 rounded-full hover:bg-black/20 transition-all">
                <X size={18}/>
              </button>
              <div className="bg-white/20 w-fit p-3 rounded-2xl mb-4">
                {EVENT_TYPES[selectedEvent.type]?.icon}
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80">{EVENT_TYPES[selectedEvent.type]?.label}</h3>
              <h2 className="text-2xl font-black uppercase leading-tight mt-1 italic">{selectedEvent.customerName}</h2>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-secondary-600">
                  <div className="bg-secondary-50 p-3 rounded-xl"><CalendarDays size={18}/></div>
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-50">Data do Evento</p>
                    <p className="text-sm font-bold">{new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-secondary-600">
                  <div className="bg-secondary-50 p-3 rounded-xl"><Clock size={18}/></div>
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-50">Horário Agendado</p>
                    <p className="text-sm font-bold">{selectedEvent.time}h</p>
                  </div>
                </div>
                {selectedEvent.service && (
                   <div className="flex items-center gap-4 text-secondary-600">
                   <div className="bg-secondary-50 p-3 rounded-xl"><Search size={18}/></div>
                   <div>
                     <p className="text-[9px] font-black uppercase opacity-50">Serviço/Detalhes</p>
                     <p className="text-sm font-bold">{selectedEvent.service}</p>
                   </div>
                 </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4">
                {selectedEvent.customerId && (
                   <button 
                    onClick={() => window.location.href = `/crm?id=${selectedEvent.customerId}`}
                    className="w-full py-4 bg-secondary-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all">
                    <User size={14}/> Abrir Ficha da Noiva
                  </button>
                )}
                
                {!selectedEvent.isSystem && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleEdit(selectedEvent)} className="py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all">
                      <Edit3 size={14}/> Editar
                    </button>
                    <button onClick={() => handleDelete(selectedEvent.id, selectedEvent.customerName)} className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-rose-100 transition-all">
                      <Trash2 size={14}/> Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FORMULÁRIO */}
      {showModal && (
        <div className="fixed inset-0 bg-secondary-900/70 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className={`p-8 flex justify-between items-center text-white ${EVENT_TYPES[formData.type]?.color || 'bg-indigo-600'}`}>
              <div>
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Agendamento</h3>
                <h2 className="text-xl font-black uppercase italic">{editingId ? 'Editar Reserva' : 'Nova Reserva'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-black/10 p-2.5 rounded-full hover:bg-black/20"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-5 gap-2 p-1.5 bg-secondary-50 rounded-2xl border">
                {Object.keys(EVENT_TYPES).map(type => (
                  <button key={type} type="button" title={EVENT_TYPES[type].label} onClick={() => setFormData({...formData, type})}
                    className={`py-3 rounded-xl flex items-center justify-center transition-all ${formData.type === type ? `${EVENT_TYPES[type].color} text-white shadow-lg` : 'text-secondary-400 hover:bg-white'}`}>
                    {EVENT_TYPES[type].icon}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Vincular Cliente CRM</label>
                  <select 
                    className="w-full p-4 bg-secondary-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-bold appearance-none transition-all"
                    value={formData.customerId}
                    onChange={(e) => {
                      const selected = customers.find(c => c.id === e.target.value);
                      setFormData({...formData, customerId: e.target.value, customerName: selected ? selected.name : ''});
                    }}
                  >
                    <option value="">-- Selecione uma Noiva --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {!formData.customerId && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Nome do Cliente</label>
                    <input required placeholder="Digite o nome..." className="w-full p-4 bg-secondary-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-bold transition-all" 
                      value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Data</label>
                    <input type="date" required className="w-full p-4 bg-secondary-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-100" 
                      value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Hora</label>
                    <input type="time" required className="w-full p-4 bg-secondary-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-100" 
                      value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Serviço/Observação</label>
                    <input placeholder="Ex: Ajuste final, Primeira prova..." className="w-full p-4 bg-secondary-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-100" 
                      value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} />
                </div>
              </div>

              <button type="submit" className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 ${EVENT_TYPES[formData.type]?.color || 'bg-indigo-600'} hover:brightness-110`}>
                {editingId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}