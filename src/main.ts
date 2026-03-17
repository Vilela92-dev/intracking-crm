import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURAÇÃO DE UPLOADS
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Formato inválido. Use PNG, JPG ou PDF.'));
  }
});

// BANCO DE DADOS EM MEMÓRIA
const db = {
  products: [],
  customers: [],
  suppliers: [],
  quotes: [],
  sales: [],
  rentals: [],
  appointments: [],
  finance: [],
  stockMovements: []
};

// HELPERS DE LÓGICA
const logStockMovement = (productId, qty, type, destination, refId) => {
  const product = db.products.find((p) => p.id === productId || p._id === productId);
  const entry = {
    id: uuidv4(),
    data: new Date(),
    item: product ? product.name : 'ITEM DESCONHECIDO',
    qtd: qty,
    tipo: type,
    origem_destino: destination.toUpperCase(),
    doc_referencia: String(refId).toUpperCase().substring(0, 10),
    createdAt: new Date()
  };
  db.stockMovements.push(entry);
};

const updateCustomerStatus = (customerId, newStatus) => {
  if (!customerId) return;
  const customer = db.customers.find((c) => c.id === customerId);
  if (customer) {
    const niveis = { 'PROSPECÇÃO': 1, 'ORÇAMENTO': 2, 'CONTRATO FECHADO': 3, 'CONCLUÍDO': 4 };
    if (niveis[newStatus] > (niveis[customer.status] || 0)) {
      customer.status = newStatus;
    }
  }
};

const updateStock = (productId, qty, type) => {
  const p = db.products.find((prod) => prod.id === productId || prod._id === productId);
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

const updateOrAddProduct = (item) => {
  let product = db.products.find((p) => 
    (item.id && p.id === item.id) || 
    (item.productId && p.id === item.productId) || 
    (p.name.toUpperCase() === item.name.toUpperCase() && p.category === item.category)
  );

  const quantity = Number(item.quantity || item.usedQty || 0);
  const price = Number(item.unitPrice || item.price || 0);
  let unitLabel = (item.unitType || item.unit || '').toUpperCase().includes('METRO') ? 'METROS' : 'UNIDADE';

  if (product) {
    product.stock += quantity;
    if (price > 0) product.price = price;
    logStockMovement(product.id, quantity, 'entrada', 'REPOSIÇÃO / COMPRA', 'EST-ADD');
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
    logStockMovement(newProduct.id, quantity, 'entrada', 'CADASTRO INICIAL', 'NEW-PROD');
    return newProduct;
  }
};

// ==========================================
// ROTEADOR PRINCIPAL
// ==========================================
const router = express.Router();

// RELATÓRIOS
router.get('/reports/stock-movements', (req, res) => res.json({ data: db.stockMovements || [] }));
router.get('/finance/bills', (req, res) => res.json({ data: db.finance || [] }));

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  res.status(201).json({ url: `http://localhost:${PORT}/uploads/${req.file.filename}`, filename: req.file.filename });
});

// CRM
router.get('/crm/customers', (req, res) => res.json({ data: db.customers || [] }));
router.post('/crm/customers', (req, res) => {
  const customer = { ...req.body, id: uuidv4(), measurementsHistory: [], createdAt: new Date(), status: req.body.status || 'PROSPECÇÃO' };
  db.customers.push(customer);
  res.status(201).json(customer);
});

