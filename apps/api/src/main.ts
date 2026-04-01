import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // 보안 헤더 (X-Content-Type-Options, X-Frame-Options, HSTS 등)
  app.use(helmet({
    contentSecurityPolicy: false,  // Swagger UI 호환
  }));

  // Body size limit: 1MB (초대형 페이로드 방지)
  app.use(require('express').json({ limit: '1mb' }));

  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  });

  const swagger = new DocumentBuilder()
    .setTitle('Prompt Guard API')
    .setDescription('관리자 룰 관리 및 활성 룰 배포 API')
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-admin-key', in: 'header' },
      'x-admin-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, document);

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3000);

  await app.listen(port);
  console.log(`✅ Prompt Guard API 실행 중 → http://localhost:${port}`);
  console.log(`📄 Swagger 문서 → http://localhost:${port}/docs`);
}

bootstrap();