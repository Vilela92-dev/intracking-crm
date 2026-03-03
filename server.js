import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// === BANCO DE DADOS EM MEMÓRIA ===
let customers = [];
let products = [];
let sales = [];
let suppliers = [];
let bills = []; 
let appointments = [];

// === CRM (CUSTOMERS) ===
app.get('/api/v1/crm/customers', (req, res) => res.json({ data: customers }));

app.post('/api/v1/crm/customers', (req, res) => {
  const item = { id: 'cust-' + Date.now(), ...req.body };
  customers.push(item);
  res.json({ data: item });
});

app.put('/api/v1/crm/customers/:id', (req, res) => {
  const { id } = req.params;
  const index = customers.findIndex(c => c.id === id);
  if (index !== -1) {
    customers[index] = { ...customers[index], ...req.body, id: customers[index].id };
    res.json({ data: customers[index] });
  } else {
    res.status(404).json({ error: 'Cliente não encontrado' });
  }
});

app.delete('/api/v1/crm/customers/:id', (req, res) => {
  const { id } = req.params;
  customers = customers.filter(c => c.id !== id);
  res.json({ success: true });
});

// === FORNECEDORES ===
app.get('/api/v1/suppliers', (req, res) => res.json({ data: suppliers }));

app.post('/api/v1/suppliers', (req, res) => {
  const item = { id: 'supp-' + Date.now(), ...req.body };
  suppliers.push(item);
  res.json({ data: item });
});

app.delete('/api/v1/suppliers/:id', (req, res) => {
  const { id } = req.params;
  suppliers = suppliers.filter(s => s.id !== id);
  res.json({ success: true });
});

// === ESTOQUE (PRODUTOS) E CONTAS A PAGAR ===
app.get('/api/v1/products', (req, res) => res.json({ data: products }));

app.post('/api/v1/products', (req, res) => {
  try {
    const { name, category, price, stock, supplierId, supplierName, bills: parcelas } = req.body;
    const purchaseGroupId = 'purchase-' + Date.now();
    
    const novoProduto = { 
      id: 'prod-' + Date.now(), 
      purchaseGroupId,
      name, category, 
      price: parseFloat(price) || 0, 
      stock: parseFloat(stock) || 0, 
      supplierId, supplierName,
      createdAt: new Date()
    };
    
    products.push(novoProduto);

    // Geração das contas a pagar (Despesas)
    if (parcelas && Array.isArray(parcelas)) {
      parcelas.forEach((p, index) => {
        bills.push({
          id: `bill-supp-${Date.now()}-${index}`,
          purchaseGroupId,
          description: `Compra: ${name} (Parc ${index + 1}/${parcelas.length})`,
          value: parseFloat(p.value) || 0,
          type: 'despesa',
          status: 'PENDENTE',
          dueDate: p.dueDate,
          createdAt: new Date()
        });
      });
    }

    res.json({ data: novoProduto });
  } catch (err) {
    console.error("Erro na entrada de produto:", err);
    res.status(500).json({ error: "Erro ao processar entrada de produto" });
  }
});

app.put('/api/v1/products/:id', (req, res) => {
  const { id } = req.params;
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = { 
        ...products[index], 
        ...req.body, 
        id: products[index].id,
        price: parseFloat(req.body.price) || products[index].price,
        stock: parseFloat(req.body.stock) || products[index].stock
    };
    res.json({ data: products[index] });
  } else {
    res.status(404).json({ error: 'Produto não encontrado' });
  }
});

app.delete('/api/v1/products/:id', (req, res) => {
  const { id } = req.params;
  const productToDelete = products.find(p => p.id === id);
  
  if (productToDelete) {
    if (productToDelete.purchaseGroupId) {
        bills = bills.filter(b => b.purchaseGroupId !== productToDelete.purchaseGroupId);
    }
    products = products.filter(p => p.id !== id);
    res.json({ success: true, message: 'Produto e boletos removidos' });
  } else {
    res.status(404).json({ error: 'Produto não encontrado' });
  }
});

// === VENDAS (BAIXA ESTOQUE + FINANCEIRO) ===
app.get('/api/v1/sales', (req, res) => res.json({ data: sales }));

app.post('/api/v1/sales', (req, res) => {
  try {
    const { customerId, customerName, items, totalValue, paymentMethod, numParcelas } = req.body;

    // 1. BAIXA DE ESTOQUE
    if (items && Array.isArray(items)) {
      items.forEach(itemVendido => {
        const produtoNoEstoque = products.find(p => p.id === itemVendido.productId);
        if (produtoNoEstoque) {
          const estoqueAtual = parseFloat(produtoNoEstoque.stock) || 0;
          const qtdVendida = parseFloat(itemVendido.quantity) || 0;
          produtoNoEstoque.stock = estoqueAtual - qtdVendida;
        }
      });
    }

    // 2. REGISTRO DA VENDA
    const novaVenda = { 
      id: 'sale-' + Date.now(), 
      customerId, customerName, items, 
      totalValue: parseFloat(totalValue) || 0, 
      paymentMethod,
      createdAt: new Date()
    };
    sales.push(novaVenda);

    // 3. ATUALIZAÇÃO FINANCEIRA
    const qtdParcelas = parseInt(numParcelas) || 0;
    const valorTotalNum = parseFloat(totalValue) || 0;

    if (qtdParcelas > 1) {
      const valorParcela = parseFloat((valorTotalNum / qtdParcelas).toFixed(2));
      for (let i = 1; i <= qtdParcelas; i++) {
        const dataVencimento = new Date();
        dataVencimento.setMonth(dataVencimento.getMonth() + i);

        bills.push({
          id: `rev-inst-${Date.now()}-${i}`,
          description: `Venda: ${customerName} (Parc ${i}/${qtdParcelas})`,
          value: valorParcela,
          type: 'receita',
          status: 'PENDENTE',
          dueDate: dataVencimento.toISOString().split('T')[0],
          createdAt: new Date()
        });
      }
    } else {
      // Venda à vista ou 1x
      bills.push({
        id: `rev-cash-${Date.now()}`,
        description: `Venda à Vista: ${customerName}`,
        value: valorTotalNum,
        type: 'receita',
        status: (paymentMethod === 'CREDIT') ? 'PENDENTE' : 'PAGO',
        dueDate: new Date().toISOString().split('T')[0],
        createdAt: new Date()
      });
    }

    res.json({ data: novaVenda });
  } catch (err) {
    console.error("Erro ao processar venda:", err);
    res.status(500).json({ error: "Erro interno ao processar venda" });
  }
});

// === AGENDAMENTO ===
app.get('/api/v1/appointments', (req, res) => res.json({ data: appointments }));

app.post('/api/v1/appointments', (req, res) => {
  const item = { id: 'app-' + Date.now(), ...req.body, status: 'AGENDADO', createdAt: new Date() };
  appointments.push(item);
  res.json({ data: item });
});

app.delete('/api/v1/appointments/:id', (req, res) => {
  const { id } = req.params;
  appointments = appointments.filter(a => a.id !== id);
  res.json({ success: true });
});

// === FINANCEIRO ===
app.get('/api/v1/finance/bills', (req, res) => res.json({ data: bills }));

app.patch('/api/v1/finance/bills/:id/pay', (req, res) => {
  const { id } = req.params;
  const bill = bills.find(b => b.id === id);
  if (bill) {
    bill.status = 'PAGO';
    res.json({ data: bill });
  } else {
    res.status(404).json({ error: 'Fatura não encontrada' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});