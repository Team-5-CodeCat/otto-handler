import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';

import { NestiaSwaggerComposer } from '@nestia/sdk';
import { SwaggerModule } from '@nestjs/swagger';


async function bootstrap() {

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
    }),
  );
  if (process.env.NODE_ENV !== 'production') {
    const document = await NestiaSwaggerComposer.document(app, {
      openapi: '3.1',
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 4000}`,
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

    SwaggerModule.setup('docs', app, document as any);
  }

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret',
  });

  
  // 글로벌 프리픽스 설정
  app.setGlobalPrefix('api', {
    exclude: ['health', 'docs'],
  });


  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

  // CORS 설정
  app.enableCors({
    origin: ['http://otto-frontend:3004','http://localhost:3004'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  await app.listen(Number(process.env.PORT) || 3000, '0.0.0.0');

}
void bootstrap();
