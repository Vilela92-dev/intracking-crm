import React, { useState, useEffect } from 'react';
import { Calendar, Package, DollarSign, CheckCircle, AlertCircle, ArrowRight, User, Heart, Trash2 } from 'lucide-react';

const Aluguel = () => {
  const [rentals, setRentals] = useState([]);
  const [availableDresses, setAvailableDresses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado do formulário
  const [formData, setFormData] = useState({
    productId: '',
    customerId: '', 
    customerName: '',
    totalValue: '',
    valorEntrada: '',
    numParcelas: 1,
    dataProva: '', 
    dataRetirada: '',
    dataDevolucao: '',
    dataCasamento: '' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, rentRes, custRes] = await Promise.all([
        fetch('http://localhost:3000/api/v1/products'),
        fetch('http://localhost:3000/api/v1/rentals'),
        fetch('http://localhost:3000/api/v1/crm/customers')
      ]);
      const prods = await prodRes.json();
      const rents = await rentRes.json();
      const custs = await custRes.json();

      // Regra: Vestidos ou itens marcados para aluguel com estoque > 0
      const dresses = prods.data.filter(p => 
        (p.category === 'PEÇA_PRONTA' || p.can_rent === true) && p.stock > 0
      );

      setAvailableDresses(dresses);
      setRentals(rents.data);
      setCustomers(custs.data);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao carregar dados", err);
    }
  };

  /**
   * FUNÇÃO DE DELETAR
   * O Backend agora cuida do estorno de estoque se configurado, 
   * aqui focamos em limpar a reserva.
   */
  const handleDeleteRental = async (rentId) => {
    if (!window.confirm("Tem certeza que deseja cancelar esta reserva?")) return;

    try {
      const response = await fetch(`http://localhost:3000/api/v1/rentals/${rentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert("Reserva excluída com sucesso!");
        fetchData(); // Recarrega para atualizar estoque e lista
      } else {
        alert("Erro ao excluir reserva.");
      }
    } catch (err) {
      console.error("Erro na exclusão:", err);
    }
  };

  // Helpers para datas
  const formatParaInput = (data) => data ? new Date(data).toISOString().split('T')[0] : '';
  
  const ajustarData = (dataBase, dias) => {
    if (!dataBase) return '';
    const d = new Date(dataBase);
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  };

  const handleDressSelect = (id) => {
    const selected = availableDresses.find(d => d.id === id);
    if (selected) {
      setFormData(prev => ({ ...prev, productId: id, totalValue: selected.price }));
    }
  };

  const handleCustomerSelect = (name) => {
    const selected = customers.find(c => c.name.toUpperCase() === name.toUpperCase());
    if (selected) {
      const dataEvento = selected.eventDate; 
      setFormData(prev => ({
        ...prev,
        customerName: selected.name,
        customerId: selected.id,
        dataCasamento: dataEvento ? formatParaInput(dataEvento) : '',
        // Cálculo automático de logística: Retirada 2 dias antes, Devolução 2 dias depois
        dataRetirada: dataEvento ? ajustarData(dataEvento, -2) : prev.dataRetirada,
        dataDevolucao: dataEvento ? ajustarData(dataEvento, 2) : prev.dataDevolucao
      }));
    } else {
      setFormData(prev => ({ ...prev, customerName: name, customerId: '', dataCasamento: '' }));
    }
  };

  const handleCreateRental = async (e) => {
    e.preventDefault();
    
    // O Backend agora processa Items, Agenda e Financeiro em uma única transação
    const payload = {
      ...formData,
      items: [{ productId: formData.productId, quantity: 1 }]
    };

    try {
      const response = await fetch('http://localhost:3000/api/v1/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Reserva concluída! Agenda, Estoque e Financeiro atualizados.");
        // Reseta o formulário
        setFormData({ 
          productId: '', customerId: '', customerName: '', totalValue: '', 
          valorEntrada: '', numParcelas: 1, dataProva: '', dataRetirada: '', dataDevolucao: '', dataCasamento: ''
        });
        fetchData();
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.message}`);
      }
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-purple-600">Carregando Sistema de Aluguel...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
        <Calendar className="text-purple-600" /> Gestão de Aluguéis e Reservas
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULÁRIO */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-b pb-2 text-purple-700">
            <Package size={18} /> Detalhes da Reserva
          </h2>
          <form onSubmit={handleCreateRental} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Vestido</label>
              <select className="w-full p-2 border rounded-md mt-1" value={formData.productId} onChange={(e) => handleDressSelect(e.target.value)} required>
                <option value="">Selecione o vestido...</option>
                {availableDresses.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — (Disponível: {d.stock})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Noiva (CRM)</label>
              <input list="customers-list" className="w-full p-2 border rounded-md mt-1" placeholder="Nome da noiva..." value={formData.customerName} onChange={(e) => handleCustomerSelect(e.target.value)} required />
              <datalist id="customers-list">
                {customers.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
              {formData.dataCasamento && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-pink-50 border border-pink-100 rounded text-pink-700 text-xs font-bold">
                  <Heart size={14} fill="currentColor" /> Casamento: {new Date(formData.dataCasamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Data da Prova</label>
                <input type="date" className="w-full p-2 border rounded-md" value={formData.dataProva} onChange={(e) => setFormData({...formData, dataProva: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Retirada</label>
                  <input type="date" className="w-full p-2 border rounded-md" value={formData.dataRetirada} onChange={(e) => setFormData({...formData, dataRetirada: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Devolução</label>
                  <input type="date" className="w-full p-2 border rounded-md" value={formData.dataDevolucao} onChange={(e) => setFormData({...formData, dataDevolucao: e.target.value})} required />
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-bold text-purple-400 uppercase">Valor Total</label>
                  <input type="number" className="w-full p-2 border rounded-md" value={formData.totalValue} onChange={(e) => setFormData({...formData, totalValue: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-purple-400 uppercase">Entrada</label>
                  <input type="number" className="w-full p-2 border rounded-md" value={formData.valorEntrada} onChange={(e) => setFormData({...formData, valorEntrada: e.target.value})} required />
                </div>
              </div>
              <label className="text-[10px] font-bold text-purple-400 uppercase">Parcelamento do Saldo</label>
              <select className="w-full p-2 border rounded-md" value={formData.numParcelas} onChange={(e) => setFormData({...formData, numParcelas: e.target.value})}>
                {[1,2,3,4,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
              </select>
            </div>

            <button type="submit" className="w-full bg-purple-600 text-white py-4 rounded-xl font-black uppercase hover:bg-purple-700 shadow-lg transition-all active:scale-95">
              Finalizar Reserva
            </button>
          </form>
        </div>

        {/* LISTAGEM */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" /> Contratos e Reservas Ativas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rentals.length === 0 ? (
              <div className="col-span-2 p-10 text-center text-gray-400 border-2 border-dashed rounded-xl">
                Nenhuma reserva encontrada.
              </div>
            ) : (
              rentals.map(rent => (
                <div key={rent.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative group hover:border-purple-200 transition-all">
                  <button 
                    onClick={() => handleDeleteRental(rent.id)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                    title="Excluir reserva"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                      {rent.customerName?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-none">{rent.customerName}</h3>
                      <p className="text-[10px] text-gray-400 mt-1 font-bold">CONTRATO: {rent.id.substring(0,8).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package size={14} className="text-gray-400"/>
                      <span className="truncate">
                        {availableDresses.find(d => d.id === rent.productId)?.name || "Item da Reserva"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded">
                      <div className="text-center border-r border-gray-200">
                        <p className="text-[8px] uppercase font-bold text-gray-400">Retirada</p>
                        <p className="text-xs font-bold text-blue-600">{new Date(rent.dataRetirada).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] uppercase font-bold text-gray-400">Devolução</p>
                        <p className="text-xs font-bold text-red-500">{new Date(rent.dataDevolucao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="text-xs">
                      <p className="text-gray-400 uppercase text-[9px] font-bold">Valor do Contrato</p>
                      <p className="font-bold text-gray-800 text-lg">R$ {Number(rent.totalValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded uppercase">
                      Confirmado
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Aluguel;