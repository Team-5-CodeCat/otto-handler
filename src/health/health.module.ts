import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { HealthService } from './services/health.service';
import { OttoscalerModule } from '../integrations/grpc/ottoscaler.module';

/**
 * HealthModule은 시스템 헬스체크 기능을 제공합니다.
 *
 * 제공하는 엔드포인트:
 * - GET /api/v1/health - 전체 시스템 상태
 * - GET /api/v1/health/ottoscaler - Ottoscaler 서비스 상태
 */
@Module({
  imports: [
    OttoscalerModule, // gRPC 클라이언트를 위해 import
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService], // 다른 모듈에서도 사용할 수 있도록 export
})
export class HealthModule {}
