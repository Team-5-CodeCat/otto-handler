import { Controller, HttpStatus } from '@nestjs/common';
import { TypedRoute, TypedException } from '@nestia/core';
import { OttoscalerService } from './ottoscaler.service';
import type { CommonErrorResponseDto } from '../../common/dto';

@Controller('health')
export class HealthController {
  constructor(private readonly ottoscalerService: OttoscalerService) {}

  /**
   * @tag health
   * @summary Ottoscaler 연결 상태 확인
   * @description Ottoscaler gRPC 서버와의 연결 상태를 확인합니다
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Ottoscaler 서비스에 연결할 수 없음',
  })
  @TypedRoute.Get('/ottoscaler')
  async checkOttoscalerHealth() {
    try {
      // Ottoscaler의 worker status를 조회하여 연결 확인
      const response = await this.ottoscalerService.getWorkerStatus({
        taskId: '', // 전체 조회
        workerPodName: '', // 전체 조회
        statusFilter: '', // 전체 상태 조회
      });

      return {
        status: 'healthy',
        service: 'ottoscaler',
        timestamp: new Date().toISOString(),
        details: {
          connected: true,
          activeWorkers: response.workers?.length || 0,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'ottoscaler',
        timestamp: new Date().toISOString(),
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * @tag health
   * @summary 전체 시스템 상태 확인
   * @description Backend 서비스와 연결된 모든 외부 서비스의 상태를 확인합니다
   */
  @TypedRoute.Get('/system')
  async checkSystemHealth() {
    const checks = await Promise.allSettled([
      this.checkOttoscalerHealth(),
      // 필요시 다른 서비스들 추가 (Redis, Database 등)
    ]);

    const ottoscalerCheck =
      checks[0].status === 'fulfilled' ? checks[0].value : null;

    const allHealthy = ottoscalerCheck?.status === 'healthy';

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        ottoscaler: ottoscalerCheck,
      },
    };
  }
}
