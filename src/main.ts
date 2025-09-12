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
import { AllExceptionsFilter } from './common/filters/custom-exception.filter';
import { PrismaService } from './database/prisma.service';
import { RedisService } from '@liaoliaots/nestjs-redis';

/**
 * 데이터베이스 연결 상태를 확인합니다.
 * PostgreSQL과 Redis 연결을 ping하여 상태를 검증합니다.
 */
async function checkDatabaseConnections(
  app: NestFastifyApplication,
): Promise<void> {
  console.log('🔍 데이터베이스 연결 상태를 확인합니다...');

  try {
    // PostgreSQL 연결 확인
    const prismaService = app.get(PrismaService);
    await prismaService.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL 연결 성공');
  } catch (error) {
    console.error(
      '❌ PostgreSQL 연결 실패:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  try {
    // Redis 연결 확인
    const redisService = app.get(RedisService);
    const redis = redisService.getOrThrow();
    const pong = await redis.ping();
    console.log(`✅ Redis 연결 성공 (응답: ${pong})`);
  } catch (error) {
    console.error(
      '❌ Redis 연결 실패:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  console.log('🎉 모든 데이터베이스 연결이 정상입니다!\n');
}

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV !== 'production',
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
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
          url: `http://localhost:${process.env.OTTO_HANDLER_SERVER_PORT || 4000}/api/v1`,
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
      root: join(__dirname, '..', 'test-oauth'), // test-oauth 디렉토리
      prefix: '/test-oauth/', // /test-oauth/ 경로에서 접근 가능
      decorateReply: false, // 기본 설정
    });
  }
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'docs', 'test-sse.html'],
  });

  // 🔍 데이터베이스 연결 상태 확인
  await checkDatabaseConnections(app);

  await app.listen(
    Number(process.env.OTTO_HANDLER_SERVER_PORT) || 4000,
    '0.0.0.0',
  );
}
void bootstrap();
