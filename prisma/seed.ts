// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * INTRACKING CRM - Script de Seed Inicial
 * Objetivo: Criar o primeiro Tenant (Empresa) e o Usuário Administrador.
 */

// Deixamos vazio para ele ler do prisma.config.ts ou injetamos via datasourceUrl (padrão Prisma 7)
// No seu prisma/seed.ts
// No seu prisma/seed.ts
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10); // Senha padrão inicial

  console.log('🌱 Iniciando cadastro do primeiro acesso (Esposa)...');

  // Usamos UPSERT para que o script possa ser rodado várias vezes sem dar erro de duplicata
  const wifeTenant = await prisma.tenant.upsert({
    where: { id: 'tenant-esposa-id' },
    update: {},
    create: {
      id: 'tenant-esposa-id',
      name: 'Ateliê da Esposa',
      plan: 'FREE',
      // Criamos as configurações visuais do ateliê
      settings: {
        create: {
          atelierName: 'Ateliê da Esposa',
          primaryColor: '#4f46e5', // Cor padrão (Índigo)
          tenantId: 'tenant-esposa-id' // Garantindo o vínculo manual se necessário
        },
      },
      // Criamos o usuário administrador vinculado a esta empresa
      users: {
        create: {
          email: 'esposa@teste.com',
          name: 'Esposa',
          password: passwordHash,
          role: 'ADMIN',
        },
      },
    },
  });

  console.log('--------------------------------------------------');
  console.log('✅ SEED EXECUTADO COM SUCESSO');
  console.log(`Empresa: ${wifeTenant.name}`);
  console.log(`Usuário: esposa@teste.com`);
  console.log('Senha: 123456');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });