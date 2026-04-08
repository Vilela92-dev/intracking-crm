// @ts-nocheck
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');

// ==========================================
// CONFIGURAÇÃO PRISMA (MOTOR DO SAAS)
// ==========================================

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

const PORT: number = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// MIDDLEWARE DE ISOLAMENTO (TENANT)
// ==========================================
const tenantMiddleware = (req: any, res: any, next: any) => {
  // O ID padrão 'tenant-esposa-id' é apenas um fallback para testes
  const tenantId = req.headers['x-tenant-id'] || 'tenant-esposa-id';
  req.tenantId = tenantId;
  next();
};

// ==========================================
// CONFIGURAÇÃO DE UPLOADS (ESTRUTURA COMPLETA)
// ==========================================
const uploadDir = path.join(__dirname, '..', 'uploads');
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
// FUNÇÕES DE LOG E ESTOQUE (MIGRADAS PARA PRISMA)
// ==========================================

const logStockMovement = async (tenantId: string, productId: string, qty: number, type: string, destination: string, refId: string | number) => {
  console.log(`[MOVIMENTAÇÃO] Tenant: ${tenantId} | Produto: ${productId} | Qtd: ${qty} | Tipo: ${type} | Ref: ${refId}`);
};

const updateCustomerStatus = async (tenantId: string, customerId: string, newStatus: string) => {
  if (!customerId) return;
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
  
  if (customer) {
    const niveis: any = {
      'PROSPECÇÃO': 1,
      'ORÇAMENTO': 2,
      'CONTRATO FECHADO': 3,
      'CONCLUÍDO': 4
    };
    const nivelAtual = niveis[customer.status] || 0;
    const novoNivel = niveis[newStatus] || 0;
    
    if (novoNivel > nivelAtual) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { status: newStatus }
      });
    }
  }
};

const updateStock = async (tenantId: string, productId: string, qty: number, type: string) => {
  const p = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!p) return;
  
  const amount = Number(qty);
  let newData: any = {};

  if (type === 'increase') newData.stock = p.stock + amount;
  else if (type === 'decrease') newData.stock = p.stock - amount;
  else if (type === 'reserve') {
    newData.stock = p.stock - amount;
    newData.reserved = (p.reserved || 0) + amount;
  } else if (type === 'release') {
    newData.reserved = (p.reserved || 0) - amount;
  } else if (type === 'unreserve') {
    newData.reserved = (p.reserved || 0) - amount;
    newData.stock = p.stock + amount;
  }

  await prisma.product.update({ where: { id: productId }, data: newData });
};

const updateOrAddProduct = async (tenantId: string, item: any) => {
  let product = await prisma.product.findFirst({
    where: {
      tenantId,
      OR: [
        { id: item.id || '' },
        { id: item.productId || '' },
        { name: { equals: item.name.toUpperCase() } }
      ]
    }
  });

  const quantity = Number(item.quantity || item.usedQty || 0);
  const price = Number(item.unitPrice || item.price || 0);
  let unitLabel = (item.unitType || item.unit || '').toUpperCase().includes('METRO') ? 'METROS' : 'UNIDADE';

  if (product) {
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        stock: product.stock + quantity,
        price: price > 0 ? price : product.price
      }
    });
    await logStockMovement(tenantId, product.id, quantity, 'entrada', 'REPOSIÇÃO / COMPRA', 'EST-ADD');
    return updated;
  } else {
    const newProduct = await prisma.product.create({
      data: {
        name: item.name.toUpperCase(),
        unit: unitLabel,
        category: item.category || 'INSUMO',
        stock: quantity,
        reserved: 0,
        price: price,
        can_rent: item.can_rent || false,
        can_sell: item.can_sell || false,
        status: item.status || 'DISPONIVEL',
        tenantId: tenantId
      }
    });
    await logStockMovement(tenantId, newProduct.id, quantity, 'entrada', 'CADASTRO INICIAL', 'NEW-PROD');
    return newProduct;
  }
};

const processContractText = (settings: any, template: string, data: any) => {
  const map: any = {
    '{{atelierName}}': settings.atelierName,
    '{{cnpj_atelier}}': settings.cnpj || '',
    '{{endereco_atelier}}': settings.address || '',
    '{{nome}}': data.customer?.name || '________________',
    '{{cpf_cliente}}': data.customer?.cpf || '________________',
    '{{rg_cliente}}': data.customer?.rg || '________________',
    '{{endereco_cliente}}': data.customer?.address || '________________',
    '{{data_evento}}': data.customer?.eventDate ? new Date(data.customer.eventDate).toLocaleDateString('pt-BR') : '___/___/___',
    '{{total}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalValue || 0),
    '{{itens}}': data.customer?.projectDescription || data.projectDescription || data.items?.map((i: any) => i.name).join(', ') || 'Peças sob medida'
  };

  let processed = template;
  Object.keys(map).forEach(tag => {
    const regex = new RegExp(tag, 'g');
    processed = processed.replace(regex, String(map[tag]));
  });
  return processed;
};

