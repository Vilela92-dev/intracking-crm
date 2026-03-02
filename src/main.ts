import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// BANCO DE DADOS NA MEMÓRIA
let database = {
  customers: [] as any[],
  sales: [] as any[],
  products: [
    { id: 'p1', name: 'Produto Padrão', price: 100 } // Adicionei um produto para não vir vazio
  ]
};

// --- LOGIN ---
app.post('/api/v1/auth/login', (req, res) => {
  res.status(200).send({ 
    success: true,
    data: { 
      accessToken: 'token-fake',
      user: { id: '1', name: 'Admin' } 
    }
  });
});

// --- CLIENTES (Rota que o Vendas.jsx chama) ---
app.get('/api/v1/crm/customers', (req, res) => {
  res.status(200).send({ success: true, data: database.customers });
});

app.post('/api/v1/crm/customers', (req, res) => {
  const newCustomer = { 
    id: 'cust_' + Math.random().toString(36).substr(2, 4), 
    ...req.body,
    createdAt: new Date().toISOString()
  };
  database.customers.push(newCustomer);
  res.status(201).send({ success: true, data: newCustomer });
});

// --- VENDAS (Rota: /api/v1/sales) ---
app.get('/api/v1/sales', (req, res) => {
  res.status(200).send({ success: true, data: database.sales });
});

app.post('/api/v1/sales', (req, res) => {
  const newSale = { 
    id: 'SALE-' + Math.random().toString(36).substr(2, 5).toUpperCase(), 
    ...req.body, 
    status: 'COMPLETED',
    total: 0, // O front pode calcular ou enviar
    createdAt: new Date().toISOString() 
  };
  database.sales.push(newSale);
  res.status(201).send({ success: true, data: newSale });
});

// --- PRODUTOS (Para o seletor de produtos não dar erro 404) ---
app.get('/api/v1/products', (req, res) => {
  res.status(200).send({ success: true, data: database.products });
});

app.listen(port, () => {
  console.log(`🚀 Backend Sincronizado com Vendas e Clientes!`);
});
// Rota para Atualizar Cliente (PUT)
app.put('/api/v1/crm/customers/:id', (req, res) => {
  const { id } = req.params;
  const index = database.customers.findIndex(c => c.id === id);
  if (index !== -1) {
    database.customers[index] = { ...database.customers[index], ...req.body };
    return res.status(200).send({ success: true, data: database.customers[index] });
  }
  res.status(404).send({ success: false, message: "Cliente não encontrado" });
});