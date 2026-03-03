import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- 1. MODELOS DE DADOS (POO) ---

abstract class Produto {
  id: string; name: string; price: number; stock: number; minStock: number; supplierId?: string;
  lastPurchaseId?: string; // Vínculo para estorno financeiro
  abstract category: 'PEÇA' | 'INSUMO' | 'PEÇA_PRONTA'; 
  abstract unit: 'UN' | 'METROS';
  
  constructor(data: any) {
    this.id = data.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.name = data.name.toUpperCase(); 
    this.price = Number(data.price || data.unitPrice) || 0;
    this.stock = Number(data.stock || data.quantity || 0); 
    this.minStock = Number(data.minStock || 0);
    this.supplierId = data.supplierId;
    this.lastPurchaseId = data.lastPurchaseId;
  }
  baixarEstoque(qty: number) { this.stock -= Number(qty); }
  estornarEstoque(qty: number) { this.stock += Number(qty); }
  adicionarEstoque(qty: number) { this.stock += Number(qty); }
}

class PecaAcabada extends Produto { category: 'PEÇA' = 'PEÇA'; unit: 'UN' = 'UN'; }
class Insumo extends Produto { category: 'INSUMO' = 'INSUMO'; unit: 'METROS' = 'METROS'; }
class PecaPronta extends Produto { category: 'PEÇA_PRONTA' = 'PEÇA_PRONTA'; unit: 'UN' = 'UN'; }

// --- 2. BANCO DE DADOS EM MEMÓRIA ---

const database = {
  products: [] as Produto[],
  sales: [] as any[],
  customers: [] as any[],
  suppliers: [] as any[],
  appointments: [] as any[], 
  bills: [] as any[], 
  logs: [] as any[]
};

// --- 3. FUNÇÃO DE AUDITORIA (LOGS) ---

const registrarLog = (acao: string, detalhes: string) => {
  database.logs.push({ id: Date.now(), data: new Date(), acao, detalhes });
  console.log(`[${acao}] ${detalhes}`);
};

// --- 4. FUNÇÃO AUXILIAR DE SINCRONIZAÇÃO AGENDA ---

const sincronizarAgendaNoiva = (customerId: string, name: string, weddingDate?: string, trials: any[] = []) => {
  database.appointments = database.appointments.filter(a => 
    !a.id.startsWith(`CELEB-${customerId}`) && !a.id.startsWith(`TRIAL-${customerId}`)
  );

  if (weddingDate) {
    database.appointments.push({
      id: `CELEB-${customerId}`,
      customerName: name,
      service: `💍 CASAMENTO: ${name}`,
      date: weddingDate,
      time: "00:00", 
      type: 'CASAMENTO',
      isSystemGenerated: true,
      createdAt: new Date()
    });
  }

  if (Array.isArray(trials)) {
    trials.forEach((trial, index) => {
      if (trial.date) {
        database.appointments.push({
          id: `TRIAL-${customerId}-${index}`,
          customerName: name,
          service: `${trial.description || 'Prova'}: ${name}`,
          date: trial.date,
          time: trial.time || "09:00",
          type: 'NOIVA',
          isSystemGenerated: true,
          createdAt: new Date()
        });
      }
    });
  }
};

// --- 5. ROTAS DE FORNECEDORES ---

app.get('/api/v1/suppliers', (req, res) => res.json({ success: true, data: database.suppliers }));

app.post('/api/v1/suppliers', (req, res) => {
  const novo = { id: Date.now().toString(), ...req.body, createdAt: new Date() };
  database.suppliers.push(novo);
  registrarLog("FORNECEDOR", `Cadastrado: ${novo.name}`);
  res.status(201).json({ success: true, data: novo });
});

// --- 6. ROTAS DE PRODUTOS E ESTOQUE (REVISADAS) ---

app.get('/api/v1/products', (req, res) => res.json({ success: true, data: database.products }));

