import { useState } from 'react'
import { 
  Save, 
  MessageCircle, 
  Palette, 
  FileText, 
  Image as ImageIcon,
  Settings as SettingsIcon, // Renomeado para evitar conflito com a função Settings
  Info
} from 'lucide-react'

/**
 * COMPONENTE DE CONFIGURAÇÕES - ATELIÊ PRO
 * Centraliza a gestão de Branding, WhatsApp e preferências de Orçamento.
 */
export function Settings() {
  const [isSaving, setIsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('branding')

  // Estado inicial (planejado para integração com backend)
  const [config, setConfig] = useState({
    atelierName: 'Intracking Ateliê',
    primaryColor: '#4f46e5',
    secondaryColor: '#64748b',
    whatsappMessage: 'Olá {{nome}}! ✨ Segue o orçamento do seu projeto exclusivo Ateliê PRO: {{valor}}. Ficou maravilhoso! Vamos conversar?',
    budgetFooter: 'Este orçamento tem validade de 7 dias. O projeto só será iniciado após confirmação de pagamento.',
    showSketch: true,
    showUnitPrices: true
  })

  // Função para salvar as configurações
  const handleSave = async () => {
    setIsSaving(true)
    // Simulação de persistência
    setTimeout(() => {
      alert("Configurações atualizadas com sucesso!")
      setIsSaving(false)
    }, 1000)
  }

  // Componente interno para botões de tags dinâmicas
  const Tag = ({ label, code }) => (
    <button 
      type="button"
      onClick={() => setConfig({...config, whatsappMessage: config.whatsappMessage + ` {{${code}}}`})}
      className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all mr-2 mb-2 border border-indigo-100"
    >
      + {label}
    </button>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* SEÇÃO: CABEÇALHO DA PÁGINA */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-secondary-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-secondary-900 text-white rounded-2xl">
            <SettingsIcon size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-secondary-900 uppercase italic tracking-tighter">Configurações do Sistema</h1>
            <p className="text-xs text-secondary-400 font-bold uppercase tracking-widest">Branding, WhatsApp e Documentos</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : <><Save size={18}/> Salvar Tudo</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SEÇÃO: MENU LATERAL DE NAVEGAÇÃO INTERNA */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'branding', label: 'Identidade Visual', icon: Palette },
            { id: 'whatsapp', label: 'Comunicação WhatsApp', icon: MessageCircle },
            { id: 'budget', label: 'Personalizar Orçamento', icon: FileText },
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-4 p-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all ${
                activeSection === section.id 
                ? 'bg-secondary-900 text-white shadow-xl translate-x-2' 
                : 'bg-white text-secondary-400 hover:bg-secondary-50'
              }`}
            >
              <section.icon size={20} />
              {section.label}
            </button>
          ))}
        </div>

        {/* SEÇÃO: CONTEÚDO DINÂMICO DOS FORMULÁRIOS */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* ABA: IDENTIDADE VISUAL */}
          {activeSection === 'branding' && (
            <div className="bg-white p-10 rounded-[3rem] border border-secondary-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-sm font-black uppercase text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-4 tracking-[0.2em] text-left">
                <Palette size={18} className="text-primary-600" /> Identidade Visual
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Logo do Ateliê</label>
                  <div className="border-4 border-dashed border-secondary-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-secondary-300 hover:border-primary-400 hover:text-primary-400 transition-all cursor-pointer bg-secondary-50">
                    <ImageIcon size={48} className="mb-2" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-center">Clique ou arraste a logo</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Nome da Marca</label>
                    <input 
                      value={config.atelierName}
                      onChange={e => setConfig({...config, atelierName: e.target.value})}
                      className="w-full p-4 bg-secondary-50 rounded-2xl font-bold border-2 border-transparent focus:border-primary-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Cor Primária</label>
                    <div className="flex items-center gap-2 bg-secondary-50 p-2 rounded-2xl border-2 border-transparent focus-within:border-primary-600">
                      <input type="color" value={config.primaryColor} onChange={e => setConfig({...config, primaryColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" />
                      <span className="font-mono text-xs font-bold uppercase">{config.primaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: WHATSAPP */}
          {activeSection === 'whatsapp' && (
            <div className="bg-white p-10 rounded-[3rem] border border-secondary-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-300 text-left">
              <h2 className="text-sm font-black uppercase text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-4 tracking-[0.2em]">
                <MessageCircle size={18} className="text-emerald-500" /> Mensagem de Envio do Orçamento
              </h2>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Template da Mensagem</label>
                <textarea 
                  rows={5}
                  value={config.whatsappMessage}
                  onChange={e => setConfig({...config, whatsappMessage: e.target.value})}
                  className="w-full p-6 bg-secondary-50 rounded-[2rem] font-bold text-secondary-700 border-2 border-transparent focus:border-emerald-500 outline-none transition-all resize-none"
                />
                
                <div className="flex flex-wrap items-center p-4 bg-secondary-50 rounded-2xl border border-secondary-100">
                  <span className="text-[9px] font-black uppercase text-secondary-400 mr-4 mb-2 flex items-center gap-1"><Info size={12}/> Inserir Dados Dinâmicos:</span>
                  <Tag label="Nome da Noiva" code="nome" />
                  <Tag label="Valor do Orçamento" code="valor" />
                  <Tag label="Data do Evento" code="data" />
                </div>
              </div>
            </div>
          )}

          {/* ABA: ORÇAMENTO (PDF) */}
          {activeSection === 'budget' && (
            <div className="bg-white p-10 rounded-[3rem] border border-secondary-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-300 text-left">
              <h2 className="text-sm font-black uppercase text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-4 tracking-[0.2em]">
                <FileText size={18} className="text-amber-500" /> PDF e Impressão
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Termos e Condições (Rodapé)</label>
                  <textarea 
                    rows={4}
                    value={config.budgetFooter}
                    onChange={e => setConfig({...config, budgetFooter: e.target.value})}
                    className="w-full p-6 bg-secondary-50 rounded-[2rem] font-bold text-secondary-700 border-2 border-transparent focus:border-amber-500 outline-none transition-all resize-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex items-center justify-between p-6 bg-secondary-50 rounded-2xl border border-secondary-100">
                      <span className="text-xs font-black uppercase text-secondary-600 tracking-tighter">Exibir croqui no PDF</span>
                      <input type="checkbox" checked={config.showSketch} onChange={e => setConfig({...config, showSketch: e.target.checked})} className="w-6 h-6 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-600 cursor-pointer" />
                   </div>
                   <div className="flex items-center justify-between p-6 bg-secondary-50 rounded-2xl border border-secondary-100">
                      <span className="text-xs font-black uppercase text-secondary-600 tracking-tighter">Exibir preços unitários</span>
                      <input type="checkbox" checked={config.showUnitPrices} onChange={e => setConfig({...config, showUnitPrices: e.target.checked})} className="w-6 h-6 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-600 cursor-pointer" />
                   </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}