// ==========================================
// ROTA DE SETUP (CADASTRO DE NOVAS EMPRESAS)
// Esta rota precisa estar ANTES do router com tenantMiddleware
// ==========================================
app.post('/setup', async (req, res) => {
  try {
    const { atelierName, email, password, name } = req.body;

    // Verificar se o e-mail já existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Este e-mail já está cadastrado em outro ateliê." });
    }

    // 1. Criar a Empresa (Tenant)
    const tenant = await prisma.tenant.create({
      data: {
        name: atelierName || "Novo Ateliê",
        plan: "FREE"
      }
    });

    // 2. Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Criar o Usuário vinculado ao Tenant
    const user = await prisma.user.create({
      data: {
        email,
        name: name || atelierName,
        password: hashedPassword,
        tenantId: tenant.id,
        role: "ADMIN"
      }
    });

    // 4. Criar as Settings iniciais
    await prisma.settings.create({
      data: {
        atelierName: atelierName || "Meu Ateliê",
        tenantId: tenant.id,
        primaryColor: "#4f46e5"
      }
    });

    console.log(`✅ Ambiente criado com sucesso: ${atelierName} (${email})`);
    res.status(201).json({ message: "Ambiente criado com sucesso!", tenantId: tenant.id });

  } catch (error) {
    console.error("❌ Erro ao processar setup:", error);
    res.status(500).json({ message: "Erro interno ao criar ambiente." });
  }
});

// ==========================================
// ROTAS DO SISTEMA (PREFIXO /API/V1)
// ==========================================
const router = express.Router();
router.use(tenantMiddleware);

router.get('/settings', async (req: any, res) => {
  const settings = await prisma.settings.findUnique({ where: { tenantId: req.tenantId } });
  res.json({ data: settings });
});

router.post('/settings', async (req: any, res) => {
  const settings = await prisma.settings.upsert({
    where: { tenantId: req.tenantId },
    update: req.body,
    create: { ...req.body, tenantId: req.tenantId }
  });
  res.json({ message: "Configurações atualizadas!", data: settings });
});

app.post('/api/v1/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ url: fileUrl, filename: req.file.filename });
});

router.get('/crm/customers', async (req: any, res) => {
  const customers = await prisma.customer.findMany({ where: { tenantId: req.tenantId } });
  res.json({ data: customers });
});

router.post('/crm/customers', async (req: any, res) => {
  const customer = await prisma.customer.create({
    data: { ...req.body, tenantId: req.tenantId, status: req.body.status || 'PROSPECÇÃO' }
  });
  res.status(201).json(customer);
});

router.put('/crm/customers/:id', async (req: any, res) => {
  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(updated);
});

