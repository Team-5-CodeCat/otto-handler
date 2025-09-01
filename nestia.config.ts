// nestia.config.ts
import { INestiaConfig } from '@nestia/sdk';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

const NESTIA_CONFIG: INestiaConfig = {
  input: async () => {
    const app = await NestFactory.create(AppModule);
    // app.setGlobalPrefix("api");
    // app.enableVersioning({
    //   type: VersioningType.URI,
    //   prefix: "v",
    // });
    return app;
  },
  output: '../otto-sdk/sdk',
  distribute: '../otto-sdk', // GitHub Packages로 배포할 SDK
  clone: true,

  swagger: {
    output: 'dist/swagger.json', // Swagger 파일 출력 경로
    openapi: '3.1', // OpenAPI 버전
    beautify: true, // JSON 포맷팅

    // API 정보 (package.json에서 자동으로 가져옴)
    info: {
      title: 'Your API',
      description: 'Auto-generated API documentation with Nestia',
    },

    // 서버 설정
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],

    // 보안 스키마 정의
    security: {
      bearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      basic: {
        type: 'http',
        scheme: 'basic',
      },
      // API Key 방식
      apiKey: {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
    },
    /*
    tags: [
      {
        name: 'auth',
        description: 'Authentication related endpoints',
      },
      {
        name: 'users',
        description: 'User management endpoints',
      },
      {
        name: 'articles',
        description: 'Article CRUD operations',
      },
    ],*/

    // Query DTO 분해 여부
    decompose: true, // true면 쿼리 파라미터를 개별적으로 분해
  },
};

export default NESTIA_CONFIG;
