import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module'; // Importante: verifique se este arquivo existe na /src

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Habilita o CORS (essencial para o Front-end conseguir acessar a API)
  app.enableCors();

  // 2. Configura a validação automática de dados que chegam da API
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 3. Inicia o servidor na porta 3000
  const port = 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap().catch(console.error);