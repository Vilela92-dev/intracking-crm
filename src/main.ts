import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- 1. MODELOS DE DADOS (POO) ---

abstract class Produto {
  id: string; name: string; price: number; stock: number; minStock: number; supplierId?: string;
  abstract category: 'PEÇA' | 'INSUMO'; abstract unit: 'UN' | 'METROS';
  constructor(data: any) {
    this.id = data.id || Date.now().toString();
    this.name = data.name; this.price = Number(data.price);
    this.stock = Number(data.stock); this.minStock = Number(data.minStock || 0);
    this.supplierId = data.supplierId;
  }
  baixarEstoque(qty: number) { this.stock -= qty; }
  estornarEstoque(qty: number) { this.stock += qty; }
}

class PecaAcabada extends Produto { category: 'PEÇA' = 'PEÇA'; unit: 'UN' = 'UN'; constructor(data: any) { super(data); } }
class Insumo extends Produto { category: 'INSUMO' = 'INSUMO'; unit: 'METROS' = 'METROS'; constructor(data: any) { super(data); } }

// --- 2. BANCO DE DADOS EM MEMÓRIA ---

const database = {
  products: [] as Produto[],
  sales: [] as any[],
  customers: [] as any[],
  suppliers: [] as any[],
  billsToPay: [] as any[],
  logs: [] as any[] // Histórico de tudo que acontece
};

// --- 3. FUNÇÃO DE AUDITORIA (LOGS) ---

const registrarLog = (acao: string, detalhes: string) => {
  database.logs.push({ id: Date.now(), data: new Date(), acao, detalhes });
  console.log(`[${acao}] ${detalhes}`);
};

// --- 4. ROTAS DE FORNECEDORES ---

app.get('/api/v1/suppliers', (req, res) => res.status(200).send({ success: true, data: database.suppliers }));

app.post('/api/v1/suppliers', (req, res) => {
  const novo = { id: Date.now().toString(), ...req.body };
  database.suppliers.push(novo);
  registrarLog("FORNECEDOR", `Cadastrado: ${novo.name}`);
  res.status(201).send({ success: true, data: novo });
});

app.put('/api/v1/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const idx = database.suppliers.findIndex(s => s.id === id);
  if (idx !== -1) {
    database.suppliers[idx] = { ...database.suppliers[idx], ...req.body };
    registrarLog("EDIÇÃO", `Fornecedor ${database.suppliers[idx].name} atualizado.`);
    res.status(200).send({ success: true, data: database.suppliers[idx] });
  } else res.status(404).send({ success: false });
});

app.delete('/api/v1/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const idx = database.suppliers.findIndex(s => s.id === id);
  if (idx !== -1) {
    const nome = database.suppliers[idx].name;
    database.suppliers.splice(idx, 1);
    registrarLog("EXCLUSÃO", `Fornecedor ${nome} removido.`);
    res.status(200).send({ success: true });
  } else res.status(404).send({ success: false });
});

// --- 5. ROTAS DE PRODUTOS ---

app.get('/api/v1/products', (req, res) => res.status(200).send({ success: true, data: database.products }));

app.post('/api/v1/products', (req, res) => {
  const novoProduto = req.body.category === 'INSUMO' ? new Insumo(req.body) : new PecaAcabada(req.body);
  database.products.push(novoProduto);
  registrarLog("ESTOQUE", `Novo item: ${novoProduto.name}`);
  res.status(201).send({ success: true, data: novoProduto });
});

// --- 6. ROTAS DE CLIENTES (CRM) ---

app.get('/api/v1/crm/customers', (req, res) => res.status(200).send({ success: true, data: database.customers }));

app.post('/api/v1/crm/customers', (req, res) => {
  const novo = { id: Date.now().toString(), ...req.body, createdAt: new Date() };
  database.customers.push(novo);
  registrarLog("CRM", `Noiva cadastrada: ${novo.name}`);
  res.status(201).send({ success: true, data: novo });
});

app.put('/api/v1/crm/customers/:id', (req, res) => {
  const { id } = req.params;
  const idx = database.customers.findIndex(c => c.id === id);
  if (idx !== -1) {
    database.customers[idx] = { ...database.customers[idx], ...req.body };
    registrarLog("CRM_EDIT", `Agenda da noiva ${database.customers[idx].name} atualizada.`);
    res.status(200).send({ success: true, data: database.customers[idx] });
  } else res.status(404).send({ success: false });
});

// --- 7. ROTAS DE VENDAS ---

app.get('/api/v1/sales', (req, res) => res.status(200).send({ success: true, data: database.sales }));

app.post('/api/v1/sales', (req, res) => {
  const { items, customerName } = req.body;
  items.forEach((item: any) => {
    const prod = database.products.find(p => p.id === item.productId);
    if (prod) prod.baixarEstoque(item.quantity);
  });
  const novaVenda = { id: `VEND-${Date.now()}`, ...req.body, createdAt: new Date() };
  database.sales.push(novaVenda);
  registrarLog("VENDA", `Venda para ${customerName} realizada.`);
  res.status(201).send({ success: true, data: novaVenda });
});

app.delete('/api/v1/sales/:id', (req, res) => {
  const { id } = req.params;
  const idx = database.sales.findIndex(v => v.id === id);
  if (idx !== -1) {
    const venda = database.sales[idx];
    venda.items.forEach((item: any) => {
      const prod = database.products.find(p => p.id === item.productId);
      if (prod) prod.estornarEstoque(item.quantity);
    });
    database.sales.splice(idx, 1);
    registrarLog("CANCELAMENTO", `Venda ${id} cancelada. Estoque devolvido.`);
    res.status(200).send({ success: true });
  } else res.status(404).send({ success: false });
});

// --- 8. LOGS ---
app.get('/api/v1/logs', (req, res) => res.status(200).send({ success: true, data: database.logs }));

app.listen(port, () => console.log(`🚀 Motor do Ateliê 2.0 rodando em http://localhost:${port}`));