import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// ==========================================
// BANCO DE DADOS EM MEMÓRIA
// ==========================================
const db: any = {
  products: [],
  customers: [],
  suppliers: [],
  quotes: [],
  sales: [],
  rentals: [],
  appointments: [],
  finance: []
};

// ==========================================
// HELPERS DE LÓGICA DE NEGÓCIO
// ==========================================

/**
 * Atualiza o status do cliente seguindo a jornada da noiva.
 * Garante que o status só avance (Prospecção -> Orçamento -> Contrato -> Concluído).
 */
const updateCustomerStatus = (customerId: string, newStatus: string) => {
  if (!customerId) return;
  const customer = db.customers.find((c: any) => c.id === customerId);
  if (customer) {
    const niveis: any = { 'PROSPECÇÃO': 1, 'ORÇAMENTO': 2, 'CONTRATO FECHADO': 3, 'CONCLUÍDO': 4 };
    if (niveis[newStatus] > (niveis[customer.status] || 0)) {
      customer.status = newStatus;
      console.log(`[CRM] Cliente ${customer.name} atualizado para: ${newStatus}`);
    }
  }
};

/**
 * Gerencia a movimentação física e lógica do estoque.
 * 'reserve': Tira do disponível e coloca em espera.
 * 'unreserve': Devolve do espera para o disponível (cancelamento).
 * 'decrease': Saída definitiva para produção/venda.
 */
const updateStock = (productId: string, qty: number, type: 'increase' | 'decrease' | 'reserve' | 'release' | 'unreserve') => {
  const p = db.products.find((prod: any) => prod.id === productId || prod._id === productId);
  if (!p) return;
  const amount = Number(qty);
  switch (type) {
    case 'increase': p.stock += amount; break;
    case 'decrease': p.stock -= amount; break;
    case 'reserve': 
      p.stock -= amount;
      p.reserved = (p.reserved || 0) + amount;
      break;
    case 'release': p.reserved = (p.reserved || 0) - amount; break;
    case 'unreserve': 
      p.reserved = (p.reserved || 0) - amount;
      p.stock += amount;
      break;
  }
};

/**
 * Helper para criação/atualização de itens vindos da produção.
 * Normaliza unidades de medida (Metros, Unidades) e gerencia categorias.
 */
const updateOrAddProduct = (item: any) => {
  let product = db.products.find((p: any) => 
    (item.id && p.id === item.id) || 
    (item.productId && p.id === item.productId) || 
    (p.name.toUpperCase() === item.name.toUpperCase() && p.category === item.category)
  );

  const quantity = Number(item.quantity || item.usedQty || 0);
  const price = Number(item.unitPrice || item.price || 0);

  let unitLabel = 'UNIDADE';
  const rawUnit = (item.unitType || item.unit || '').toUpperCase();
  if (rawUnit.includes('METRO') || rawUnit === 'M') unitLabel = 'METROS';

  if (product) {
    product.stock += quantity;
    if (price > 0) product.price = price;
    if (item.can_rent !== undefined) product.can_rent = item.can_rent;
    if (item.can_sell !== undefined) product.can_sell = item.can_sell;
    return product;
  } else {
    const newProduct = {
      id: uuidv4(),
      name: item.name.toUpperCase(),
      unit: unitLabel,
      category: item.category || 'INSUMO',
      stock: quantity,
      reserved: 0,
      price: price,
      can_rent: item.can_rent || false,
      can_sell: item.can_sell || false,
      status: item.status || 'DISPONIVEL',
      createdAt: new Date()
    };
    db.products.push(newProduct);
    return newProduct;
  }
};

const router = express.Router();

// ==========================================
// 1. ROTAS DE IMPRESSÃO (CORREÇÃO ERRO 404)
// ==========================================

/**
 * Rota específica para gerar o espelho do orçamento para impressão.
 * Deve ser declarada antes das rotas genéricas para não ser confundida com ID.
 */
