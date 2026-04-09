// @ts-nocheck
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * INTRACKING - SaaS MASTER ADMIN
 * Este servidor é responsável por criar novos Tenants e Administradores.
 */

const prisma = new PrismaClient({
  datasource: {
    url: 'file:./prisma/dev.db',
  },
});

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PORT = 3001;
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

// Middleware que protege todas as rotas do servidor admin
const adminAuthMiddleware = (req: any, res: any, next: any) => {
  if (!ADMIN_SECRET) {
    console.warn('⚠️  ADMIN_SECRET não definido! Configure no .env');
    return res.status(500).json({ error: 'Servidor admin não configurado corretamente.' });
  }
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }
  next();
};

app.use(adminAuthMiddleware);

// Rota para criar um novo Ateliê (Empresa + Admin + Config)
app.post('/api/admin/onboarding', async (req, res) => {
  const { tenantName, adminName, email, password, primaryColor } = req.body;

  try {
    console.log(`[ONBOARDING] Iniciando criação para: ${tenantName}`);
    
    const passwordHash = await bcrypt.hash(password, 10);

    // Operação Atômica no Prisma
    const newTenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        plan: 'FREE',
        settings: {
          create: {
            atelierName: tenantName,
            primaryColor: primaryColor || '#4f46e5',
          }
        },
        users: {
          create: {
            name: adminName,
            email: email,
            password: passwordHash,
            role: 'ADMIN'
          }
        }
      }
    });

    // Link que você enviaria para o cliente acessar o sistema
    const accessLink = `http://localhost:5173/login?tenantId=${newTenant.id}&email=${email}`;

    res.status(201).json({
      message: "Ateliê criado com sucesso!",
      data: {
        tenantId: newTenant.id,
        accessLink: accessLink
      }
    });

    console.log(`✅ Tenant ${newTenant.id} criado com sucesso.`);

  } catch (error) {
    console.error('❌ Erro no Onboarding:', error);
    res.status(400).json({ error: "Erro ao criar. Verifique se o e-mail já está cadastrado." });
  }
});

app.listen(ADMIN_PORT, () => {
  console.log('--------------------------------------------------');
  console.log(`🛡️  SaaS ADMIN MASTER RODANDO NA PORTA: ${ADMIN_PORT}`);
  console.log(`🚀 Use esta porta para criar novos clientes.`);
  console.log('--------------------------------------------------');
});