router.delete('/crm/customers/:id', async (req: any, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get('/suppliers', async (req: any, res) => {
  const data = await prisma.supplier.findMany({ where: { tenantId: req.tenantId } });
  res.json({ data });
});

router.post('/suppliers', async (req: any, res) => {
  const supplier = await prisma.supplier.create({
    data: { ...req.body, tenantId: req.tenantId }
  });
  res.status(201).json(supplier);
});

router.delete('/suppliers/:id', async (req: any, res) => {
  await prisma.supplier.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get('/quotes', async (req: any, res) => {
  const data = await prisma.quote.findMany({ 
    where: { tenantId: req.tenantId },
    include: { customer: true }
  });
  res.json({ data });
});

router.post('/quotes', async (req: any, res) => {
  const { customerId, items, laborCost, markup } = req.body;
  const materialCost = (items || []).reduce((sum: number, i: any) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  const total = (materialCost + Number(laborCost || 0)) * (1 + (Number(markup || 0) / 100));

  const q = await prisma.quote.create({
    data: { 
      ...req.body, 
      totalValue: total, 
      status: 'PENDENTE', 
      tenantId: req.tenantId 
    }
  });
  await updateCustomerStatus(req.tenantId, customerId, 'ORÇAMENTO');
  res.status(201).json(q);
});

router.put('/quotes/:id', async (req: any, res) => {
  const quote = await prisma.quote.findUnique({ where: { id: req.params.id } });
  if (!quote) return res.status(404).json({ message: "Não encontrado" });
  
  const newStatus = req.body.status;
  if (newStatus === 'APROVADO' && quote.status !== 'APROVADO') {
    if (req.body.items) {
      for (const i of req.body.items) {
        await updateStock(req.tenantId, i.productId || i.id, i.quantity, 'reserve');
      }
    }
    await updateCustomerStatus(req.tenantId, quote.customerId, 'CONTRATO FECHADO');
  }

  const updated = await prisma.quote.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(updated);
});

router.get('/sales', async (req: any, res) => {
  const data = await prisma.sale.findMany({ where: { tenantId: req.tenantId }, include: { customer: true } });
  res.json({ data });
});

router.post('/sales', async (req: any, res) => {
  const { customerId, items, totalValue, valorEntrada, quoteId, parcelasAgendadas } = req.body;
  
  const sale = await prisma.sale.create({
    data: { 
      totalValue: Number(totalValue),
      customerId,
      tenantId: req.tenantId,
      status: 'CONCLUIDO'
    }
  });

  if (quoteId) {
    await prisma.quote.update({ where: { id: quoteId }, data: { isConverted: true, status: 'APROVADO' } });
  }

  await updateCustomerStatus(req.tenantId, customerId, 'CONTRATO FECHADO');

  if (items) {
    for (const i of items) {
      const pid = i.productId || i.id;
      if (quoteId) await updateStock(req.tenantId, pid, i.quantity, 'release');
      await updateStock(req.tenantId, pid, i.quantity, 'decrease');
      await logStockMovement(req.tenantId, pid, i.quantity, 'saida', `VENDA`, sale.id);
    }
  }

  if (Number(valorEntrada) > 0) {
    await prisma.finance.create({
      data: {
        type: 'receita',
        value: Number(valorEntrada),
        status: 'PAGO',
        description: `Entrada Venda`,
        dueDate: new Date(),
        tenantId: req.tenantId
      }
    });
  }

  res.status(201).json(sale);
});

router.get('/products', async (req: any, res) => {
  const data = await prisma.product.findMany({ where: { tenantId: req.tenantId } });
  res.json({ data });
});

router.post('/products', async (req: any, res) => {
  const product = await updateOrAddProduct(req.tenantId, req.body);
  res.status(201).json(product);
});

router.post('/products/produce', async (req: any, res) => {
  const { items, composition, bills, productName } = req.body;
  if (composition) {
    for (const c of composition) {
      const id = c.productId || c.id;
      await updateStock(req.tenantId, id, c.quantityUsed, 'decrease');
      await logStockMovement(req.tenantId, id, c.quantityUsed, 'saida', `PRODUÇÃO: ${productName}`, 'OP-PROD');
    }
  }
  if (items) {
    for (const i of items) await updateOrAddProduct(req.tenantId, i);
  }
  if (bills) {
    for (const bill of bills) {
      await prisma.finance.create({
        data: {
          type: 'despesa',
          value: Number(bill.value),
          status: 'PENDENTE',
          description: bill.description,
          dueDate: new Date(bill.dueDate),
          tenantId: req.tenantId
        }
      });
    }
  }
  res.status(201).json({ message: "Produção processada" });
});

router.get('/rentals', async (req: any, res) => {
  const data = await prisma.rental.findMany({ where: { tenantId: req.tenantId }, include: { customer: true } });
  res.json({ data });
});

router.post('/rentals', async (req: any, res) => {
  const { customerId, items, totalValue, valorEntrada, dataRetirada, dataDevolucao } = req.body;
  const rental = await prisma.rental.create({
    data: { 
      totalValue: Number(totalValue),
      customerId,
      dataRetirada: dataRetirada ? new Date(dataRetirada) : null,
      dataDevolucao: dataDevolucao ? new Date(dataDevolucao) : null,
      tenantId: req.tenantId,
      status: 'ACTIVE'
    }
  });

  await updateCustomerStatus(req.tenantId, customerId, 'CONTRATO FECHADO');

  if (items) {
    for (const i of items) {
      await updateStock(req.tenantId, i.productId, i.quantity, 'reserve');
    }
  }

  res.status(201).json(rental);
});

router.get('/finance/bills', async (req: any, res) => {
  const data = await prisma.finance.findMany({ where: { tenantId: req.tenantId } });
  res.json({ data });
});

router.post('/finance/bills', async (req: any, res) => {
  const bill = await prisma.finance.create({
    data: { ...req.body, value: Number(req.body.value), dueDate: new Date(req.body.dueDate), tenantId: req.tenantId }
  });
  res.status(201).json(bill);
});

router.get('/appointments', async (req: any, res) => {
  const data = await prisma.appointment.findMany({ where: { tenantId: req.tenantId } });
  res.json({ data });
});

app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  res.json({
    user: { name: user.name, email: user.email },
    tenantId: user.tenantId,
    tenantName: user.tenant.name
  });
});

router.get('/contracts/:type/:id/print', async (req: any, res) => {
  const { type, id } = req.params;
  const settings = await prisma.settings.findUnique({ where: { tenantId: req.tenantId } });
  
  let document;
  if (type === 'sales') document = await prisma.sale.findUnique({ where: { id }, include: { customer: true } });
  else document = await prisma.rental.findUnique({ where: { id }, include: { customer: true } });

  if (!document || !settings) return res.status(404).send("Documento não encontrado");

  const template = type === 'sales' ? settings.contractSale : settings.contractRental;
  const content = processContractText(settings, template || '', document);

  res.send(`
    <html>
      <body onload="window.print()">
        <h1 style="color: ${settings.primaryColor}">${settings.atelierName}</h1>
        <pre style="white-space: pre-wrap;">${content}</pre>
      </body>
    </html>
  `);
});

app.use('/api/v1', router);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVIDOR SAAS RODANDO NA PORTA: ${PORT}`);
});