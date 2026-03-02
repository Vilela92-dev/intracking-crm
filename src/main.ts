import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- DEFINIÇÃO DE CLASSES (POO) ---

abstract class Produto {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  abstract category: 'PEÇA' | 'INSUMO';
  abstract unit: 'UN' | 'METROS';

  constructor(data: any) {
    this.id = data.id || Date.now().toString();
    this.name = data.name;
    this.price = Number(data.price);
    this.stock = Number(data.stock);
    this.minStock = Number(data.minStock || 0);
  }

  baixarEstoque(quantidade: number) {
    this.stock -= quantidade;
  }
}

class PecaAcabada extends Produto {
  category: 'PEÇA' = 'PEÇA';
  unit: 'UN' = 'UN';
  tamanho?: string;

  constructor(data: any) {
    super(data);
    this.tamanho = data.tamanho;
  }
}

class Insumo extends Produto {
  category: 'INSUMO' = 'INSUMO';
  unit: 'METROS' = 'METROS';
  largura?: number;

  constructor(data: any) {
    super(data);
    this.largura = Number(data.largura);
  }
}

// --- BANCO DE DADOS EM MEMÓRIA ---

const database = {
  products: [] as Produto[],
  sales: [] as any[],
  customers: [] as any[]
};

// --- ROTAS DE PRODUTOS ---

app.get('/api/v1/products', (req, res) => {
  res.status(200).send({ success: true, data: database.products });
});

app.post('/api/v1/products', (req, res) => {
  const { category } = req.body;
  let novoProduto: Produto;

  if (category === 'INSUMO') {
    novoProduto = new Insumo(req.body);
  } else {
    novoProduto = new PecaAcabada(req.body);
  }

  database.products.push(novoProduto);
  res.status(201).send({ success: true, data: novoProduto });
});

// --- ROTAS DE VENDAS ---

// ROTA GET ADICIONADA: Necessária para carregar a lista de vendas no Frontend
app.get('/api/v1/sales', (req, res) => {
  res.status(200).send({ success: true, data: database.sales });
});

app.post('/api/v1/sales', (req, res) => {
  const { items } = req.body;

  // Lógica POO: Baixa automática de estoque
  items.forEach((item: any) => {
    const produto = database.products.find(p => p.id === item.productId);
    if (produto) {
      const quantidade = Number(item.quantity);
      if (!isNaN(quantidade)) {
        produto.baixarEstoque(quantidade);
      }
    }
  });

  const newSale = { 
    id: `VEND-${Date.now()}`, 
    ...req.body, 
    createdAt: new Date() 
  };

  database.sales.push(newSale);
  res.status(201).send({ success: true, data: newSale });
});

// --- ROTAS DE CLIENTES (CRM) ---

// ... (mantenha o restante do código igual até chegar nas rotas de clientes)

// --- ROTAS DE CLIENTES (CRM) ---

app.get('/api/v1/crm/customers', (req, res) => {
  res.status(200).send({ success: true, data: database.customers });
});

app.post('/api/v1/crm/customers', (req, res) => {
  const novoCliente = { 
    id: Date.now().toString(), 
    ...req.body,
    createdAt: new Date()
  };
  database.customers.push(novoCliente);
  res.status(201).send({ success: true, data: novoCliente });
});

// NOVA ROTA: Edição de Cliente
app.put('/api/v1/crm/customers/:id', (req, res) => {
  const { id } = req.params;
  const index = database.customers.findIndex(c => c.id === id);

  if (index !== -1) {
    // Mescla os dados antigos com os novos
    database.customers[index] = { ...database.customers[index], ...req.body };
    res.status(200).send({ success: true, data: database.customers[index] });
  } else {
    res.status(404).send({ success: false, message: "Cliente não encontrado" });
  }
});

app.listen(port, () => {
  console.log(`
  🚀 Servidor POO Iniciado!
  📡 Endereço: http://localhost:${port}/api/v1
  🛠️  Rotas de Vendas e CRM prontas para o Frontend.
  `);
});