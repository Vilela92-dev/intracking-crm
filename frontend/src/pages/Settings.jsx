import { useState } from 'react'
import { 
  Save, 
  MessageCircle, 
  Palette, 
  FileText, 
  Image as ImageIcon,
  Settings as SettingsIcon,
  Info,
  FileSignature,
  CheckCircle2
} from 'lucide-react'

/**
 * COMPONENTE DE CONFIGURAÇÕES - ATELIÊ PRO (VERSÃO FULL COM CONTRATOS)
 */
export function Settings() {
  const [isSaving, setIsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('branding')
  const [activeContractTab, setActiveContractTab] = useState('sale')

  // Estado centralizado com todos os campos (Branding, Zap, Orçamento e Contratos)
  const [config, setConfig] = useState({
    atelierName: 'Intracking Ateliê',
    primaryColor: '#4f46e5',
    secondaryColor: '#64748b',
    // WhatsApp
    whatsappMessage: 'Olá {{nome}}! ✨ Segue o orçamento do seu projeto exclusivo Ateliê PRO: {{valor}}. Ficou maravilhoso! Vamos conversar?',
    // Orçamento (PDF)
    budgetFooter: 'Este orçamento tem validade de 7 dias. O projeto só será iniciado após confirmação de pagamento.',
    showSketch: true,
    showUnitPrices: true,
    // Dados Jurídicos do Ateliê
    cnpj: '',
    address: '',
    // Modelos de Contrato
    contractSale: 'CONTRATO DE COMPRA E VENDA\n\nCONTRATADA: {{atelierName}}, inscrita no CNPJ/CPF {{cnpj_atelier}}, com sede em {{endereco_atelier}}.\n\nCONTRATANTE: {{nome}}, portadora do CPF {{cpf_cliente}}.\n\nOBJETO: O presente contrato tem como objeto a venda de: {{itens}}.\n\nVALOR TOTAL: {{total}}.\n\nAssinatura Contratada: __________________________\nAssinatura Contratante: __________________________',
    contractRental: 'CONTRATO DE LOCAÇÃO DE VESTUÁRIO\n\nLOCADOR: {{atelierName}}, com sede em {{endereco_atelier}}.\n\nLOCATÁRIO: {{nome}}, portadora do CPF {{cpf_cliente}}.\n\nDATA DO EVENTO: {{data_evento}}.\n\nOBJETO: Locação da(s) peça(s): {{itens}}.\n\nVALOR TOTAL: {{total}}.\n\nTERMOS: A peça deve ser devolvida em perfeito estado. Multas por atraso se aplicam conforme combinado.\n\nAssinatura Locador: __________________________\nAssinatura Locatário: __________________________'
  })

  // Função para salvar as configurações
  const handleSave = async () => {
    setIsSaving(true)
    // Simulação de persistência (Aqui entrará seu fetch para o backend futuramente)
    setTimeout(() => {
      alert("Configurações do Ateliê atualizadas com sucesso!")
      setIsSaving(false)
    }, 1000)
  }

  // Lógica para inserir tags no campo de texto ativo
  const insertTag = (code) => {
    let fieldToUpdate = '';
    
    if (activeSection === 'whatsapp') {
      fieldToUpdate = 'whatsappMessage';
    } else if (activeSection === 'contracts') {
      fieldToUpdate = activeContractTab === 'sale' ? 'contractSale' : 'contractRental';
    } else if (activeSection === 'budget') {
      fieldToUpdate = 'budgetFooter';
    }

    if (fieldToUpdate) {
      setConfig({
        ...config,
        [fieldToUpdate]: config[fieldToUpdate] + ` {{${code}}}`
      });
    }
  }

  // Componente de Botão de Tag Reutilizável
  const Tag = ({ label, code }) => (
    <button 
      type="button"
      onClick={() => insertTag(code)}
      className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all mr-2 mb-2 border border-indigo-100 flex items-center gap-1"
    >
      + {label}
    </button>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-secondary-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-secondary-900 text-white rounded-2xl shadow-lg">
            <SettingsIcon size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-secondary-900 uppercase italic tracking-tighter leading-none">Configurações</h1>
            <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-[0.2em] mt-1">Personalize a identidade e documentos do seu Ateliê</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase hover:bg-primary-700 transition-all flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
        >
          {isSaving ? 'Processando...' : <><Save size={18}/> Salvar Tudo</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* MENU LATERAL DE NAVEGAÇÃO */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'branding', label: 'Identidade Visual', icon: Palette, color: 'text-indigo-500' },
            { id: 'whatsapp', label: 'Comunicação Zap', icon: MessageCircle, color: 'text-emerald-500' },
            { id: 'budget', label: 'Orçamentos (PDF)', icon: FileText, color: 'text-amber-500' },
            { id: 'contracts', label: 'Contratos (PDF)', icon: FileSignature, color: 'text-violet-500' },
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
              <section.icon size={20} className={activeSection === section.id ? 'text-white' : section.color} />
              {section.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div className="lg:col-span-3">
          
          {/* ABA 1: IDENTIDADE VISUAL */}
          {activeSection === 'branding' && (
            <div className="bg-white p-10 rounded-[3rem] border border-secondary-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-sm font-black uppercase text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-4 tracking-[0.2em] text-left">
                <Palette size={18} className="text-primary-600" /> Branding do Ateliê
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Logo da Marca</label>
                  <div className="border-4 border-dashed border-secondary-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-secondary-300 hover:border-primary-400 hover:text-primary-400 transition-all cursor-pointer bg-secondary-50 group">
                    <ImageIcon size={48} className="mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-center">Clique para subir nova logo</span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Nome Exibido nos Documentos</label>
                    <input 
                      value={config.atelierName}
                      onChange={e => setConfig({...config, atelierName: e.target.value})}
                      className="w-full p-4 bg-secondary-50 rounded-2xl font-bold border-2 border-transparent focus:border-primary-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Cor de Destaque (Tema)</label>
                    <div className="flex items-center gap-3 bg-secondary-50 p-3 rounded-2xl border-2 border-transparent focus-within:border-primary-600 transition-all">
                      <input type="color" value={config.primaryColor} onChange={e => setConfig({...config, primaryColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none" />
                      <span className="font-mono text-xs font-black uppercase">{config.primaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: WHATSAPP */}
          {activeSection === 'whatsapp' && (
            <div className="bg-white p-10 rounded-[3rem] border border-secondary-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-300 text-left">
              <h2 className="text-sm font-black uppercase text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-4 tracking-[0.2em]">
                <MessageCircle size={18} className="text-emerald-500" /> Template WhatsApp
              </h2>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Mensagem de Envio</label>
                <textarea 
                  rows={6}
                  value={config.whatsappMessage}
                  onChange={e => setConfig({...config, whatsappMessage: e.target.value})}
                  className="w-full p-6 bg-secondary-50 rounded-[2.5rem] font-bold text-secondary-700 border-2 border-transparent focus:border-emerald-500 outline-none transition-all resize-none leading-relaxed"
                />
                <div className="flex flex-wrap items-center p-5 bg-secondary-50 rounded-3xl border border-secondary-100">
                  <span className="text-[9px] font-black uppercase text-secondary-400 mr-4 mb-2 flex items-center gap-1"><Info size={14}/> Inserir Tag:</span>
                  <Tag label="Noiva" code="nome" />
                  <Tag label="Valor" code="valor" />
                  <Tag label="Data Evento" code="data" />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: ORÇAMENTO (PDF) */}
          {activeSection === 'budget' && (
            <div className="bg-white p-10 rounded-[3rem] border border-secondary-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-300 text-left">
              <h2 className="text-sm font-black uppercase text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-4 tracking-[0.2em]">
                <FileText size={18} className="text-amber-500" /> Detalhes do Orçamento PDF
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-secondary-400 uppercase ml-2 italic">Rodapé / Observações do Orçamento</label>
                  <textarea 
                    rows={4}
                    value={config.budgetFooter}
                    onChange={e => setConfig({...config, budgetFooter: e.target.value})}
                    className="w-full p-6 bg-secondary-50 rounded-[2rem] font-bold text-secondary-700 border-2 border-transparent focus:border-amber-500 outline-none transition-all resize-none text-xs"
                  />
                  <div className="mt-2 flex gap-2">
                    <Tag label="Validade" code="validade" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${config.showSketch ? 'bg-amber-50 border-amber-200' : 'bg-secondary-50 border-secondary-100'}`}>
                    <span className="text-xs font-black uppercase text-secondary-900">Exibir Croqui no Orçamento</span>
                    <input type="checkbox" checked={config.showSketch} onChange={e => setConfig({...config, showSketch: e.target.checked})} className="w-6 h-6 rounded-lg cursor-pointer accent-amber-500" />
                  </div>
                  <div className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${config.showUnitPrices ? 'bg-amber-50 border-amber-200' : 'bg-secondary-50 border-secondary-100'}`}>
                    <span className="text-xs font-black uppercase text-secondary-900">Exibir Preços Unitários</span>
                    <input type="checkbox" checked={config.showUnitPrices} onChange={e => setConfig({...config, showUnitPrices: e.target.checked})} className="w-6 h-6 rounded-lg cursor-pointer accent-amber-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: CONTRATOS (PDF) */}
          {activeSection === 'contracts' && (
            <div className="bg-white p-10 rounded-[3rem] border border-secondary-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-300 text-left">
              <div className="flex justify-between items-center border-b border-secondary-100 pb-4">
                <h2 className="text-sm font-black uppercase text-secondary-900 flex items-center gap-2 tracking-[0.2em]">
                  <FileSignature size={18} className="text-violet-500" /> Gestão de Contratos Automatizados
                </h2>
                {/* SUB-ABAS DE CONTRATO */}
                <div className="flex bg-secondary-100 p-1 rounded-xl shadow-inner">
                  <button 
                    onClick={() => setActiveContractTab('sale')}
                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeContractTab === 'sale' ? 'bg-white shadow text-violet-600 scale-105' : 'text-secondary-400'}`}
                  >
                    Venda
                  </button>
                  <button 
                    onClick={() => setActiveContractTab('rental')}
                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeContractTab === 'rental' ? 'bg-white shadow text-violet-600 scale-105' : 'text-secondary-400'}`}
                  >
                    Aluguel
                  </button>
                </div>
              </div>

              {/* DADOS JURÍDICOS DO ATELIÊ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-secondary-400 uppercase ml-2 italic">CNPJ ou CPF do Ateliê</label>
                  <input 
                    placeholder="Ex: 00.000.000/0001-00"
                    value={config.cnpj}
                    onChange={e => setConfig({...config, cnpj: e.target.value})}
                    className="w-full p-4 bg-secondary-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none text-xs transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-secondary-400 uppercase ml-2 italic">Endereço Comercial</label>
                  <input 
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    value={config.address}
                    onChange={e => setConfig({...config, address: e.target.value})}
                    className="w-full p-4 bg-secondary-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none text-xs transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* EDITOR DE TEXTO DAS CLÁUSULAS */}
              <div className="space-y-4">
                <div className="flex justify-between items-end ml-2">
                  <label className="text-[10px] font-black text-secondary-400 uppercase italic">
                    Texto do Contrato de {activeContractTab === 'sale' ? 'Venda' : 'Aluguel'}
                  </label>
                  <span className="text-[8px] bg-violet-100 text-violet-600 px-2 py-1 rounded-full font-black uppercase">Automático</span>
                </div>
                <textarea 
                  rows={12}
                  value={activeContractTab === 'sale' ? config.contractSale : config.contractRental}
                  onChange={e => setConfig({
                    ...config, 
                    [activeContractTab === 'sale' ? 'contractSale' : 'contractRental']: e.target.value
                  })}
                  className="w-full p-8 bg-secondary-50 rounded-[3rem] font-medium text-secondary-700 border-2 border-transparent focus:border-violet-500 outline-none transition-all resize-none text-xs leading-relaxed shadow-inner"
                />
                
                {/* TAGS DE CONTRATO */}
                <div className="p-6 bg-secondary-50 rounded-[2rem] border border-secondary-100">
                   <div className="text-[9px] font-black uppercase text-secondary-400 mb-4 flex items-center gap-2">
                     <Info size={14} className="text-violet-400" /> Tags Dinâmicas para o Contrato
                   </div>
                   <div className="flex flex-wrap">
                      <Tag label="Ateliê" code="atelierName" />
                      <Tag label="CNPJ Ateliê" code="cnpj_atelier" />
                      <Tag label="Endereço Ateliê" code="endereco_atelier" />
                      <div className="w-full h-px bg-secondary-100 my-2" />
                      <Tag label="Nome Cliente" code="nome" />
                      <Tag label="CPF Cliente" code="cpf_cliente" />
                      <Tag label="Endereço Cliente" code="endereco_cliente" />
                      <Tag label="Lista de Peças" code="itens" />
                      <Tag label="Valor do Contrato" code="total" />
                      <Tag label="Data Evento" code="data_evento" />
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