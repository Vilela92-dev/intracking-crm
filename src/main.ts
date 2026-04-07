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

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CONFIGURAÇÃO DE UPLOADS (ESTRUTURA COMPLETA)
// ==========================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não suportado. Use PNG, JPG ou PDF.'));
    }
  }
});

// ==========================================
// BANCO DE DATA (ESTADO INICIAL)
// ==========================================
const db = {
  products: [],
  customers: [],
  suppliers: [],
  quotes: [],
  sales: [],
  rentals: [],
  appointments: [],
  finance: [],
  stockMovements: [],
  settings: {
    atelierName: 'Atelier Pro',
    logoUrl: '',
    primaryColor: '#4f46e5',
    cnpj: '00.000.000/0001-00',
    address: 'Rua Exemplo, 123 - Centro',
    contractSale: 'CONTRATO DE COMPRA E VENDA\n\nCONTRATADA: {{atelierName}}, CNPJ {{cnpj_atelier}}.\nCONTRATANTE: {{nome}}, CPF {{cpf_cliente}}, RG {{rg_cliente}}.\n\nOBJETO: {{itens}}\n\nVALOR TOTAL: {{total}}\n\nAssinatura: __________________________',
    contractRental: 'CONTRATO DE LOCAÇÃO\n\nLOCADOR: {{atelierName}}, residente em {{endereco_atelier}}.\nLOCATÁRIO: {{nome}}, CPF {{cpf_cliente}}.\n\nDATA DO EVENTO: {{data_evento}}\nOBJETO: {{itens}}\n\nVALOR TOTAL: {{total}}\n\nAssinatura: __________________________'
  }
};

// ==========================================
// FUNÇÕES DE LOG E ESTOQUE (SEM SIMPLIFICAÇÃO)
// ==========================================

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
    const niveis = {
      'PROSPECÇÃO': 1,
      'ORÇAMENTO': 2,
      'CONTRATO FECHADO': 3,
      'CONCLUÍDO': 4
    };
    const nivelAtual = niveis[customer.status] || 0;
    const novoNivel = niveis[newStatus] || 0;
    if (novoNivel > nivelAtual) {
      customer.status = newStatus;
    }
  }
};

const updateStock = (productId, qty, type) => {
  const p = db.products.find((prod) => prod.id === productId || prod._id === productId);
  if (!p) return;
  const amount = Number(qty);
  if (type === 'increase') {
    p.stock += amount;
  } else if (type === 'decrease') {
    p.stock -= amount;
  } else if (type === 'reserve') {
    p.stock -= amount;
    p.reserved = (p.reserved || 0) + amount;
  } else if (type === 'release') {
    p.reserved = (p.reserved || 0) - amount;
  } else if (type === 'unreserve') {
    p.reserved = (p.reserved || 0) - amount;
    p.stock += amount;
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

const processContractText = (template, data) => {
  const map = {
    '{{atelierName}}': db.settings.atelierName,
    '{{cnpj_atelier}}': db.settings.cnpj,
    '{{endereco_atelier}}': db.settings.address,
    '{{nome}}': data.customer?.name || '________________',
    '{{cpf_cliente}}': data.customer?.cpf || '________________',
    '{{rg_cliente}}': data.customer?.rg || '________________',
    '{{endereco_cliente}}': data.customer?.address || '________________',
    '{{data_evento}}': data.customer?.eventDate ? new Date(data.customer.eventDate).toLocaleDateString('pt-BR') : '___/___/___',
    '{{total}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalValue || 0),
    '{{itens}}': data.customer?.projectDescription || data.projectDescription || data.items?.map(i => i.name).join(', ') || 'Peças sob medida'
  };

  let processed = template;
  Object.keys(map).forEach(tag => {
    const regex = new RegExp(tag, 'g');
    processed = processed.replace(regex, String(map[tag]));
  });
  return processed;
};

// ==========================================
// ROTAS DO SISTEMA (PREFIXO /API/V1)
// ==========================================
const router = express.Router();

// --- CONFIGURAÇÕES ---
router.get('/settings', (req, res) => {
  res.json({ data: db.settings });
});

router.post('/settings', (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  res.json({ message: "Configurações atualizadas!", data: db.settings });
});

// --- UPLOAD ---
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  }
  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.status(201).json({ url: fileUrl, filename: req.file.filename });
});

// --- CRM / CLIENTES ---
router.get('/crm/customers', (req, res) => {
  res.json({ data: db.customers || [] });
});

router.post('/crm/customers', (req, res) => {
  const customer = { 
    ...req.body, 
    id: uuidv4(), 
    measurementsHistory: [], 
    createdAt: new Date(), 
    status: req.body.status || 'PROSPECÇÃO' 
  };
  db.customers.push(customer);
  res.status(201).json(customer);
});

