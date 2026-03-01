const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Dados em memória
const users = [];
const customers = [];
const products = [];
const sales = [];

// ===== AUTH =====
app.post('/api/v1/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password são obrigatórios' });
  }
  
  const user = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    email,
    role: 'admin',
    companyId: Math.random().toString(36).substr(2, 9)
  };
  
  users.push(user);
  
  res.json({
    data: user,
    message: 'User registered successfully'
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({
    data: {
      accessToken: 'token_' + Math.random().toString(36).substr(2, 9),
      user: user
    },
    message: 'Login successful'
  });
});

// ===== CRM =====
app.post('/api/v1/crm/customers', (req, res) => {
  const { name, email, phone, weddingDate } = req.body;
  
  const customer = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    email,
    phone,
    weddingDate,
    createdAt: new Date()
  };
  
  customers.push(customer);
  
  res.json({
    data: customer,
    message: 'Customer created successfully'
  });
});

app.get('/api/v1/crm/customers', (req, res) => {
  res.json({
    data: customers,
    message: 'Customers retrieved successfully'
  });
});

// ===== PRODUCTS =====
app.post('/api/v1/products', (req, res) => {
  const { name, sku, type, price, description } = req.body;
  
  const product = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    sku,
    type,
    price,
    description,
    createdAt: new Date()
  };
  
  products.push(product);
  
  res.json({
    data: product,
    message: 'Product created successfully'
  });
});

app.get('/api/v1/products', (req, res) => {
  res.json({
    data: products,
    message: 'Products retrieved successfully'
  });
});

// ===== SALES =====
app.post('/api/v1/sales', (req, res) => {
  const { customerId, items, paymentMethod, channel } = req.body;
  
  const sale = {
    id: Math.random().toString(36).substr(2, 9),
    customerId,
    items,
    paymentMethod,
    channel,
    total: items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
    status: 'completed',
    createdAt: new Date()
  };
  
  sales.push(sale);
  
  res.json({
    data: sale,
    message: 'Sale created successfully'
  });
});

app.get('/api/v1/sales', (req, res) => {
  res.json({
    data: sales,
    message: 'Sales retrieved successfully'
  });
});

// ===== HEALTH =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Application started successfully on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}` );
  console.log(`\nEndpoints disponíveis:`);
  console.log(`POST   /api/v1/auth/register`);
  console.log(`POST   /api/v1/auth/login`);
  console.log(`POST   /api/v1/crm/customers`);
  console.log(`GET    /api/v1/crm/customers`);
  console.log(`POST   /api/v1/products`);
  console.log(`GET    /api/v1/products`);
  console.log(`POST   /api/v1/sales`);
  console.log(`GET    /api/v1/sales`);
});