router.put('/crm/customers/:id', (req, res) => {
  const index = db.customers.findIndex((c) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Não encontrado" });
  const current = db.customers[index];
  let updatedHistory = current.measurementsHistory || [];
  if (req.body.saveSnapshot && req.body.measurements) {
    updatedHistory.push({ date: new Date().toISOString(), data: { ...req.body.measurements } });
  }
  db.customers[index] = { ...current, ...req.body, id: req.params.id, measurementsHistory: updatedHistory };
  res.json(db.customers[index]);
});

router.delete('/crm/customers/:id', (req, res) => {
  db.customers = db.customers.filter((c) => c.id !== req.params.id);
  res.status(204).send();
});

// ORÇAMENTOS & IMPRESSÃO
router.get('/quotes/:id/print', (req, res) => {
  const quote = db.quotes.find((q) => q.id === req.params.id);
  if (!quote) return res.status(404).send("<h1>Orçamento não encontrado.</h1>");
  const customer = db.customers.find((c) => c.id === quote.customerId);
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <title>Proposta Atelier Pro - ${quote.customerName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet">
      <style>
        :root { --primary: #1a1a1a; --accent: #7a7a7a; --border: #eeeeee; }
        body { font-family: 'Montserrat', sans-serif; margin: 0; padding: 0; color: var(--primary); background: #f5f5f5; }
        .page { width: 210mm; min-height: 297mm; padding: 40px 60px; margin: 10mm auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.05); position: relative; box-sizing: border-box; }
        header { display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 30px; margin-bottom: 40px; }
        .brand h1 { font-family: 'Playfair Display', serif; font-size: 28px; margin: 0; letter-spacing: 3px; text-transform: uppercase; }
        .brand p { font-size: 9px; letter-spacing: 4px; color: var(--accent); margin: 5px 0 0 0; text-transform: uppercase; }
        .info { text-align: right; font-size: 11px; color: var(--accent); text-transform: uppercase; }
        .hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; margin-bottom: 40px; }
        .intro h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 400; color: var(--accent); margin-bottom: 5px; }
        .client-name { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 700; font-style: italic; margin: 0; }
        .event-detail { margin-top: 15px; font-size: 13px; border-left: 2px solid var(--primary); padding-left: 15px; }
        .sketch-box { border: 1px solid var(--border); border-radius: 2px; height: 280px; display: flex; align-items: center; justify-content: center; background: #fafafa; overflow: hidden; }
        .sketch-box img { max-height: 100%; width: auto; object-fit: contain; }
        .no-sketch { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.4; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        th { text-align: left; padding: 15px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid var(--primary); }
        td { padding: 18px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .total-section { margin-top: 40px; text-align: right; border-top: 2px solid var(--primary); padding-top: 20px; }
        .total-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--accent); }
        .total-price { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; }
        footer { position: absolute; bottom: 40px; left: 60px; right: 60px; text-align: center; font-size: 10px; color: var(--accent); border-top: 1px solid var(--border); padding-top: 20px; }
        @media print { body { background: white; } .page { margin: 0; box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="page">
        <header>
          <div class="brand"><h1>Atelier Pro</h1><p>Alta Costura e Gestão</p></div>
          <div class="info"><p>PROPOSTA #${quote.id.substring(0,6).toUpperCase()}</p><p>${new Date(quote.createdAt).toLocaleDateString('pt-BR')}</p></div>
        </header>
        <section class="hero">
          <div class="intro">
            <h2>Especialmente para</h2>
            <p class="client-name">${quote.customerName}</p>
            <div class="event-detail">
              <p><strong>DATA DO EVENTO:</strong> ${customer?.eventDate ? new Date(customer.eventDate).toLocaleDateString('pt-BR') : 'A DEFINIR'}</p>
              <p>Projeto exclusivo desenvolvido sob medida.</p>
            </div>
          </div>
          <div class="sketch-box">${customer?.sketchUrl ? `<img src="${customer.sketchUrl}">` : `<span class="no-sketch">Croqui em Definição</span>`}</div>
        </section>
        <table>
          <thead><tr><th>Descrição</th><th style="text-align: right;">Qtd</th></tr></thead>
          <tbody>
            ${quote.items?.map(i => `<tr><td><strong>${i.name.toUpperCase()}</strong></td><td style="text-align: right;">${i.quantity}</td></tr>`).join('')}
            <tr><td><strong>MÃO DE OBRA ESPECIALIZADA</strong></td><td style="text-align: right;">1</td></tr>
          </tbody>
        </table>
        <div class="total-section">
          <span class="total-label">Investimento Total</span>
          <div class="total-price">R$ ${Number(quote.totalValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        </div>
        <footer>Válida por 7 dias. @atelierpro</footer>
      </div>
      <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
    </body></html>
  `);
});

router.get('/quotes', (req, res) => res.json({ data: db.quotes || [] }));

router.post('/quotes', (req, res) => {
  const { customerId, items, laborCost, markup } = req.body;
  const materialCost = (items || []).reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  const total = (materialCost + Number(laborCost || 0)) * (1 + (Number(markup || 0) / 100));

  const q = { ...req.body, id: uuidv4(), totalValue: total, status: 'PENDENTE', createdAt: new Date() };
  db.quotes.push(q);
  updateCustomerStatus(customerId, 'ORÇAMENTO');
  res.status(201).json(q);
});

router.put('/quotes/:id', (req, res) => {
  const index = db.quotes.findIndex((q) => q.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Não encontrado" });
  const quote = db.quotes[index];
  const newStatus = req.body.status;
  if (newStatus === 'APROVADO' && quote.status !== 'APROVADO') {
    if (quote.items) quote.items.forEach(i => updateStock(i.productId || i.id, i.quantity, 'reserve'));
    updateCustomerStatus(quote.customerId, 'CONTRATO FECHADO');
  }
  if (newStatus === 'REPROVADO' && quote.status === 'APROVADO') {
    if (quote.items) quote.items.forEach(i => updateStock(i.productId || i.id, i.quantity, 'unreserve'));
  }
  db.quotes[index] = { ...quote, ...req.body, id: req.params.id };
  res.json(db.quotes[index]);
});

// VENDAS
router.get('/sales', (req, res) => res.json({ data: db.sales || [] }));
router.post('/sales', (req, res) => {
  const { customerId, customerName, items, totalValue, valorEntrada, quoteId, parcelasAgendadas } = req.body;
  const dbCustomer = db.customers.find(c => c.id === customerId);
  const dbQuote = db.quotes.find(q => q.id === quoteId);
  const saleId = uuidv4();
  const sale = { 
    ...req.body, 
    id: saleId, 
    customerName: customerName || dbCustomer?.name || dbQuote?.customerName || "Não Identificado",
    items: items || dbQuote?.items || [],
    totalValue: Number(totalValue || dbQuote?.totalValue || 0),
    status: 'CONCLUIDO', 
    createdAt: new Date() 
  };
  db.sales.push(sale);
  if (dbQuote) { dbQuote.isConverted = true; dbQuote.status = 'APROVADO'; }
  updateCustomerStatus(customerId, 'CONTRATO FECHADO');
  if (sale.items) {
    sale.items.forEach(i => {
      const pid = i.productId || i.id;
      if (quoteId) updateStock(pid, i.quantity, 'release');
      updateStock(pid, i.quantity, 'decrease');
      logStockMovement(pid, i.quantity, 'saida', `VENDA: ${sale.customerName}`, saleId);
    });
  }
  if (Number(valorEntrada) > 0) {
    db.finance.push({ id: uuidv4(), type: 'receita', value: Number(valorEntrada), status: 'PAGO', customerName: sale.customerName, description: `Entrada Venda - ${sale.customerName}`, dueDate: new Date(), createdAt: new Date(), customerId });
  }
  if (parcelasAgendadas) {
    parcelasAgendadas.forEach(p => db.finance.push({ id: uuidv4(), type: 'receita', value: Number(p.valor), status: 'PENDENTE', customerName: sale.customerName, description: `Parc ${p.numero} Venda - ${sale.customerName}`, dueDate: p.vencimento, createdAt: new Date(), customerId }));
  }
  res.status(201).json(sale);
});

// ESTOQUE E PRODUTOS
router.get('/products', (req, res) => res.json({ data: db.products || [] }));
router.get('/products/rentables', (req, res) => {
  const rentables = db.products.filter((p) => (p.can_rent || p.category === 'PEÇA_PRONTA') && p.stock > 0);
  res.json({ data: rentables });
});

router.post('/products/produce', (req, res) => {
  const { items, composition, bills, productName } = req.body;
  if (composition) {
    composition.forEach(c => {
      const id = c.productId || c.id;
      if (id) {
        updateStock(id, c.quantityUsed, 'decrease');
        logStockMovement(id, c.quantityUsed, 'saida', `PRODUÇÃO: ${productName || 'PEÇA'}`, 'OP-PROD');
      }
    });
  }
  if (items) items.forEach(i => updateOrAddProduct(i));
  if (bills) {
    bills.forEach((bill, idx) => {
      db.finance.push({ id: uuidv4(), type: 'despesa', value: Number(bill.value), status: 'PENDENTE', description: bill.description || `Parcela ${idx+1}`, dueDate: bill.dueDate, createdAt: new Date() });
    });
  }
  res.status(201).json({ message: "Ok" });
});

// ALUGUÉIS (LOGICA DE CHECK-IN INCORPORADA)
router.get('/rentals', (req, res) => res.json({ data: db.rentals || [] }));

router.post('/rentals', (req, res) => {
  const { customerId, customerName, items, totalValue, valorEntrada, parcelasAgendadas, dataRetirada, dataDevolucao } = req.body;
  const rentalId = uuidv4();
  const rental = { ...req.body, id: rentalId, status: 'ACTIVE', createdAt: new Date() };
  db.rentals.push(rental);
  updateCustomerStatus(customerId, 'CONTRATO FECHADO');
  if (items) items.forEach(i => { updateStock(i.productId, i.quantity, 'reserve'); logStockMovement(i.productId, i.quantity, 'saida', `ALUGUEL: ${customerName}`, rentalId); });
  if (Number(valorEntrada) > 0) {
    db.finance.push({ id: uuidv4(), rentalId, type: 'receita', value: Number(valorEntrada), status: 'PAGO', customerName, description: `Entrada Aluguel - ${customerName}`, dueDate: new Date(), createdAt: new Date(), customerId });
  }
  if (parcelasAgendadas) {
    parcelasAgendadas.forEach(p => db.finance.push({ id: uuidv4(), rentalId, type: 'receita', value: Number(p.valor), status: 'PENDENTE', customerName, description: `Parc ${p.numero} Aluguel - ${customerName}`, dueDate: p.vencimento, createdAt: new Date(), customerId }));
  }
  if (dataRetirada) db.appointments.push({ id: uuidv4(), rentalId, title: `RETIRADA: ${customerName}`, date: dataRetirada, time: "10:00", type: "RETIRADA", customerId });
  res.status(201).json(rental);
});

router.patch('/rentals/:id/return', (req, res) => {
  const { id } = req.params;
  const { statusEstoque } = req.body;
  const rental = db.rentals.find(r => r.id === id);
  if (!rental) return res.status(404).json({ message: "Aluguel não encontrado" });

  rental.status = 'RETURNED';
  if (rental.items) {
    rental.items.forEach(item => {
      const product = db.products.find(p => p.id === item.productId);
      if (product) {
        product.reserved = Math.max(0, (product.reserved || 0) - item.quantity);
        product.stock += item.quantity;
        product.status = statusEstoque; // AVAILABLE, MAINTENANCE, LAUNDRY
        logStockMovement(product.id, item.quantity, 'entrada', `RETORNO: ${statusEstoque}`, id);
      }
    });
  }
  res.json({ message: "Devolvido!" });
});

router.delete('/rentals/:id', (req, res) => {
  const rental = db.rentals.find(r => r.id === req.params.id);
  if (rental && rental.status !== 'RETURNED') {
    rental.items?.forEach(i => updateStock(i.productId, i.quantity, 'unreserve'));
  }
  db.rentals = db.rentals.filter(r => r.id !== req.params.id);
  res.status(204).send();
});

// AGENDA, FINANCEIRO E OUTROS
router.get('/appointments', (req, res) => res.json({ data: db.appointments || [] }));
router.post('/appointments', (req, res) => {
  const appt = { ...req.body, id: uuidv4(), createdAt: new Date() };
  db.appointments.push(appt);
  res.status(201).json(appt);
});

router.post('/finance/bills', (req, res) => {
  const bill = { ...req.body, id: uuidv4(), status: req.body.status || 'PENDENTE', createdAt: new Date() };
  db.finance.push(bill);
  res.status(201).json(bill);
});

router.patch('/finance/bills/:id/pay', (req, res) => {
  const idx = db.finance.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).send();
  const bill = db.finance[idx];
  const paid = Number(req.body.paidValue || bill.value);
  if (paid < bill.value) {
    const rem = bill.value - paid;
    db.finance.push({ ...bill, id: uuidv4(), value: paid, status: 'PAGO', paidAt: new Date(), description: `${bill.description} (PARCIAL)` });
    bill.value = rem; bill.description += ' (SALDO)';
    res.json({ message: "Abatido" });
  } else {
    bill.status = 'PAGO'; bill.paidAt = new Date(); res.json(bill);
  }
});

router.delete('/finance/bills/:id', (req, res) => {
  db.finance = db.finance.filter(b => b.id !== req.params.id);
  res.status(204).send();
});

router.get('/suppliers', (req, res) => res.json({ data: db.suppliers || [] }));
router.post('/suppliers', (req, res) => {
  const s = { ...req.body, id: uuidv4(), createdAt: new Date() };
  db.suppliers.push(s);
  res.status(201).json(s);
});

app.use('/api/v1', router);
app.listen(PORT, () => console.log(`🚀 Atelier Pro rodando em http://localhost:${PORT}`));