// LANÇAMENTO DE COMPRA MULTITENS (CORRIGIDO: VINCULA FINANCEIRO)
app.post('/api/v1/products/purchase', (req, res) => {
  try {
    const { items, supplierId, description, bills } = req.body;
    const purchaseId = `PURCH-${Date.now()}`;
    const updatedProducts: Produto[] = [];

    items.forEach((itemData: any) => {
      const nomeNormalizado = itemData.name.toUpperCase();
      let produtoExistente = database.products.find(p => p.name === nomeNormalizado);

      if (produtoExistente) {
        produtoExistente.adicionarEstoque(itemData.quantity);
        produtoExistente.price = Number(itemData.unitPrice || itemData.price);
        produtoExistente.lastPurchaseId = purchaseId; // Vincula a última compra
        updatedProducts.push(produtoExistente);
      } else {
        let novo: Produto;
        const payload = { ...itemData, name: nomeNormalizado, lastPurchaseId: purchaseId };
        
        if (itemData.unitType === 'METRO' || itemData.category === 'INSUMO') novo = new Insumo(payload);
        else if (itemData.category === 'PEÇA_PRONTA') novo = new PecaPronta(payload);
        else novo = new PecaAcabada(payload);
        
        database.products.push(novo);
        updatedProducts.push(novo);
      }
    });

    // PARCELAMENTO NO FINANCEIRO (VINCULADO AO purchaseId)
    if (bills && Array.isArray(bills)) {
      bills.forEach((p, idx) => {
        database.bills.push({
          id: `bill-purc-${Date.now()}-${idx}`,
          originId: purchaseId, // CRUCIAL: Identifica de onde veio a dívida
          description: description || `Compra de Suprimentos: ${items[0].name}`,
          value: Number(p.value),
          category: 'SUPRIMENTOS',
          type: 'despesa', 
          status: 'PENDENTE', 
          dueDate: p.dueDate, 
          createdAt: new Date()
        });
      });
    }

    registrarLog("ESTOQUE", `Compra Processada: ${purchaseId}`);
    res.status(201).json({ success: true, data: updatedProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro na compra" });
  }
});

// ROTA DE PRODUÇÃO (CONFECÇÃO - CORRIGIDA BAIXA DE INSUMOS)
app.post('/api/v1/products/produce', (req, res) => {
  try {
    const { name, composition, price } = req.body;
    
    // CORREÇÃO: Busca por múltiplos campos de ID e garante baixa numérica
    composition.forEach((comp: any) => {
      const targetId = comp.productId || comp.id || comp._id;
      const p = database.products.find(prod => prod.id === targetId);
      if (p) {
        p.baixarEstoque(Number(comp.quantityUsed || comp.usedQty));
        registrarLog("ESTOQUE", `Baixa de produção: ${p.name} (-${comp.usedQty})`);
      }
    });

    const novaPeca = new PecaPronta({
      name: name.toUpperCase(),
      price: Number(price),
      stock: 1
    });

    database.products.push(novaPeca);
    registrarLog("PRODUÇÃO", `Peça concluída: ${name}`);
    res.status(201).json({ success: true, data: novaPeca });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// DELETE CORRIGIDO (LIMPA PRODUTO + FINANCEIRO PENDENTE)
app.delete('/api/v1/products/:id', (req, res) => {
  const { id } = req.params;
  const index = database.products.findIndex(p => p.id === id);
  
  if (index !== -1) {
    const produto = database.products[index];
    const purchaseId = produto.lastPurchaseId;

    // Se o produto veio de uma compra, limpa as contas PENDENTES dessa compra
    if (purchaseId) {
      const totalContas = database.bills.length;
      database.bills = database.bills.filter(bill => 
        !(bill.originId === purchaseId && bill.status === 'PENDENTE')
      );
      const removidas = totalContas - database.bills.length;
      if (removidas > 0) registrarLog("FINANCEIRO", `Removidas ${removidas} parcelas da compra ${purchaseId}`);
    }

    database.products.splice(index, 1);
    registrarLog("ESTOQUE", `Excluído: ${produto.name}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Produto não encontrado" });
  }
});

// --- (Restante das rotas: CRM, AGENDA, VENDAS permanecem iguais) ---

app.get('/api/v1/crm/customers', (req, res) => res.json({ success: true, data: database.customers }));

app.post('/api/v1/crm/customers', (req, res) => {
  try {
    const { name, weddingDate, trials } = req.body;
    const customerId = Date.now().toString();
    const novaNoiva = { id: customerId, ...req.body, createdAt: new Date() };
    database.customers.push(novaNoiva);
    sincronizarAgendaNoiva(customerId, name, weddingDate, trials);
    registrarLog("CRM", `Noiva cadastrada: ${name}`);
    res.status(201).json({ success: true, data: novaNoiva });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.put('/api/v1/crm/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, weddingDate, trials } = req.body;
    const index = database.customers.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ success: false });
    database.customers[index] = { ...database.customers[index], ...req.body, updatedAt: new Date() };
    sincronizarAgendaNoiva(id, name, weddingDate, trials);
    registrarLog("CRM", `Noiva atualizada: ${name}`);
    res.json({ success: true, data: database.customers[index] });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/v1/appointments', (req, res) => res.json({ success: true, data: database.appointments }));

app.post('/api/v1/appointments', (req, res) => {
  try {
    const { date, customerName } = req.body;
    const novoAgendamento = { id: Date.now().toString(), ...req.body, createdAt: new Date() };
    database.appointments.push(novoAgendamento);
    registrarLog("AGENDA", `Agendado: ${customerName}`);
    res.status(201).json({ success: true, data: novoAgendamento });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/v1/sales', (req, res) => res.json({ success: true, data: database.sales }));

app.post('/api/v1/sales', (req, res) => {
  try {
    const { items, customerName, totalValue, valorEntrada, costValue } = req.body;
    const saleId = `VEND-${Date.now()}`;
    
    items.forEach((item: any) => {
      const prod = database.products.find(p => p.id === item.productId);
      if (prod) prod.baixarEstoque(item.quantity);
    });

    const novaVenda = { 
      id: saleId, ...req.body, 
      lucroBruto: Number(totalValue) - (Number(costValue) || 0),
      createdAt: new Date() 
    };
    database.sales.push(novaVenda);

    if (Number(valorEntrada) > 0) {
      database.bills.push({
        id: `rev-ent-${Date.now()}`, originId: saleId,
        description: `Entrada: ${customerName}`, value: Number(valorEntrada),
        category: 'SERVIÇO', type: 'receita', status: 'PAGO', dueDate: new Date().toISOString().split('T')[0], createdAt: new Date()
      });
    }

    registrarLog("VENDA", `Venda para ${customerName} concluída.`);
    res.status(201).json({ success: true, data: novaVenda });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/v1/finance/bills', (req, res) => res.json({ success: true, data: database.bills }));

app.patch('/api/v1/finance/bills/:id/pay', (req, res) => {
  const { id } = req.params;
  const bill = database.bills.find(b => b.id === id);
  if (bill) {
    bill.status = 'PAGO';
    registrarLog("FINANCEIRO", `Pago: ${bill.description}`);
    res.json({ success: true, data: bill });
  } else res.status(404).json({ success: false });
});

app.get('/api/v1/logs', (req, res) => res.json({ success: true, data: database.logs }));

app.listen(port, () => {
  console.log(`🚀 Motor do Ateliê 3.0 ON em http://localhost:${port}`);
});