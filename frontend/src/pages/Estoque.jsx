import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Plus, Package, Trash2, X, Scissors, 
  Calculator, Layers, Loader, CheckCircle2, CreditCard,
  Filter, Tag, ShoppingCart, Calendar, Truck, AlertCircle
} from 'lucide-react';
import api from '../services/api';

export function Estoque() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('CONFECCAO'); 
  const [filterType, setFilterType] = useState('TODOS'); 
  const [showMaterialList, setShowMaterialList] = useState(false);

  const [productionItem, setProductionItem] = useState({ 
    name: '', labor: 0, markup: 50, can_rent: true, can_sell: false 
  });
  const [composition, setComposition] = useState([]);

  const [cart, setCart] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    name: '', unitType: 'METRO', unitPrice: '', quantity: '', supplierId: ''
  });
  
  const [purchaseMeta, setPurchaseMeta] = useState({
    invoiceNumber: '',
    baseDate: new Date().toISOString().split('T')[0],
    condition: '30d'
  });
  const [installments, setInstallments] = useState([]);

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

  // FILTRO ORIGINAL PRESERVADO
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (filterType === 'TODOS') return products;
    return products.filter(p => p.category === filterType);
  }, [products, filterType]);

  const financialSummary = useMemo(() => {
    const costMaterials = (composition || []).reduce((acc, i) => {
      return acc + (parseFloat(i.price || 0) * parseFloat(i.usedQty || 0));
    }, 0);

    const labor = parseFloat(productionItem.labor || 0);
    const markup = parseFloat(productionItem.markup || 0);
    
    const totalCost = costMaterials + labor;
    const suggestedPrice = totalCost * (1 + (markup / 100));

    const cartTotal = (cart || []).reduce((acc, i) => {
      return acc + (parseFloat(i.unitPrice || 0) * parseFloat(i.quantity || 0));
    }, 0);

    return { 
      costMaterials, 
      totalCost, 
      suggestedPrice: isNaN(suggestedPrice) ? 0 : suggestedPrice, 
      cartTotal: isNaN(cartTotal) ? 0 : cartTotal 
    };
  }, [composition, productionItem, cart]);

  const generateInstallments = useCallback(() => {
    const total = financialSummary.cartTotal;
    const date = purchaseMeta.baseDate || new Date().toISOString().split('T')[0];
    const condition = purchaseMeta.condition;
    
    if (total <= 0) {
      setInstallments([]);
      return;
    }

    let count = 1;
    let interval = 30;

    if (condition === 'avista') { count = 1; interval = 0; }
    else if (condition === '30d') { count = 1; interval = 30; }
    else if (condition === '30/60') { count = 2; interval = 30; }
    else if (condition === '30/60/90') { count = 3; interval = 30; }

    const newInstallments = [];
    for (let i = 1; i <= count; i++) {
      const d = new Date(date + 'T00:00:00');
      d.setDate(d.getDate() + (i * (condition === 'avista' ? 0 : interval)));
      newInstallments.push({
        value: (total / count).toFixed(2),
        dueDate: d.toISOString().split('T')[0]
      });
    }
    setInstallments(newInstallments);
  }, [financialSummary.cartTotal, purchaseMeta.baseDate, purchaseMeta.condition]);

  useEffect(() => {
    if (activeTab === 'COMPRA') generateInstallments();
  }, [financialSummary.cartTotal, purchaseMeta.baseDate, purchaseMeta.condition, activeTab, generateInstallments]);

  const handleFinalizePurchase = async () => {
    if (cart.length === 0 || !currentItem.supplierId) {
      return alert("Adicione itens à nota e selecione o fornecedor.");
    }
    const supplier = suppliers.find(s => (s.id || s._id) === currentItem.supplierId);
    const itemsNames = cart.map(i => i.name).join(', ');
    const baseDescription = `COMPRA: ${supplier?.name || 'FORNECEDOR'} | NF: ${purchaseMeta.invoiceNumber || 'S/N'} (${itemsNames})`;

    try {
      await api.post('/products/produce', { 
        items: cart.map(i => ({ 
          ...i, 
          category: 'INSUMO', 
          supplierId: currentItem.supplierId,
          unit: i.unitType 
        })),
        bills: installments.map((inst, idx) => ({
          ...inst,
          description: `${baseDescription} - P${idx + 1}/${installments.length}`,
          invoiceNumber: purchaseMeta.invoiceNumber
        }))
      });
      alert("✅ Estoque e Financeiro atualizados!");
      setCart([]);
      setInstallments([]);
      setShowForm(false);
      fetchData();
    } catch (err) { alert("Erro ao salvar compra."); }
  };

  const handleFinalizeProduction = async () => {
    if (!productionItem.name || composition.length === 0) {
      return alert("Preencha o nome da peça e selecione os materiais.");
    }
    try {
      await api.post('/products/produce', {
        items: [{
          name: productionItem.name,
          quantity: 1,
          unitType: 'UNIDADE',
          price: financialSummary.suggestedPrice,
          category: 'PEÇA_PRONTA',
          status: 'DISPONIVEL',
          can_rent: productionItem.can_rent,
          can_sell: productionItem.can_sell
        }],
        composition: composition.map(c => ({
          productId: c.id || c._id,
          quantityUsed: Number(c.usedQty)
        }))
      });
      alert("🚀 Peça finalizada!");
      setComposition([]);
      setProductionItem({ name: '', labor: 0, markup: 50, can_rent: true, can_sell: false });
      setShowForm(false);
      fetchData();
    } catch (err) { alert("Erro ao processar produção."); }
  };

  const handleDelete = async (item) => {
    const id = item.id || item._id;
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      fetchData();
    } catch (err) { alert("Erro ao excluir."); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-secondary-400 animate-pulse text-2xl uppercase">Carregando Atelier...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <header className="bg-white px-8 py-6 rounded-[2.5rem] border border-secondary-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Package size={28}/></div>
            <h1 className="text-3xl font-black text-secondary-900 italic uppercase tracking-tighter">Estoque</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-secondary-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
            {showForm ? "FECHAR" : "NOVA ENTRADA / PRODUÇÃO"}
          </button>
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-secondary-50">
          <Filter size={16} className="text-secondary-400 mr-2" />
          {[{ id: 'TODOS', label: 'Tudo' }, { id: 'INSUMO', label: 'Insumos' }, { id: 'PEÇA_PRONTA', label: 'Vestidos' }].map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${filterType === f.id ? 'bg-indigo-600 text-white' : 'bg-secondary-50 text-secondary-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-secondary-200 shadow-sm">
            <div className="flex bg-secondary-100 p-1.5 rounded-2xl w-fit mb-8">
              <button onClick={() => setActiveTab('CONFECCAO')} className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all ${activeTab === 'CONFECCAO' ? 'bg-white text-indigo-600 shadow-md' : 'text-secondary-400'}`}>CONFECÇÃO</button>
              <button onClick={() => setActiveTab('COMPRA')} className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all ${activeTab === 'COMPRA' ? 'bg-white text-indigo-600 shadow-md' : 'text-secondary-400'}`}>ENTRADA DE NOTA</button>
            </div>

            {activeTab === 'CONFECCAO' ? (
              <div className="space-y-6">
                <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-100">
                  <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Identificação da Peça</p>
                  <input className="bg-transparent border-0 font-black text-xl w-full focus:ring-0 uppercase text-secondary-900" placeholder="NOME DO VESTIDO" value={productionItem.name} onChange={e => setProductionItem({...productionItem, name: e.target.value})}/>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setProductionItem({...productionItem, can_rent: !productionItem.can_rent})} className={`flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-3 font-black text-[10px] uppercase transition-all ${productionItem.can_rent ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-secondary-100 text-secondary-300 opacity-50'}`}><Calendar size={18}/> Aluguel</button>
                  <button onClick={() => setProductionItem({...productionItem, can_sell: !productionItem.can_sell})} className={`flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-3 font-black text-[10px] uppercase transition-all ${productionItem.can_sell ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-secondary-100 text-secondary-300 opacity-50'}`}><ShoppingCart size={18}/> Venda</button>
                </div>
                {!showMaterialList ? (
                  <button onClick={() => setShowMaterialList(true)} className="w-full py-10 border-2 border-dashed border-secondary-200 rounded-[2rem] flex items-center justify-center gap-3 text-secondary-400 font-black uppercase text-xs">
                    <Plus size={20}/> SELECIONAR INSUMOS
                  </button>
                ) : (
                  <div className="bg-secondary-900 rounded-[2rem] p-6 space-y-4 animate-in zoom-in-95">
                    <div className="flex justify-between items-center text-white font-black text-[10px] uppercase"><span>Estoque Disponível</span><button onClick={() => setShowMaterialList(false)}><X size={20}/></button></div>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {products.filter(p => (p.category?.toUpperCase().includes('INSUMO') || !p.category) && Number(p.stock) > 0).map(p => (
                        <button key={p.id || p._id} onClick={() => { if(!composition.find(c => (c.id || c._id) === (p.id || p._id))) setComposition([...composition, {...p, usedQty: 1}]); setShowMaterialList(false); }} className="flex justify-between items-center bg-white/10 hover:bg-indigo-600 p-4 rounded-xl text-white transition-colors text-left">
                          <span className="font-bold text-xs uppercase">{p.name}</span>
                          <span className="text-[10px] opacity-50 font-black">SALDO: {p.stock}</span>
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
                        <input type="number" className="w-16 bg-secondary-100 border-0 p-2 font-black text-center rounded-xl" value={item.usedQty} onChange={e => {
                          const newC = [...composition]; newC[idx].usedQty = e.target.value; setComposition(newC);
                        }}/>
                        <button onClick={() => setComposition(composition.filter(c => (c.id || c._id) !== (item.id || item._id)))} className="text-rose-300 hover:text-rose-500"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                    <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Fornecedor</p>
                    <select className="w-full bg-transparent font-bold border-0 p-0 focus:ring-0 text-secondary-900" value={currentItem.supplierId} onChange={e => setCurrentItem({...currentItem, supplierId: e.target.value})}>
                      <option value="">SELECIONE...</option>
                      {suppliers.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                    <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Nota Fiscal (Opcional)</p>
                    <input className="w-full bg-transparent font-bold border-0 p-0 focus:ring-0 text-secondary-900 placeholder:text-secondary-200" placeholder="NF #000" value={purchaseMeta.invoiceNumber} onChange={e => setPurchaseMeta({...purchaseMeta, invoiceNumber: e.target.value})}/>
                  </div>
                </div>
                <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100">
                  <p className="text-[9px] font-black text-secondary-400 uppercase mb-1">Material</p>
                  <input className="bg-transparent border-0 font-black text-lg w-full focus:ring-0 uppercase" placeholder="NOME DO MATERIAL" value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})}/>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <input type="number" className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100 font-black text-sm" placeholder="R$ Unit" value={currentItem.unitPrice} onChange={e => setCurrentItem({...currentItem, unitPrice: e.target.value})}/>
                  <input type="number" className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100 font-black text-sm" placeholder="Quant" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})}/>
                  <select className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100 font-black text-[10px] uppercase" value={currentItem.unitType} onChange={e => setCurrentItem({...currentItem, unitType: e.target.value})}>
                    <option value="METRO">MTS</option>
                    <option value="UNIDADE">UN</option>
                  </select>
                </div>
                <button onClick={() => {
                  if(!currentItem.name || !currentItem.quantity || !currentItem.supplierId) return alert("Dados incompletos.");
                  setCart([...cart, { ...currentItem, tempId: Date.now() }]);
                  setCurrentItem({...currentItem, name: '', unitPrice: '', quantity: ''});
                }} className="w-full bg-secondary-900 text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-indigo-600 transition-all shadow-md">+ ADICIONAR ITEM</button>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {cart.map(i => (
                    <div key={i.tempId} className="flex justify-between items-center p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                      <div className="flex flex-col">
                        <span className="font-black text-[10px] uppercase text-secondary-900">{i.name}</span>
                        <span className="text-[8px] font-bold text-secondary-400 uppercase">{i.quantity} {i.unitType === 'METRO' ? 'm' : 'un'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-indigo-600 italic">R$ {(parseFloat(i.quantity || 0) * parseFloat(i.unitPrice || 0)).toFixed(2)}</span>
                        <button onClick={() => setCart(cart.filter(c => c.tempId !== i.tempId))} className="text-secondary-300 hover:text-rose-500"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="bg-secondary-900 p-8 rounded-[3.5rem] text-white flex flex-col shadow-2xl relative overflow-hidden min-h-[550px]">
            <div className="space-y-6 flex-1">
              <div>
                <p className="text-[10px] font-black uppercase text-secondary-400 tracking-widest mb-1">Total Calculado</p>
                <h2 className="text-5xl font-black text-indigo-400 tracking-tighter italic">
                  <span className="text-lg mr-1 font-normal text-white">R$</span>
                  {(activeTab === 'CONFECCAO' ? financialSummary.suggestedPrice : financialSummary.cartTotal).toFixed(2)}
                </h2>
              </div>

              {activeTab === 'COMPRA' && (
                <div className="space-y-6">
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
                    <p className="text-[9px] font-black uppercase mb-4 text-indigo-300 flex items-center gap-2"><Calendar size={14}/> Condição</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {['avista', '30d', '30/60', '30/60/90'].map(cond => (
                        <button key={cond} onClick={() => setPurchaseMeta({...purchaseMeta, condition: cond})} className={`p-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${purchaseMeta.condition === cond ? 'border-indigo-400 bg-indigo-400 text-secondary-900' : 'border-white/10 text-white'}`}>
                          {cond === 'avista' ? 'À VISTA' : cond}
                        </button>
                      ))}
                    </div>
                    <input type="date" className="w-full bg-secondary-800 text-white p-3 rounded-xl font-bold border-0 text-xs" value={purchaseMeta.baseDate} onChange={e => setPurchaseMeta({...purchaseMeta, baseDate: e.target.value})}/>
                  </div>
                  
                  {/* AJUSTE DE CONTRASTE NAS DATAS ABAIXO */}
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {installments.map((inst, idx) => (
                      <div key={idx} className="bg-secondary-800 p-4 rounded-2xl border border-white/10 flex items-center justify-between group shadow-inner">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-indigo-300 uppercase mb-1 tracking-widest">Vencimento P{idx+1}</span>
                          <input 
                            type="date" 
                            className="bg-secondary-700 border border-white/5 p-1.5 rounded-lg text-[11px] font-black text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" 
                            value={inst.dueDate} 
                            onChange={e => {
                              const newInst = [...installments];
                              newInst[idx].dueDate = e.target.value;
                              setInstallments(newInst);
                            }}
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-black text-secondary-400 uppercase mb-1">Valor</span>
                          <p className="text-xs font-black text-white">R$ {inst.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'CONFECCAO' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-4 rounded-2xl"><p className="text-[8px] uppercase mb-1">Mão de Obra</p><input type="number" className="bg-transparent border-0 font-black text-indigo-400 w-full p-0 outline-none" value={productionItem.labor} onChange={e => setProductionItem({...productionItem, labor: e.target.value})}/></div>
                  <div className="bg-white/5 p-4 rounded-2xl"><p className="text-[8px] uppercase mb-1">Markup %</p><input type="number" className="bg-transparent border-0 font-black text-indigo-400 w-full p-0 outline-none" value={productionItem.markup} onChange={e => setProductionItem({...productionItem, markup: e.target.value})}/></div>
                </div>
              )}
            </div>
            <button onClick={activeTab === 'CONFECCAO' ? handleFinalizeProduction : handleFinalizePurchase} className="w-full bg-indigo-600 text-white py-6 mt-8 rounded-3xl font-black uppercase hover:bg-emerald-500 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95">
              <CheckCircle2 size={24}/> {activeTab === 'CONFECCAO' ? "FINALIZAR PEÇA" : "SALVAR COMPRA"}
            </button>
          </aside>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
        {filteredProducts.map(p => {
          const isMetric = p.unitType === 'METRO' || (p.unit && p.unit.toUpperCase().includes('METRO'));
          return (
            <div key={p.id || p._id} className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm relative group hover:shadow-xl transition-all">
              <button onClick={() => handleDelete(p)} className="absolute top-6 right-6 p-2 text-secondary-200 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
              <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase italic mb-4 inline-block ${p.category === 'PEÇA_PRONTA' ? 'bg-indigo-50 text-indigo-600' : 'bg-secondary-50 text-secondary-400'}`}>
                {p.category === 'PEÇA_PRONTA' ? 'VESTIDO' : 'INSUMO'}
              </span>
              <h3 className="font-black text-secondary-800 uppercase text-xs mb-8 h-8 overflow-hidden">{p.name}</h3>
              <div className="flex justify-between items-end border-t border-secondary-50 pt-6">
                <div><p className="text-[10px] text-secondary-300 font-bold mb-1 uppercase">Saldo</p><p className="text-4xl font-black text-secondary-900 tracking-tighter">{p.stock}<span className="text-sm ml-1 text-secondary-400 lowercase">{isMetric ? 'm' : 'un'}</span></p></div>
                <div className="text-right"><p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase">Preço</p><p className="font-black text-secondary-800 italic text-sm">R$ {Number(p.price || 0).toFixed(2)}</p></div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}