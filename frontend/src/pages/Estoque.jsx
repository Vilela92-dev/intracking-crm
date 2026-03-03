import { useEffect, useState, useCallback } from 'react'
import { Plus, Package, Trash2, Edit3, X, DollarSign, CheckCircle2 } from 'lucide-react'
import api from '../services/api'

export function Estoque() {
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'METRO', 
    price: 0,
    stock: 0,
    supplierId: '',
    supplierName: '',
    bills: []
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [prodRes, suppRes] = await Promise.all([
        api.get('/products'),
        api.get('/suppliers')
      ])
      // Tratamento para garantir que pegamos a lista independente da estrutura da resposta
      setProducts(prodRes.data.data || prodRes.data || [])
      setSuppliers(suppRes.data.data || suppRes.data || [])
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const generateBills = (installments) => {
    if (!installments) {
      setFormData(prev => ({ ...prev, bills: [] }))
      return
    }
    const totalValue = formData.price * formData.stock
    const valuePerBill = (totalValue / installments).toFixed(2)
    const newBills = []
    
    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + i)
      newBills.push({
        installment: i,
        value: valuePerBill,
        dueDate: dueDate.toISOString().split('T')[0]
      })
    }
    setFormData(prev => ({ ...prev, bills: newBills }))
  }

  // --- FUNÇÕES DE AÇÃO (CORREÇÃO DEFINITIVA DO DELETE) ---

  const handleDelete = async (id) => {
    if (!id) return;

    if (window.confirm("Deseja realmente excluir este item?")) {
      try {
        // O log indica que o servidor espera /products/ID. 
        // Vamos tentar exatamente o ID que vem do banco (seja com prod- ou não)
        await api.delete(`/products/${id}`);
        alert("Excluído com sucesso!");
        fetchData();
      } catch (err) {
        console.warn("Falha na rota plural, tentando singular...");
        try {
          // Backup: rota singular
          await api.delete(`/product/${id}`);
          alert("Excluído com sucesso!");
          fetchData();
        } catch (err2) {
          // Se ambos falharem, o problema é no Backend.
          console.error("Erro Crítico: Backend não possui a rota de exclusão implementada.");
          alert("Erro: O servidor não permite a exclusão deste item. Verifique se o item está vinculado a uma venda ou se a rota DELETE existe no backend.");
        }
      }
    }
  }

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category: product.category || 'METRO',
      price: product.price || 0,
      stock: product.stock || 0,
      supplierId: product.supplierId || '',
      supplierName: product.supplierName || '',
      bills: [] 
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', category: 'METRO', price: 0, stock: 0, supplierId: '', supplierName: '', bills: [] });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Preparação dos dados para evitar erro 500
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      stock: parseFloat(formData.stock),
      supplierId: formData.supplierId ? parseInt(formData.supplierId) : null
    };

    try {
      if (editingId) {
        // Tenta PUT na rota plural, depois singular
        try {
          await api.put(`/products/${editingId}`, payload);
        } catch {
          await api.put(`/product/${editingId}`, payload);
        }
        alert("Atualizado com sucesso!");
      } else {
        await api.post('/products', payload);
        alert("Entrada de estoque registrada!");
      }
      handleCloseForm();
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar: O servidor recusou os dados.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-2">
            <Package className="text-primary-600" /> Gestão de Estoque
          </h1>
          <p className="text-secondary-600">Tecidos, Aviamentos e Peças Prontas</p>
        </div>
        <button 
          onClick={() => showForm ? handleCloseForm() : setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2"
        >
          {showForm ? <X size={18}/> : <><Plus size={18}/> Nova Entrada / Compra</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-secondary-200 p-6 rounded-xl shadow-lg animate-in fade-in zoom-in duration-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase">Nome do Item</label>
                <input 
                  required value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Cetim Bucol ou Zíper Invisível 60cm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase">Tipo de Medida</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full p-2.5 border rounded-lg bg-white"
                >
                  <option value="METRO">Tecido / Renda (Metragem)</option>
                  <option value="UNIDADE">Aviamento / Peça (Unidade)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase">Preço</label>
                <input 
                  type="number" step="0.01" value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase">Quantidade</label>
                <input 
                  type="number" step="0.1" value={formData.stock}
                  onChange={e => setFormData({...formData, stock: e.target.value})}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase">Fornecedor</label>
                <select 
                  value={formData.supplierId}
                  onChange={e => {
                    const s = suppliers.find(x => x.id == e.target.value);
                    setFormData({...formData, supplierId: e.target.value, supplierName: s?.name || ''});
                  }}
                  className="w-full p-2.5 border rounded-lg bg-white"
                >
                  <option value="">Nenhum / Produção Própria</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {formData.supplierId && (formData.price * formData.stock) > 0 && (
              <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sky-800 font-bold text-sm uppercase flex items-center gap-2">
                    <DollarSign size={16}/> Lançar Financeiro (Total: R$ {(formData.price * formData.stock).toFixed(2)})
                  </h3>
                  <select 
                    className="text-xs p-1 border rounded bg-white"
                    onChange={(e) => generateBills(Number(e.target.value))}
                  >
                    <option value="">Parcelar em...</option>
                    <option value="1">À Vista</option>
                    {[2,3,4,6,12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
                
                {formData.bills.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {formData.bills.map((bill, index) => (
                      <div key={index} className="bg-white p-2 rounded border border-sky-200 text-[10px]">
                        <p className="font-bold text-sky-600">{bill.installment}ª Parc.</p>
                        <p className="font-black text-secondary-900">R$ {bill.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button className="w-full bg-secondary-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
              <CheckCircle2 size={18}/> {editingId ? 'Salvar Alterações' : 'Confirmar Entrada'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white border border-secondary-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${product.category === 'METRO' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {product.category}
              </span>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEdit(product)} className="text-secondary-400 hover:text-blue-600 transition-colors">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(product.id)} className="text-secondary-400 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-secondary-900 truncate">{product.name}</h3>
            
            <div className="mt-4">
                <p className="text-[10px] text-secondary-500 uppercase font-bold">Saldo Disponível</p>
                <p className="text-2xl font-black text-secondary-900">
                 {product.stock} <span className="text-sm font-normal text-secondary-400">{product.category === 'METRO' ? 'm' : 'un'}</span>
                </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}