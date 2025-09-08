import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { ProjectsModule } from './projects/projects.module';
import { OttoscalerModule } from './integrations/grpc/ottoscaler.module';
import { LogStreamingModule } from './modules/log-streaming/log-streaming.module';

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
      envFilePath: '.env',
    }),
    
    // 📋 비즈니스 로직 모듈들
    ProjectsModule,
    
    // 🔗 외부 시스템 연동
    OttoscalerModule,  // gRPC 통신 (Ottoscaler)
    
    // 🔄 실시간 로그 스트리밍 (새로 추가)
    // 💼 비즈니스 가치: CI/CD 파이프라인의 실시간 로그 모니터링
    // 🔧 기술 스택: gRPC + SSE + WebSocket
    LogStreamingModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
