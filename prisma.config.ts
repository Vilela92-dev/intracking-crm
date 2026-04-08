import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Força a leitura do arquivo .env informando o caminho absoluto
dotenv.config({ path: resolve(process.cwd(), '.env') });

export default defineConfig({
  earlyAccess: true,
  datasource: {
    // Usamos o process.env e adicionamos um fallback para debug
    url: process.env.DATABASE_URL
  },
});