// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

// Configuração manual para evitar o erro de inicialização do Prisma 7 no Windows
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'file:./dev.db' },
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => 
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n--- 🚀 INTRACKING CRM: NOVO TENANT ---');

  try {
    const tenantName = await question('Nome do Ateliê/Empresa: ');
    const adminName = await question('Nome do Administrador: ');
    const adminEmail = await question('Email de Login: ');
    const adminPass = await question('Senha: ');

    console.log('\n⏳ Criando ambiente...');

    const passwordHash = await bcrypt.hash(adminPass, 10);

    // Criação Atômica: Tenant + User + Settings
    const newTenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        settings: {
          create: {
            atelierName: tenantName,
            primaryColor: '#4f46e5',
          }
        },
        users: {
          create: {
            name: adminName,
            email: adminEmail,
            password: passwordHash,
            role: 'ADMIN'
          }
        }
      }
    });

    console.log('\n✅ SUCESSO!');
    console.log(`Empresa: ${newTenant.name}`);
    console.log(`ID do Tenant: ${newTenant.id}`);
    console.log(`Login: ${adminEmail}\n`);

  } catch (error) {
    console.error('\n❌ Erro ao criar tenant:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();