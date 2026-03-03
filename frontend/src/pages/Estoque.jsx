import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Plus, Package, Trash2, X, Scissors, 
  Calculator, Layers, Loader, CheckCircle2, CreditCard
} from 'lucide-react';
import api from '../services/api';

/**
 * ESTOQUE.JSX - VERSÃO FINAL REVISADA (MARÇO/2026)
 * - FIX: Seleção de Unidade/Metro corrigida.
 * - FIX: Envio de dados para baixa de estoque na produção.
 * - FIX: Restauração do parcelamento financeiro (1x a 6x).
 * - CLEAN: Removido fornecedor na aba de confecção.
 */

export function Estoque() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('CONFECCAO'); 
  const [showMaterialList, setShowMaterialList] = useState(false);

  // ESTADOS DA PRODUÇÃO (CONFECÇÃO)
  const [productionItem, setProductionItem] = useState({ 
    name: '', labor: 0, markup: 50
  });
  const [composition, setComposition] = useState([]);

  // ESTADOS DA ENTRADA DE NOTA (COMPRA)
  const [cart, setCart] = useState([]);
  const [numParcelas, setNumParcelas] = useState(1);
  const [currentItem, setCurrentItem] = useState({
    name: '', unitType: 'METRO', unitPrice: '', quantity: '', supplierId: ''
  });

  // CARREGAMENTO DE DATA
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, suppRes] = await Promise.all([
        api.get('/products'),
        api.get('/suppliers')
      ]);
      setProducts(prodRes.data?.data || []);
      setSuppliers(suppRes.data?.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CÁLCULOS TOTAIS (QUADRO PRETO)
  const financialSummary = useMemo(() => {
    const costMaterials = composition.reduce((acc, i) => acc + (Number(i.price) * Number(i.usedQty)), 0);
    const totalCost = costMaterials + Number(productionItem.labor);
    const suggestedPrice = totalCost * (1 + (Number(productionItem.markup) / 100));
    const cartTotal = cart.reduce((acc, i) => acc + (Number(i.unitPrice) * Number(i.quantity)), 0);
    return { costMaterials, totalCost, suggestedPrice, cartTotal };
  }, [composition, productionItem, cart]);

  // FINALIZAR PRODUÇÃO (GERA PEÇA E BAIXA INSUMOS)
  const handleFinalizeProduction = async () => {
    if (!productionItem.name || composition.length === 0) {
      return alert("Preencha o nome da peça e selecione os materiais.");
    }

    try {
      await api.post('/products/produce', {
        name: productionItem.name,
        composition: composition.map(c => ({
          productId: c.id || c._id, // Envia o ID para o main.ts localizar
          quantityUsed: Number(c.usedQty)
        })),
        price: financialSummary.suggestedPrice,
        totalCost: financialSummary.totalCost
      });

      alert("🚀 Peça confeccionada! O estoque dos materiais foi baixado.");
      setComposition([]);
      setProductionItem({ name: '', labor: 0, markup: 50 });
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert("Erro ao processar produção.");
    }
  };

  // FINALIZAR COMPRA (GERA ESTOQUE E FINANCEIRO)
  const handleFinalizePurchase = async () => {
    if (cart.length === 0 || !currentItem.supplierId) {
      return alert("Adicione itens à nota e selecione o fornecedor.");
    }

    try {
      const valorParcela = financialSummary.cartTotal / numParcelas;
      const bills = Array.from({ length: numParcelas }, (_, i) => ({
        value: valorParcela,
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + i)).toISOString().split('T')[0]
      }));

      await api.post('/products/purchase', {
        supplierId: currentItem.supplierId,
        items: cart,
        bills,
        total: financialSummary.cartTotal
      });

      alert("✅ Estoque atualizado e financeiro gerado!");
      setCart([]);
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert("Erro ao salvar compra.");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    try {
      await api.delete(`/products/${item.id || item._id}`);
      fetchData();
      alert("Item removido e financeiro pendente estornado.");
    } catch (err) {
      alert("Erro ao excluir item.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-secondary-400">SINCRONIZANDO...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center bg-white px-8 py-6 rounded-[2.5rem] border border-secondary-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary-50 p-3 rounded-2xl"><Package className="text-primary-600" size={28}/></div>
          <h1 className="text-3xl font-black text-secondary-900 italic uppercase tracking-tighter">Estoque</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-secondary-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary-600 transition-all shadow-lg">
          {showForm ? "FECHAR" : "NOVA OPERAÇÃO"}
        </button>
      </header>

      {showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
          {/* COLUNA DE LANÇAMENTO */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-secondary-200 shadow-sm">
            <div className="flex bg-secondary-100 p-1.5 rounded-2xl w-fit mb-8">
              <button onClick={() => setActiveTab('CONFECCAO')} className={`px-8 py-3 rounded-xl font-black text-[10px] ${activeTab === 'CONFECCAO' ? 'bg-white text-primary-600 shadow-md' : 'text-secondary-400'}`}>CONFECÇÃO</button>
              <button onClick={() => setActiveTab('COMPRA')} className={`px-8 py-3 rounded-xl font-black text-[10px] ${activeTab === 'COMPRA' ? 'bg-white text-primary-600 shadow-md' : 'text-secondary-400'}`}>ENTRADA DE NOTA</button>
            </div>

            {activeTab === 'CONFECCAO' ? (
              <div className="space-y-6">
                <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-100">
                  <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">O que você está produzindo?</p>
                  <input className="bg-transparent border-0 font-black text-xl w-full focus:ring-0 uppercase" placeholder="EX: VESTIDO DE RENDA" value={productionItem.name} onChange={e => setProductionItem({...productionItem, name: e.target.value})}/>
                </div>
                
                <div className="space-y-4">
                  {!showMaterialList ? (
                    <button onClick={() => setShowMaterialList(true)} className="w-full py-8 border-2 border-dashed border-secondary-200 rounded-[2rem] flex items-center justify-center gap-3 text-secondary-400 font-black uppercase text-xs hover:border-primary-400 hover:text-primary-600 transition-all">
                      <Plus size={20}/> ADICIONAR MATERIAIS DO ESTOQUE
                    </button>
                  ) : (
                    <div className="bg-secondary-900 rounded-[2rem] p-6 space-y-4 animate-in zoom-in-95">
                      <div className="flex justify-between items-center text-white font-black text-[10px] uppercase"><span>Selecione o Insumo</span><button onClick={() => setShowMaterialList(false)}><X size={20}/></button></div>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                        {products.map(p => (
                          <button key={p.id || p._id} onClick={() => { if(!composition.find(c => (c.id || c._id) === (p.id || p._id))) setComposition([...composition, {...p, usedQty: 1}]); setShowMaterialList(false); }} className="flex justify-between items-center bg-white/10 hover:bg-primary-600 p-4 rounded-xl text-white transition-colors">
                            <span className="font-bold text-xs uppercase">{p.name}</span>
                            <span className="text-[10px] opacity-50">SALDO: {p.stock}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {composition.map((item, idx) => (
                      <div key={item.id || item._id} className="flex justify-between items-center bg-white p-5 rounded-[2rem] border border-secondary-100 shadow-sm">
                        <span className="font-black text-xs uppercase text-secondary-800">{item.name}</span>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <span className="text-[8px] font-black text-secondary-300 uppercase block mb-1">QTD USADA</span>
                            <input type="number" className="w-16 bg-secondary-100 border-0 p-2 font-black text-center rounded-xl" value={item.usedQty} onChange={e => {
                              const newC = [...composition]; newC[idx].usedQty = e.target.value; setComposition(newC);
                            }}/>
                          </div>
                          <button onClick={() => setComposition(composition.filter(c => (c.id || c._id) !== (item.id || item._id)))} className="text-red-300 hover:text-red-500 mt-4"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                    <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Fornecedor</p>
                    <select className="w-full bg-transparent font-bold border-0 p-0 focus:ring-0" value={currentItem.supplierId} onChange={e => setCurrentItem({...currentItem, supplierId: e.target.value})}>
                      <option value="">SELECIONE...</option>
                      {suppliers.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                    <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Unidade de Medida</p>
                    <select className="w-full bg-transparent font-bold border-0 p-0 focus:ring-0" value={currentItem.unitType} onChange={e => setCurrentItem({...currentItem, unitType: e.target.value})}>
                      <option value="METRO">METRO (m)</option>
                      <option value="UNIDADE">UNIDADE (un)</option>
                    </select>
                  </div>
                </div>
                <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                  <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Nome do Material</p>
                  <input className="bg-transparent border-0 font-black text-lg w-full focus:ring-0 uppercase" placeholder="EX: RENDA FRANCESA AZUL" value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                    <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Preço (Custo)</p>
                    <input type="number" className="bg-transparent border-0 font-black text-lg w-full focus:ring-0" value={currentItem.unitPrice} onChange={e => setCurrentItem({...currentItem, unitPrice: e.target.value})}/>
                  </div>
                  <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                    <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Qtd Comprada</p>
                    <input type="number" className="bg-transparent border-0 font-black text-lg w-full focus:ring-0" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})}/>
                  </div>
                </div>
                <button onClick={() => {
                  if(!currentItem.name || !currentItem.quantity || !currentItem.supplierId) return alert("Preencha todos os dados da nota.");
                  setCart([...cart, {...currentItem, tempId: Date.now()}]);
                  setCurrentItem({...currentItem, name: '', unitPrice: '', quantity: ''});
                }} className="w-full bg-secondary-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest">+ ADICIONAR ITEM À NOTA</button>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cart.map(i => (
                    <div key={i.tempId} className="flex justify-between p-4 bg-secondary-50 rounded-xl font-bold text-[10px] border border-secondary-100 uppercase">
                      <span>{i.name} ({i.quantity} {i.unitType === 'METRO' ? 'm' : 'un'})</span>
                      <span className="text-primary-600">R$ {(i.quantity * i.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ASIDE DE TOTAIS E PARCELAMENTO */}
          <aside className="bg-secondary-900 p-10 rounded-[3.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="space-y-8 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase text-secondary-400 tracking-widest mb-1">Valor Total</p>
                <h2 className="text-6xl font-black text-primary-400 tracking-tighter">
                  <span className="text-xl mr-2 italic font-normal text-white">R$</span>
                  {activeTab === 'CONFECCAO' ? financialSummary.suggestedPrice.toFixed(2) : financialSummary.cartTotal.toFixed(2)}
                </h2>
              </div>
              
              {activeTab === 'CONFECCAO' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-secondary-400 mb-1 uppercase">Mão de Obra</p>
                    <input type="number" className="bg-transparent border-0 font-black text-primary-400 text-xl w-full focus:ring-0" value={productionItem.labor} onChange={e => setProductionItem({...productionItem, labor: e.target.value})}/>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-secondary-400 mb-1 uppercase">Markup %</p>
                    <input type="number" className="bg-transparent border-0 font-black text-primary-400 text-xl w-full focus:ring-0" value={productionItem.markup} onChange={e => setProductionItem({...productionItem, markup: e.target.value})}/>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black uppercase text-secondary-400 mb-3 flex items-center gap-2"><CreditCard size={14}/> Parcelar Pagamento</p>
                  <select className="w-full bg-secondary-800 text-white p-3 rounded-xl font-bold border-0 focus:ring-2 focus:ring-primary-500 outline-none" value={numParcelas} onChange={e => setNumParcelas(Number(e.target.value))}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}x de R$ {(financialSummary.cartTotal / n).toFixed(2)}</option>)}
                  </select>
                </div>
              )}
            </div>
            
            <button onClick={activeTab === 'CONFECCAO' ? handleFinalizeProduction : handleFinalizePurchase} className="w-full bg-primary-600 text-white py-6 mt-8 rounded-3xl font-black uppercase text-lg hover:bg-primary-500 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95">
              <CheckCircle2 size={24}/> {activeTab === 'CONFECCAO' ? "FINALIZAR PEÇA" : "SALVAR COMPRA"}
            </button>
          </aside>
        </div>
      )}

      {/* GRID DE PRODUTOS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
        {products.map(p => (
          <div key={p.id || p._id} className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm relative group hover:shadow-xl transition-all duration-300">
            <button onClick={() => handleDelete(p)} className="absolute top-6 right-6 p-2 text-secondary-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase italic mb-4 inline-block ${p.unit === 'METROS' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{p.unit === 'METROS' ? 'METRAGEM' : 'UNIDADE'}</span>
            <h3 className="font-black text-secondary-800 uppercase text-xs mb-8 h-8 overflow-hidden line-clamp-2">{p.name}</h3>
            <div className="flex justify-between items-end border-t border-secondary-50 pt-6">
              <div><p className="text-[10px] text-secondary-300 font-bold mb-1 uppercase">Saldo</p><p className="text-4xl font-black text-secondary-900 tracking-tighter">{p.stock}<span className="text-sm ml-1 text-secondary-400 font-bold lowercase">{p.unit === 'METROS' ? 'm' : 'un'}</span></p></div>
              <div className="text-right"><p className="text-[10px] text-primary-500 font-bold mb-1 uppercase">Custo</p><p className="font-black text-secondary-800 italic text-sm">R$ {Number(p.price).toFixed(2)}</p></div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}