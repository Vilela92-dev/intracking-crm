import { useEffect, useState, useCallback } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  LayoutGrid
} from 'lucide-react'
import api from '../services/api'

export function Calendario() {
  const [view, setView] = useState('day') 
  const [appointments, setAppointments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [formData, setFormData] = useState({
    customerName: '', service: '', date: '', time: '09:00'
  })

  const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`)

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/appointments')
      setAppointments(res.data.data || [])
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const formatISO = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const getWeekDays = (date) => {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  const getMonthDays = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const days = []
    const startPadding = start.getDay()
    for (let i = startPadding; i > 0; i--) {
      days.push(new Date(date.getFullYear(), date.getMonth(), 1 - i))
    }
    for (let i = 1; i <= end.getDate(); i++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), i))
    }
    return days
  }

  const navigate = (direction) => {
    const newDate = new Date(currentDate)
    if (view === 'day') newDate.setDate(currentDate.getDate() + direction)
    if (view === 'week') newDate.setDate(currentDate.getDate() + (direction * 7))
    if (view === 'month') newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const renderDayView = () => (
    <div className="flex-1 overflow-y-auto bg-white rounded-xl border">
      {hours.map(hour => {
        const dateStr = formatISO(currentDate)
        const app = appointments.find(a => 
          (a.date?.split('T')[0] === dateStr) && 
          (a.time?.startsWith(hour.split(':')[0]))
        )
        return (
          <div key={hour} className="grid grid-cols-[80px_1fr] border-b min-h-[70px] group">
            <div className="p-4 border-r text-xs text-secondary-400 font-bold text-center bg-secondary-50/30">{hour}</div>
            <div className="p-2 relative">
              {app ? (
                <div className="bg-primary-100 border-l-4 border-primary-600 p-2 rounded text-sm shadow-sm">
                  <p className="font-bold text-secondary-900">{app.customerName}</p>
                  <p className="text-[10px] text-primary-700">{app.service}</p>
                </div>
              ) : (
                <button onClick={() => { 
                  setFormData(prev => ({...prev, date: dateStr, time: hour})); 
                  setShowModal(true); 
                }} className="w-full h-full opacity-0 group-hover:opacity-100 border-2 border-dashed border-secondary-100 rounded transition-all"></button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderWeekView = () => {
    const days = getWeekDays(currentDate)
    return (
      <div className="flex-1 bg-white rounded-xl border overflow-hidden flex flex-col">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b bg-secondary-50 text-[10px] font-black text-secondary-500 uppercase">
          <div className="p-2 border-r">Hora</div>
          {days.map(d => (
            <div key={d.toString()} className={`p-2 text-center border-r ${formatISO(d) === formatISO(new Date()) ? 'bg-primary-50 text-primary-600' : ''}`}>
              {d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b min-h-[60px]">
              <div className="p-2 border-r text-[10px] text-secondary-400 font-bold text-center">{hour}</div>
              {days.map(d => {
                const dateStr = formatISO(d)
                const app = appointments.find(a => 
                  (a.date?.split('T')[0] === dateStr) && 
                  (a.time?.startsWith(hour.split(':')[0]))
                )
                return (
                  <div key={d.toString()} className="p-1 border-r relative group">
                    {app && (
                      <div className="bg-primary-600 text-white p-1 rounded text-[9px] leading-tight shadow-md">
                        <p className="font-bold truncate">{app.customerName}</p>
                      </div>
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
    const days = getMonthDays(currentDate)
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return (
      <div className="flex-1 bg-white rounded-xl border grid grid-cols-7 auto-rows-fr overflow-hidden">
        {weekDays.map(wd => <div key={wd} className="p-2 bg-secondary-50 border-b border-r text-center text-[10px] font-black text-secondary-500 uppercase">{wd}</div>)}
        {days.map((d, i) => {
          const dateStr = formatISO(d)
          const dayApps = appointments.filter(a => a.date?.split('T')[0] === dateStr)
          const isCurrentMonth = d.getMonth() === currentDate.getMonth()
          return (
            <div key={i} className={`p-2 border-b border-r min-h-[100px] ${!isCurrentMonth ? 'bg-secondary-50/50' : ''}`}>
              <div className="flex justify-between items-start">
                <span className={`text-xs font-bold ${formatISO(d) === formatISO(new Date()) ? 'bg-primary-600 text-white px-2 py-1 rounded-full' : 'text-secondary-400'}`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                {dayApps.map((a, idx) => (
                  <div key={idx} className="bg-primary-100 text-primary-700 px-1 py-0.5 rounded text-[9px] font-bold truncate">
                    {a.time?.substring(0, 5)} - {a.customerName}
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
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black text-secondary-900">Agenda</h1>
          <button onClick={() => setCurrentDate(new Date())} className="border px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-secondary-50">Hoje</button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary-100 rounded-full"><ChevronLeft size={20}/></button>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-secondary-100 rounded-full"><ChevronRight size={20}/></button>
            <span className="text-lg font-bold text-secondary-700 min-w-[150px]">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-secondary-100 p-1 rounded-lg">
            <button onClick={() => setView('day')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'day' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500'}`}>Dia</button>
            <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'week' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500'}`}>Semana</button>
            <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'month' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500'}`}>Mês</button>
          </div>
          <button onClick={() => {
            setFormData(prev => ({...prev, date: formatISO(new Date())}));
            setShowModal(true);
          }} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg">
            <Plus size={18}/> Novo Agendamento
          </button>
        </div>
      </div>

      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}

      {showModal && (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-secondary-50">
              <h2 className="text-lg font-bold uppercase tracking-tight">Agendar Horário</h2>
              <button onClick={() => setShowModal(false)}><X/></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('/appointments', formData);
                setShowModal(false);
                fetchData();
              } catch(err) { alert("Erro ao salvar") }
            }} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-400 uppercase">Cliente</label>
                <input required className="w-full p-3 border rounded-xl outline-none" placeholder="Nome da cliente" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-400 uppercase">Serviço</label>
                <input required className="w-full p-3 border rounded-xl outline-none" placeholder="Ex: Prova 1" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" required className="p-3 border rounded-xl outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <input type="time" required className="p-3 border rounded-xl outline-none" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
              </div>
              <button className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold shadow-lg">Confirmar Agendamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}