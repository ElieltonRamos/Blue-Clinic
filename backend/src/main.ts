/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { version } from '../package.json';

function patchConsoleInfo(): void {
  const originalConsoleInfo = console.info.bind(console);
  console.info = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('Closing session')) {
      const session = args[1] as { registrationId?: number } | undefined;
      originalConsoleInfo(
        `[libsignal] Sessão de criptografia renovada (registrationId: ${session?.registrationId ?? '?'})`,
      );
      return;
    }
    originalConsoleInfo(...args);
  };
}

async function bootstrap() {
  patchConsoleInfo();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const packageVersion = version;

  app.enableCors();

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const appEnvKeys = [
    'PORT',
    'ENVIRONMENT',
    'DATABASE_URL',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'DATABASE_HOST',
    'DATABASE_PORT',
    'JWT_SECRET',
    'LICENSE_PUBLIC_KEY',
    'LICENSING_SERVER',
  ];

  console.log('=== Environment Variables ===');
  appEnvKeys.forEach((key) => {
    const value = process.env[key];
    const isSensitive = ['PASSWORD', 'SECRET', 'TOKEN', 'KEY'].some((s) =>
      key.includes(s),
    );
    console.log(
      `${key}:`,
      value ? (isSensitive ? '***' : value) : 'nao-identificado',
    );
  });
  console.log(
    'PM2 instance:',
    process.env.NODE_APP_INSTANCE ?? 'nao-identificado',
  );
  console.log(`VERSAO SERVIDOR = ${packageVersion}`);
  console.log('=============================');

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Blue-Clinic API')
      .setDescription('API do sistema Blue-Clinic para gestão')
      .setVersion('1.0')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, document);
  }

  await app.listen(process.env.PORT ?? 3003);
}
void bootstrap();