router.put('/crm/customers/:id', (req, res) => {
  const index = db.customers.findIndex((c) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Não encontrado" });
  
  const current = db.customers[index];
  let updatedHistory = current.measurementsHistory || [];
  
  if (req.body.saveSnapshot && req.body.measurements) {
    updatedHistory.push({
      date: new Date().toISOString(),
      data: { ...req.body.measurements }
    });
  }
  
  db.customers[index] = { 
    ...current, 
    ...req.body, 
    id: req.params.id, 
    measurementsHistory: updatedHistory 
  };
  res.json(db.customers[index]);
});

router.delete('/crm/customers/:id', (req, res) => {
  db.customers = db.customers.filter((c) => c.id !== req.params.id);
  res.status(204).send();
});

// --- FORNECEDORES ---
router.get('/suppliers', (req, res) => {
  res.json({ data: db.suppliers || [] });
});

router.post('/suppliers', (req, res) => {
  const supplier = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date()
  };
  db.suppliers.push(supplier);
  res.status(201).json(supplier);
});

router.delete('/suppliers/:id', (req, res) => {
  db.suppliers = db.suppliers.filter(s => s.id !== req.params.id);
  res.status(204).send();
});

// --- ORÇAMENTOS ---
router.get('/quotes', (req, res) => {
  res.json({ data: db.quotes || [] });
});

router.post('/quotes', (req, res) => {
  const { customerId, items, laborCost, markup } = req.body;
  const materialCost = (items || []).reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  const total = (materialCost + Number(laborCost || 0)) * (1 + (Number(markup || 0) / 100));

  const q = { 
    ...req.body, 
    id: uuidv4(), 
    totalValue: total, 
    status: 'PENDENTE', 
    createdAt: new Date() 
  };
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
    if (quote.items) {
      quote.items.forEach(i => updateStock(i.productId || i.id, i.quantity, 'reserve'));
    }
    updateCustomerStatus(quote.customerId, 'CONTRATO FECHADO');
  }
  
  if (newStatus === 'REPROVADO' && quote.status === 'APROVADO') {
    if (quote.items) {
      quote.items.forEach(i => updateStock(i.productId || i.id, i.quantity, 'unreserve'));
    }
  }

  db.quotes[index] = { ...quote, ...req.body, id: req.params.id };
  res.json(db.quotes[index]);
});

// --- VENDAS ---
router.get('/sales', (req, res) => {
  res.json({ data: db.sales || [] });
});

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

  if (dbQuote) {
    dbQuote.isConverted = true;
    dbQuote.status = 'APROVADO';
  }

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
    db.finance.push({
      id: uuidv4(),
      type: 'receita',
      value: Number(valorEntrada),
      status: 'PAGO',
      customerName: sale.customerName,
      description: `Entrada Venda - ${sale.customerName}`,
      dueDate: new Date(),
      createdAt: new Date(),
      customerId
    });
  }

  if (parcelasAgendadas) {
    parcelasAgendadas.forEach(p => {
      db.finance.push({
        id: uuidv4(),
        type: 'receita',
        value: Number(p.valor),
        status: 'PENDENTE',
        customerName: sale.customerName,
        description: `Parcela ${p.numero} Venda - ${sale.customerName}`,
        dueDate: p.vencimento,
        createdAt: new Date(),
        customerId
      });
    });
  }

  res.status(201).json(sale);
});

// --- ESTOQUE E PRODUÇÃO ---
router.get('/products', (req, res) => {
  res.json({ data: db.products || [] });
});

router.get('/products/rentables', (req, res) => {
  const rentables = db.products.filter((p) => (p.can_rent || p.category === 'PEÇA_PRONTA') && p.stock > 0);
  res.json({ data: rentables });
});

router.post('/products', (req, res) => {
  const product = updateOrAddProduct(req.body);
  res.status(201).json(product);
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
  if (items) {
    items.forEach(i => updateOrAddProduct(i));
  }
  if (bills) {
    bills.forEach((bill, idx) => {
      db.finance.push({
        id: uuidv4(),
        type: 'despesa',
        value: Number(bill.value),
        status: 'PENDENTE',
        description: bill.description || `Parcela Produção ${idx+1}`,
        dueDate: bill.dueDate,
        createdAt: new Date()
      });
    });
  }
  res.status(201).json({ message: "Produção processada com sucesso" });
});

// --- ALUGUÉIS ---
router.get('/rentals', (req, res) => {
  res.json({ data: db.rentals || [] });
});

