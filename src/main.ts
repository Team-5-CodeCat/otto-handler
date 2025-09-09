import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { NestiaSwaggerComposer } from '@nestia/sdk';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
    }),
  );

  // Enable CORS
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://codecat-otto.shop', 'https://www.codecat-otto.shop']
        : [process.env.FRONTEND_URL || 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'Accept',
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    const document = await NestiaSwaggerComposer.document(app, {
      openapi: '3.1',
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 4000}/api/v1`,
          description: 'Localhost',
        },
      ],
      security: {
        bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
    });

    SwaggerModule.setup('docs', app, document as OpenAPIObject);
  }

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret',
  });

  // 정적 파일 서빙 (개발 환경에서만)
  if (process.env.NODE_ENV !== 'production') {
    await app.register(fastifyStatic, {
      root: join(__dirname, '..'), // 프로젝트 루트 디렉토리
      prefix: '/', // 루트 경로에서 접근 가능
      decorateReply: false, // 기본 설정
    });
  }

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'docs', 'test-sse.html'],
  });
  await app.listen(Number(process.env.PORT) || 4000, '0.0.0.0');
}
void bootstrap();
