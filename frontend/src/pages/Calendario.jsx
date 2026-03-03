import { useEffect, useState, useCallback } from 'react'
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, X, Heart, CircleDollarSign, Loader2
} from 'lucide-react'
import api from '../services/api'

// Configuração de Cores e Tipos (Centralizado)
const EVENT_TYPES = {
  NOIVA: { 
    label: 'Prova de Noiva', color: 'bg-blue-600', light: 'bg-blue-50', 
    text: 'text-blue-700', border: 'border-blue-600', icon: <Heart size={10}/> 
  },
  ORCAMENTO: { 
    label: 'Orçamento', color: 'bg-amber-500', light: 'bg-amber-50', 
    text: 'text-amber-700', border: 'border-amber-500', icon: <CircleDollarSign size={10}/> 
  },
  CASAMENTO: { 
    label: 'GRANDE DIA (CASAMENTO)', 
    color: 'bg-rose-500', 
    light: 'bg-rose-50', 
    text: 'text-rose-700', 
    border: 'border-rose-500', 
    icon: <span className="text-[12px]">💍</span> 
  }
}

export function Calendario() {
  const [view, setView] = useState('day') 
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [formData, setFormData] = useState({
    customerName: '', service: '', date: '', time: '09:00', type: 'NOIVA'
  })

  const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/appointments')
      setAppointments(res.data.data || [])
    } catch (err) { 
      console.error("Erro ao buscar agenda:", err) 
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Formata data para YYYY-MM-DD (Evita erros de fuso horário)
  const formatISO = (date) => {
    const d = new Date(date)
    return d.toLocaleDateString('sv-SE') // Retorna YYYY-MM-DD de forma segura
  }

  const navigate = (direction) => {
    const newDate = new Date(currentDate)
    if (view === 'day') newDate.setDate(currentDate.getDate() + direction)
    if (view === 'week') newDate.setDate(currentDate.getDate() + (direction * 7))
    if (view === 'month') newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  // --- LÓGICA DE VISÃO DIÁRIA (ATUALIZADA) ---
  const renderDayView = () => {
    const dateStr = formatISO(currentDate);
    const casamentosHoje = appointments.filter(a => a.date === dateStr && a.type === 'CASAMENTO');

    return (
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border flex flex-col">
        {/* CABEÇALHO DO DIA SELECIONADO */}
        <div className="p-4 border-b bg-secondary-50/50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
          <div>
            <h2 className="text-sm font-black text-secondary-900 uppercase tracking-tight">
              {currentDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </h2>
            <p className="text-[11px] font-bold text-indigo-600 uppercase">
              {currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {dateStr === formatISO(new Date()) && (
            <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-full">HOJE</span>
          )}
        </div>

        {/* HEADER DE CASAMENTOS */}
        {casamentosHoje.length > 0 && (
          <div className="bg-rose-50 p-3 border-b border-rose-100 space-y-2">
            {casamentosHoje.map(ev => (
              <div key={ev.id} className="bg-white border-l-4 border-rose-500 p-3 rounded-r-lg shadow-sm flex items-center gap-3">
                <span className="text-xl">💍</span>
                <div>
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Casamento do Dia</p>
                  <p className="font-bold text-secondary-900">{ev.customerName}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GRADE DE HORÁRIOS */}
        {hours.map(hour => {
          const app = appointments.find(a => 
            a.date === dateStr && 
            a.time?.startsWith(hour.split(':')[0]) && 
            a.type !== 'CASAMENTO'
          );
          const style = app ? (EVENT_TYPES[app.type] || EVENT_TYPES.NOIVA) : null;

          return (
            <div key={hour} className="grid grid-cols-[80px_1fr] border-b min-h-[70px] group">
              <div className="p-4 border-r text-xs text-secondary-400 font-bold text-center bg-secondary-50/30">{hour}</div>
              <div className="p-2 relative">
                {app ? (
                  <div className={`${style.light} border-l-4 ${style.border} p-3 rounded-lg shadow-sm`}>
                    <p className="font-bold text-secondary-900 text-sm">{app.customerName}</p>
                    <p className={`text-[10px] ${style.text} flex items-center gap-1 font-medium`}>
                      {style.icon} {app.service} • {app.time}
                    </p>
                  </div>
                ) : (
                  <button onClick={() => { 
                    setFormData(prev => ({...prev, date: dateStr, time: hour})); 
                    setShowModal(true); 
                  }} className="w-full h-full opacity-0 group-hover:opacity-100 border-2 border-dashed border-secondary-100 rounded-xl transition-all hover:bg-secondary-50/50"></button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const start = new Date(currentDate)
    start.setDate(currentDate.getDate() - currentDate.getDay())
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    })

    return (
      <div className="flex-1 bg-white rounded-xl border overflow-hidden flex flex-col">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b bg-secondary-50">
          <div className="p-3 border-r text-[10px] font-black text-secondary-400 uppercase">Hora</div>
          {days.map(d => (
            <div key={d.toString()} className={`p-3 text-center border-r last:border-0 ${formatISO(d) === formatISO(new Date()) ? 'bg-indigo-50 text-indigo-600' : 'text-secondary-600'}`}>
              <p className="text-[10px] font-bold uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
              <p className="text-sm font-black">{d.getDate()}</p>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b min-h-[80px]">
              <div className="p-2 border-r text-[10px] text-secondary-400 font-bold text-center bg-secondary-50/10">{hour}</div>
              {days.map(d => {
                const dateStr = formatISO(d)
                const app = appointments.find(a => a.date === dateStr && a.time?.startsWith(hour.split(':')[0]))
                const style = app ? (EVENT_TYPES[app.type] || EVENT_TYPES.NOIVA) : null
                
                return (
                  <div key={d.toString()} className="p-1 border-r last:border-0 relative group">
                    {app ? (
                      <div className={`${style.color} text-white p-2 rounded-lg text-[10px] shadow-md h-full flex flex-col justify-center`}>
                        <p className="font-bold leading-tight">{app.type === 'CASAMENTO' ? '💍 ' : ''}{app.customerName}</p>
                        <p className="opacity-80 text-[9px] truncate">{app.service}</p>
                      </div>
                    ) : (
                      <button onClick={() => { setFormData({...formData, date: dateStr, time: hour}); setShowModal(true); }}
                        className="w-full h-full opacity-0 group-hover:opacity-100 hover:bg-secondary-50 rounded transition-all"></button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const startMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const days = []
    for (let i = startMonth.getDay(); i > 0; i--) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1 - i))
    for (let i = 1; i <= endMonth.getDate(); i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
    
    return (
      <div className="flex-1 bg-white rounded-xl border grid grid-cols-7 auto-rows-fr overflow-hidden">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(wd => (
          <div key={wd} className="p-2 bg-secondary-50 border-b border-r text-[10px] font-black text-secondary-400 uppercase text-center">{wd}</div>
        ))}
        {days.map((d, i) => {
          const dateStr = formatISO(d)
          const dayApps = appointments
            .filter(a => a.date === dateStr)
            .sort((a, b) => (a.type === 'CASAMENTO' ? -1 : 1));

          const isToday = dateStr === formatISO(new Date())
          return (
            <div key={i} className={`p-2 border-b border-r min-h-[110px] ${d.getMonth() !== currentDate.getMonth() ? 'opacity-30' : ''}`}>
              <span className={`text-[11px] font-bold ${isToday ? 'bg-indigo-600 text-white px-2 py-0.5 rounded-full' : 'text-secondary-400'}`}>{d.getDate()}</span>
              <div className="mt-1 space-y-1">
                {dayApps.map((a, idx) => {
                  const style = EVENT_TYPES[a.type] || EVENT_TYPES.NOIVA
                  return (
                    <div key={idx} className={`${style.color} text-white px-1.5 py-0.5 rounded text-[9px] font-bold truncate flex items-center gap-1 shadow-sm`}>
                      {a.type === 'CASAMENTO' ? '💍' : a.time?.substring(0, 5)} {a.customerName}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      {/* HEADER DA AGENDA */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black text-secondary-900 flex items-center gap-2">
            <CalendarIcon className="text-indigo-600" size={20}/> Agenda do Ateliê
          </h1>
          <div className="flex items-center gap-2 bg-secondary-50 p-1 rounded-lg border">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all"><ChevronLeft size={18}/></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold hover:text-indigo-600">Hoje</button>
            <button onClick={() => navigate(1)} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all"><ChevronRight size={18}/></button>
          </div>
          <span className="text-sm font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-secondary-100 p-1 rounded-xl border">
            {['day', 'week', 'month'].map(v => (
              <button key={v} onClick={() => setView(v)} 
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === v ? 'bg-white shadow-sm text-indigo-600' : 'text-secondary-500'}`}>
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
          <button onClick={() => { setFormData({...formData, date: formatISO(currentDate)}); setShowModal(true); }}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
            <Plus size={16}/> Novo Horário
          </button>
        </div>
      </div>

      {/* ÁREA DO CALENDÁRIO */}
      {loading ? (
        <div className="flex-1 bg-white rounded-xl border flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
      ) : (
        <>
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </>
      )}

      {/* MODAL DE AGENDAMENTO */}
      {showModal && (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-6 flex justify-between items-center text-white ${EVENT_TYPES[formData.type].color} transition-colors duration-500`}>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tighter">Agendar no Ateliê</h2>
                <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">{EVENT_TYPES[formData.type].label}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all"><X size={20}/></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('/appointments', formData);
                setShowModal(false);
                fetchData();
              } catch(err) { alert("Erro ao salvar agendamento") }
            }} className="p-8 space-y-5">
              
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-secondary-50 rounded-2xl border">
                <button type="button" onClick={() => setFormData({...formData, type: 'NOIVA'})}
                  className={`py-3 rounded-xl text-[10px] font-black transition-all ${formData.type === 'NOIVA' ? 'bg-blue-600 text-white shadow-lg' : 'text-secondary-400 hover:text-secondary-600'}`}>
                  PROVA DE NOIVA
                </button>
                <button type="button" onClick={() => setFormData({...formData, type: 'ORCAMENTO'})}
                  className={`py-3 rounded-xl text-[10px] font-black transition-all ${formData.type === 'ORCAMENTO' ? 'bg-amber-500 text-white shadow-lg' : 'text-secondary-400 hover:text-secondary-600'}`}>
                  ORÇAMENTO
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Nome da Cliente</label>
                <input required className="w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm font-medium" 
                  placeholder="Ex: Noiva Marina Silva" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Observações</label>
                <input required className="w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm" 
                  placeholder="Ex: Ajuste de barra" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Data</label>
                  <input type="date" required className="w-full p-4 border rounded-2xl outline-none text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-1">Horário</label>
                  <input type="time" required className="w-full p-4 border rounded-2xl outline-none text-sm" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>
              </div>

              <button className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${EVENT_TYPES[formData.type].color}`}>
                Confirmar na Agenda
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}