router.post('/rentals', (req, res) => {
  const { customerId, customerName, items, totalValue, valorEntrada, parcelasAgendadas, dataRetirada, dataDevolucao } = req.body;
  const rentalId = uuidv4();
  const rental = { ...req.body, id: rentalId, status: 'ACTIVE', createdAt: new Date() };
  
  db.rentals.push(rental);
  updateCustomerStatus(customerId, 'CONTRATO FECHADO');

  if (items) {
    items.forEach(i => {
      updateStock(i.productId, i.quantity, 'reserve');
      logStockMovement(i.productId, i.quantity, 'saida', `ALUGUEL: ${customerName}`, rentalId);
    });
  }

  if (Number(valorEntrada) > 0) {
    db.finance.push({
      id: uuidv4(),
      rentalId: rentalId,
      type: 'receita',
      value: Number(valorEntrada),
      status: 'PAGO',
      customerName: customerName,
      description: `Entrada Aluguel - ${customerName}`,
      dueDate: new Date(),
      createdAt: new Date(),
      customerId: customerId
    });
  }

  if (parcelasAgendadas) {
    parcelasAgendadas.forEach(p => {
      db.finance.push({
        id: uuidv4(),
        rentalId: rentalId,
        type: 'receita',
        value: Number(p.valor),
        status: 'PENDENTE',
        customerName: customerName,
        description: `Parcela ${p.numero} Aluguel - ${customerName}`,
        dueDate: p.vencimento,
        createdAt: new Date(),
        customerId: customerId
      });
    });
  }

  if (dataRetirada) {
    db.appointments.push({
      id: uuidv4(),
      rentalId: rentalId,
      title: `RETIRADA: ${customerName}`,
      date: dataRetirada,
      time: "10:00",
      type: "RETIRADA",
      customerId: customerId
    });
  }

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
        product.status = statusEstoque;
        logStockMovement(product.id, item.quantity, 'entrada', `RETORNO: ${statusEstoque}`, id);
      }
    });
  }
  res.json({ message: "Itens devolvidos ao estoque." });
});

// --- FINANCEIRO (COMPLETO COM BAIXA PARCIAL) ---
router.get('/finance/bills', (req, res) => {
  res.json({ data: db.finance || [] });
});

router.post('/finance/bills', (req, res) => {
  const bill = {
    ...req.body,
    id: uuidv4(),
    status: req.body.status || 'PENDENTE',
    createdAt: new Date()
  };
  db.finance.push(bill);
  res.status(201).json(bill);
});

router.patch('/finance/bills/:id/pay', (req, res) => {
  const index = db.finance.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).send("Conta não encontrada");
  
  const bill = db.finance[index];
  const valorPago = Number(req.body.paidValue || bill.value);

  if (valorPago < bill.value) {
    const saldoRestante = bill.value - valorPago;
    
    // Cria o registro do que foi pago
    db.finance.push({
      ...bill,
      id: uuidv4(),
      value: valorPago,
      status: 'PAGO',
      paidAt: new Date(),
      description: `${bill.description} (PAGAMENTO PARCIAL)`
    });

    // Atualiza a conta original com o saldo que falta
    bill.value = saldoRestante;
    bill.description = `${bill.description} (SALDO REMANESCENTE)`;
    res.json({ message: "Pagamento parcial registrado. Saldo atualizado." });
  } else {
    bill.status = 'PAGO';
    bill.paidAt = new Date();
    res.json(bill);
  }
});

router.delete('/finance/bills/:id', (req, res) => {
  db.finance = db.finance.filter(b => b.id !== req.params.id);
  res.status(204).send();
});

// --- AGENDA E RELATÓRIOS ---
router.get('/appointments', (req, res) => {
  res.json({ data: db.appointments || [] });
});

router.post('/appointments', (req, res) => {
  const appt = { ...req.body, id: uuidv4(), createdAt: new Date() };
  db.appointments.push(appt);
  res.status(201).json(appt);
});

router.get('/reports/stock-movements', (req, res) => {
  res.json({ data: db.stockMovements || [] });
});

// --- MOTOR DE IMPRESSÃO (SEM RESUMO) ---
router.get('/contracts/:type/:id/print', (req, res) => {
  const { type, id } = req.params;
  const collection = db[type];
  const document = collection?.find(d => d.id === id);
  if (!document) return res.status(404).send("<h1>Documento não encontrado.</h1>");
  
  const customer = db.customers.find(c => c.id === document.customerId);
  const template = type === 'sales' ? db.settings.contractSale : db.settings.contractRental;
  const content = processContractText(template, { ...document, customer });

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <title>Contrato - ${customer?.name || 'Atelier'}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; }
        .contract-box { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 50px; background: #fff; }
        h1 { color: ${db.settings.primaryColor}; border-bottom: 2px solid ${db.settings.primaryColor}; padding-bottom: 10px; }
        .content { white-space: pre-wrap; margin-top: 30px; text-align: justify; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
        .sig-line { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px; margin-top: 40px; font-size: 12px; }
        @media print { body { background: white; padding: 0; } .contract-box { border: none; } }
      </style>
    </head>
    <body>
      <div class="contract-box">
        <h1>${db.settings.atelierName}</h1>
        <div class="content">${content}</div>
        <div class="signatures">
          <div class="sig-line">CONTRATADA<br>${db.settings.atelierName}</div>
          <div class="sig-line">CONTRATANTE<br>${customer?.name || 'Assinatura do Cliente'}</div>
        </div>
      </div>
      <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
    </body>
    </html>
  `);
});


// Forçamos a conversão para número para o TS não reclamar
const PORT: number = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVIDOR RODANDO NA PORTA: ${PORT}`);
});