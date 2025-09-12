import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { ProjectsModule } from './projects/projects.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PipelineModule } from './pipeline/pipeline.module';

/**
 * 환경에 따른 .env 파일 경로 반환
 * @returns 환경별 .env 파일 경로
 */
function getEnvFilePath(): string {
  const env = process.env.NODE_ENV || 'development';

  const envFileMap: Record<string, string> = {
    production: '.env.prod',
    development: '.env.dev',
    test: '.env.test',
  };

  const envFile = envFileMap[env] || '.env.dev';

  console.log(`🔧 환경: ${env}, 설정 파일: ${envFile}`);

  return envFile;
}

@Module({
  imports: [
    // 🗄 데이터베이스 연결 모듈 (전역 모듈)
    PrismaModule,

    // 🔐 사용자 인증 및 권한 관리
    AuthModule,
    UserModule,

    // ⚙️ 환경 설정 (전역 설정)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
    }),

    // 🔴 Redis 연결 (전역 모듈)
    RedisModule.forRoot({
      readyLog: true,
      config: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      },
    }),

    // 📋 비즈니스 로직 모듈들
    ProjectsModule,
    PipelineModule,

    // 🔗 웹훅 관리
    WebhooksModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
