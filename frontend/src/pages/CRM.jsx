import { useEffect, useState, useCallback } from 'react'
import { Plus, Users, Calendar, Clock, Trash2, Edit3, Loader2, X, ChevronRight, Bell, Phone, CheckCircle2 } from 'lucide-react'
import api from '../services/api'

export function CRM() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(null)
  const [viewMode, setViewMode] = useState('CARDS')

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    weddingDate: '',
    weddingTime: '',
    status: 'PROSPECÇÃO',
    trials: [] 
  })

  // BUSCA DE DADOS - Rota corrigida para /crm/customers
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/crm/customers') 
      setCustomers(res.data.data || [])
    } catch (err) { 
      console.error("Erro ao carregar noivas:", err) 
    } finally { 
      setLoading(false) 
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const getAllTrials = () => {
    const all = []
    customers.forEach(noiva => {
      noiva.trials?.forEach(trial => {
        all.push({ ...trial, customerName: noiva.name, customerId: noiva.id })
      })
    })
    return all.sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  const addTrial = () => {
    setFormData({
      ...formData,
      trials: [...formData.trials, { id: Date.now(), date: '', time: '', type: 'Prova de Medidas', done: false }]
    })
  }

  const handleTrialChange = (id, field, value) => {
    const newTrials = formData.trials.map(t => t.id === id ? { ...t, [field]: value } : t)
    setFormData({ ...formData, trials: newTrials })
  }

  const removeTrial = (id) => {
    setFormData({ ...formData, trials: formData.trials.filter(t => t.id !== id) })
  }

  // ENVIO DE DADOS - Rotas corrigidas (sem o /api/v1 manual)
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isEditing) {
        await api.put(`/crm/customers/${isEditing}`, formData)
      } else {
        await api.post('/crm/customers', formData)
      }
      closeForm()
      fetchData()
      alert("Agenda salva com sucesso!")
    } catch (err) { 
      alert("Erro ao salvar dados da noiva. Verifique se o backend está ligado.") 
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setIsEditing(null)
    setFormData({ name: '', phone: '', weddingDate: '', weddingTime: '', status: 'PROSPECÇÃO', trials: [] })
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-secondary-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
            <Users className="text-primary-600" /> Atendimento às Noivas
          </h1>
          <div className="flex gap-4 mt-2">
             <button onClick={() => setViewMode('CARDS')} className={`text-xs font-bold uppercase transition-all ${viewMode === 'CARDS' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-secondary-400'}`}>Lista de Noivas</button>
             <button onClick={() => setViewMode('CALENDAR')} className={`text-xs font-bold uppercase transition-all ${viewMode === 'CALENDAR' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-secondary-400'}`}>Agenda de Provas</button>
          </div>
        </div>
        <button onClick={() => { if(showForm) closeForm(); else setShowForm(true); }} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md transition-all">
          {showForm ? <><X size={18}/> Cancelar</> : <><Plus size={18}/> Nova Noiva</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-primary-50 p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase">Nome</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase">WhatsApp</label>
                  <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase">Data Casamento</label>
                  <input type="date" value={formData.weddingDate} onChange={e => setFormData({...formData, weddingDate: e.target.value})} className="p-2.5 border rounded-xl bg-primary-50 font-bold" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-secondary-500 uppercase">Hora</label>
                  <input type="time" value={formData.weddingTime} onChange={e => setFormData({...formData, weddingTime: e.target.value})} className="p-2.5 border rounded-xl" />
                </div>
              </div>

              <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-secondary-700 flex items-center gap-2 text-sm"><Calendar size={18} className="text-primary-500" /> Cronograma de Provas</h3>
                  <button type="button" onClick={addTrial} className="text-[10px] bg-white border border-primary-200 text-primary-600 px-3 py-1 rounded-full font-bold">+ Adicionar Prova</button>
                </div>
                <div className="space-y-3">
                  {formData.trials.map((trial) => (
                    <div key={trial.id} className="flex gap-3 bg-white p-3 rounded-xl border border-secondary-100 shadow-sm items-center">
                       <input type="date" value={trial.date} onChange={e => handleTrialChange(trial.id, 'date', e.target.value)} className="text-sm p-1 border rounded" />
                       <input type="time" value={trial.time} onChange={e => handleTrialChange(trial.id, 'time', e.target.value)} className="text-sm p-1 border rounded" />
                       <select value={trial.type} onChange={e => handleTrialChange(trial.id, 'type', e.target.value)} className="flex-1 text-sm p-1 border rounded bg-transparent">
                          <option>Prova de Medidas</option>
                          <option>1ª Prova (Estrutura)</option>
                          <option>2ª Prova (Ajustes)</option>
                          <option>Prova Final</option>
                       </select>
                       <button type="button" onClick={() => removeTrial(trial.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-secondary-900 text-white py-4 rounded-2xl font-bold hover:bg-black shadow-lg">
                {isEditing ? 'Atualizar Noiva' : 'Salvar Noiva'}
              </button>
           </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary-600" size={40}/></div>
      ) : viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {customers.map(noiva => (
             <div key={noiva.id} className="bg-white p-5 rounded-2xl border border-secondary-100 shadow-sm hover:shadow-md transition-all border-b-4 border-b-primary-200">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="font-bold text-secondary-900 text-lg">{noiva.name}</h3>
                      <p className="text-xs text-secondary-400 flex items-center gap-1"><Phone size={12}/> {noiva.phone}</p>
                   </div>
                   <button onClick={() => { setIsEditing(noiva.id); setFormData(noiva); setShowForm(true); }} className="p-2 text-secondary-300 hover:text-primary-600"><Edit3 size={18}/></button>
                </div>
                <div className="bg-primary-50 p-3 rounded-xl">
                   <p className="text-[10px] font-bold text-primary-400 uppercase">Data Casamento</p>
                   <p className="font-black text-primary-700">{noiva.weddingDate ? new Date(noiva.weddingDate).toLocaleDateString('pt-PT') : 'A DEFINIR'}</p>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-secondary-200 overflow-hidden shadow-sm">
           <div className="divide-y divide-secondary-100">
              {getAllTrials().map((trial, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-primary-50 transition-colors group">
                   <div className="flex items-center gap-5">
                      <div className="text-center min-w-[60px] p-2 bg-white rounded-xl border border-secondary-100 group-hover:border-primary-200">
                         <p className="text-xl font-black text-primary-600">{new Date(trial.date).getDate()}</p>
                         <p className="text-[10px] font-bold text-secondary-400 uppercase">{new Date(trial.date).toLocaleDateString('pt-PT', {month: 'short'})}</p>
                      </div>
                      <div>
                         <h4 className="font-bold text-secondary-900">{trial.customerName}</h4>
                         <p className="text-sm text-secondary-500 flex items-center gap-1"><CheckCircle2 size={14} className="text-primary-400"/> {trial.type} às {trial.time}</p>
                      </div>
                   </div>
                </div>
              ))}
              {getAllTrials().length === 0 && <p className="p-10 text-center text-secondary-400 italic">Nenhum agendamento futuro.</p>}
           </div>
        </div>
      )}
    </div>
  )
}