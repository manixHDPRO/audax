import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  const isProduction = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProduction ? (process.env.CORS_ORIGIN ?? 'http://localhost:3000') : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('AUDAX API')
    .setDescription('Plateforme de gestion stratégique des audiences — FARDC')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🛡️  AUDAX API running on http://0.0.0.0:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('Failed to start AUDAX API:', error);
  process.exit(1);
});
