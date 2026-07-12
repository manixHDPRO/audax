import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadRootEnv } from './load-env';
import { resolveJwtSecret } from './common/security/jwt-secret';

loadRootEnv();

async function bootstrap() {
  resolveJwtSecret(process.env.JWT_SECRET, process.env.NODE_ENV);

  const app = await NestFactory.create(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';
  const enableSwagger =
    process.env.ENABLE_SWAGGER === 'true' || !isProduction;

  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
  };
  expressApp.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: isProduction
      ? (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('AUDAX API')
      .setDescription(
        'Plateforme de gestion stratégique des audiences — FARDC',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`AUDAX API running on http://0.0.0.0:${port}/api`);
  if (enableSwagger) {
    console.log(`Swagger: http://0.0.0.0:${port}/api/docs`);
  } else {
    console.log('Swagger désactivé (production). ENABLE_SWAGGER=true pour forcer.');
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start AUDAX API:', error);
  process.exit(1);
});
