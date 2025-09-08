import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { NestiaSwaggerComposer } from '@nestia/sdk';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV !== 'production',
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  // Configure CORS for production
  const allowedOrigins = [
    'https://codecat-otto.shop',
    'https://www.codecat-otto.shop',
  ];

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
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
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'docs'],
  });
  await app.listen(Number(process.env.PORT) || 4000, '0.0.0.0');
}
void bootstrap();
