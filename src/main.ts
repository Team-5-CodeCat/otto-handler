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
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
    }),
  );

  // Enable CORS for production - Fixed to properly handle credentials
  app.enableCors({
    origin: (origin, callback) => {
      // Allow specific origins in production
      const allowedOrigins = [
        'https://codecat-otto.shop',
        'https://www.codecat-otto.shop',
      ];

      if (process.env.NODE_ENV !== 'production') {
        // Allow all origins in development
        callback(null, true);
      } else if (!origin || allowedOrigins.includes(origin)) {
        // Allow requests with no origin (like mobile apps) or allowed origins
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400, // 24 hours
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
