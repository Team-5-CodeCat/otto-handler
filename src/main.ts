import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
    }),
  );
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret',
  });

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4001', // 백엔드 포트
      'http://localhost:56552', // 프론트엔드 포트
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:4001',
      'http://127.0.0.1:56552',
      // Docker 환경에서 프론트엔드 접근 허용
      'http://magical_brown:3000',
      'http://frontend:3000',
      'http://otto-frontend:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Otto API')
    .setDescription('Otto 서비스 API 명세')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 4001, '0.0.0.0');
}
void bootstrap();