router.get('/quotes/:id/print', (req, res) => {
  const quote = db.quotes.find((q: any) => q.id === req.params.id);
  if (!quote) return res.status(404).send("<h1>Orçamento não encontrado</h1>");

  res.send(`
    <html>
      <body style="font-family: Arial, sans-serif; padding: 30px;">
        <h1 style="border-bottom: 2px solid #333;">Orçamento #${quote.id.substring(0,8)}</h1>
        <p><strong>Cliente:</strong> ${quote.customerName}</p>
        <p><strong>Total:</strong> R$ ${quote.totalValue}</p>
        <h3>Itens:</h3>
        <ul>${quote.items?.map((i: any) => `<li>${i.name} - Qtd: ${i.quantity}</li>`).join('')}</ul>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
});

// ==========================================
// 2. ESTOQUE E PRODUÇÃO
// ==========================================

router.get('/products', (req, res) => res.json({ data: db.products || [] }));

/**
 * Busca produtos disponíveis para locação (Peças prontas ou marcados como alugáveis).
 */
router.get('/products/rentables', (req, res) => {
  const rentables = db.products.filter((p: any) => 
    (p.can_rent === true || p.category === 'PEÇA_PRONTA') && p.stock > 0
  );
  res.json({ data: rentables });
});

/**
 * Processa a produção de novos vestidos/itens.
 * Consome insumos (decrease) e cria/atualiza o produto final.
 */
router.post('/products/produce', (req, res) => {
  const { items, composition, bills } = req.body;
  if (composition) {
    composition.forEach((c: any) => {
      const prodId = c.productId || c.id;
      if (prodId) updateStock(prodId, c.quantityUsed, 'decrease');
    });
  }
  if (items) items.forEach((i: any) => updateOrAddProduct(i));
  if (bills) {
    bills.forEach((bill: any, idx: number) => {
      db.finance.push({
        id: uuidv4(), type: 'despesa', value: Number(bill.value || 0),
        status: 'PENDENTE', description: `Parcela ${idx + 1}/${bills.length} - Produção`,
        dueDate: bill.dueDate || new Date(), createdAt: new Date()
      });
    });
  }
  res.status(201).json({ message: "Operação realizada com sucesso" });
});

router.delete('/products/:id', (req, res) => {
  const initialLength = db.products.length;
  db.products = db.products.filter((p: any) => p.id !== req.params.id && p._id !== req.params.id);
  res.status(db.products.length < initialLength ? 204 : 404).send();
});

// ==========================================
// 3. ORÇAMENTOS, VENDAS E ALUGUÉIS
// ==========================================

router.get('/quotes', (req, res) => res.json({ data: db.quotes || [] }));

router.post('/quotes', (req, res) => {
  const q = { ...req.body, id: uuidv4(), status: 'PENDENTE', createdAt: new Date() };
  db.quotes.push(q);
  updateCustomerStatus(q.customerId, 'ORÇAMENTO');
  res.status(201).json(q);
});

/**
 * Reserva o estoque quando o orçamento é aprovado pela cliente.
 */
router.patch('/quotes/:id/approve', (req, res) => {
  const quote = db.quotes.find((q: any) => q.id === req.params.id);
  if (!quote) return res.status(404).json({ message: "Não encontrado" });
  if (quote.items) quote.items.forEach((item: any) => updateStock(item.productId, item.quantity, 'reserve'));
  quote.status = 'APROVADO';
  res.json(quote);
});

/**
 * Gerencia Aluguéis: Faz reserva de estoque, gera contas a receber (parcelamento)
 * e cria agendamentos automáticos de prova, retirada e devolução.
 */
router.post('/rentals', (req, res) => {
  const { customerId, customerName, items, totalValue, valorEntrada, numParcelas, dataProva, dataRetirada, dataDevolucao } = req.body;
  const rental = { ...req.body, id: uuidv4(), status: 'RESERVADO', createdAt: new Date() };
  db.rentals.push(rental);

  updateCustomerStatus(customerId, 'CONTRATO FECHADO');
  if (items) items.forEach((i: any) => updateStock(i.productId, i.quantity, 'reserve'));

  // Financeiro: Entrada
  if (Number(valorEntrada) > 0) {
    db.finance.push({
      id: uuidv4(), type: 'receita', value: Number(valorEntrada), status: 'PAGO',
      customerName, description: `Entrada Aluguel - ${customerName}`, dueDate: new Date(), createdAt: new Date()
    });
  }

  // Financeiro: Parcelamento do saldo
  const saldo = Number(totalValue) - Number(valorEntrada);
  const qtdParcelas = Number(numParcelas) || 1;
  if (saldo > 0) {
    const valorParc = saldo / qtdParcelas;
    for (let i = 1; i <= qtdParcelas; i++) {
      const d = new Date(); d.setMonth(d.getMonth() + i);
      db.finance.push({
        id: uuidv4(), type: 'receita', value: valorParc, status: 'PENDENTE',
        customerName, description: `Parc ${i}/${qtdParcelas} Aluguel - ${customerName}`, dueDate: d, createdAt: new Date()
      });
    }
  }

  // Agenda Automática de Aluguel
  if (dataProva) db.appointments.push({ id: uuidv4(), title: `PROVA: ${customerName}`, date: dataProva, time: "09:00", type: "PROVA", customerId });
  if (dataRetirada) db.appointments.push({ id: uuidv4(), title: `RETIRADA: ${customerName}`, date: dataRetirada, time: "10:00", type: "RETIRADA", customerId });
  if (dataDevolucao) db.appointments.push({ id: uuidv4(), title: `DEVOLUÇÃO: ${customerName}`, date: dataDevolucao, time: "16:00", type: "DEVOLUCAO", customerId });

  res.status(201).json(rental);
});

// ==========================================
// 4. CRM E HISTÓRICO DE MEDIDAS (PONTO 2)
// ==========================================

router.get('/crm/customers', (req, res) => res.json({ data: db.customers || [] }));

router.post('/crm/customers', (req, res) => {
  const customer = { 
    ...req.body, 
    id: uuidv4(), 
    status: req.body.status || 'PROSPECÇÃO',
    measurementsHistory: req.body.measurementsHistory || [],
    createdAt: new Date() 
  };
  db.customers.push(customer);
  // Agendamento automático do evento (Casamento)
  if (customer.eventDate) {
    db.appointments.push({
      id: uuidv4(), title: `CASAMENTO: ${customer.name.toUpperCase()}`,
      date: customer.eventDate, time: "12:00", type: "EVENTO", customerId: customer.id
    });
  }
  res.status(201).json(customer);
});

/**
 * Atualiza o cliente e permite salvar snapshots das medidas.
 * Se 'saveSnapshot' for true, clona o objeto 'measurements' completo para a timeline.
 */
router.put('/crm/customers/:id', (req, res) => {
  const index = db.customers.findIndex((c: any) => c.id === req.params.id);
  if (index !== -1) {
    const currentCustomer = db.customers[index];
    if (req.body.saveSnapshot && req.body.measurements) {
      const history = currentCustomer.measurementsHistory || [];
      history.push({ date: new Date(), data: { ...req.body.measurements } });
      req.body.measurementsHistory = history;
    }
    db.customers[index] = { ...currentCustomer, ...req.body, id: req.params.id };
    return res.json(db.customers[index]);
  }
  res.status(404).json({ message: "Cliente não encontrado" });
});

// ==========================================
// 5. FINANCEIRO, AGENDA E FORNECEDORES
// ==========================================

router.get('/finance/bills', (req, res) => res.json({ data: db.finance || [] }));

/**
 * Rota de Agendamentos.
 * Aceita o campo 'time' vindo do seletor de horas do frontend (PONTO 1).
 */
router.post('/appointments', (req, res) => {
  const a = { ...req.body, id: uuidv4(), time: req.body.time || "00:00" };
  db.appointments.push(a);
  res.status(201).json(a);
});

router.get('/suppliers', (req, res) => res.json({ data: db.suppliers || [] }));
router.post('/suppliers', (req, res) => {
  const s = { ...req.body, id: uuidv4(), createdAt: new Date() };
  db.suppliers.push(s);
  res.status(201).json(s);
});

app.use('/api/v1', router);
app.listen(PORT, () => console.log(`🚀 SISTEMA ATELIER INTEGRADO NA PORTA ${PORT}`));