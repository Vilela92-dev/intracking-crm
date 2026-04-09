import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import { resolve } from 'path';


export default defineConfig({
  earlyAccess: true,
  datasource: {
    // Usamos o process.env e adicionamos um fallback para debug
    url: process.env.DATABASE_URL
  },
});