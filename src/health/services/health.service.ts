import { Injectable, Logger } from '@nestjs/common';
import { OttoscalerService } from '../../integrations/grpc/ottoscaler.service';
import type { OttoscalerHealthDto } from '../dtos';

/**
 * HealthService는 Ottoscaler의 건강 상태를 확인합니다.
 *
 * 주요 기능:
 * - Ottoscaler gRPC 연결 상태 확인
 * - 워커 팟 상태 정보 수집
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly ottoscalerService: OttoscalerService) {}

  /**
   * Ottoscaler의 건강 상태를 확인합니다.
   * gRPC를 통해 GetWorkerStatus를 호출하여 연결 상태를 확인합니다.
   *
   * @returns Ottoscaler 헬스체크 결과
   */
  async checkOttoscalerHealth(): Promise<OttoscalerHealthDto> {
    const startTime = Date.now();

    try {
      // GetWorkerStatus를 호출하여 연결 상태 확인
      // 빈 요청을 보내면 전체 워커 상태를 반환
      const response = await this.ottoscalerService.getWorkerStatus({
        taskId: '', // 빈 값이면 전체 조회
        workerPodName: '',
        statusFilter: '',
      });

      const responseTime = Date.now() - startTime;

      this.logger.log(`Ottoscaler health check completed in ${responseTime}ms`);
      this.logger.debug(`Worker status: ${JSON.stringify(response)}`);

      return {
        connected: true,
        status: 'healthy',
        responseTime,
        workerStatus: {
          totalCount: response.totalCount || 0,
          runningCount: response.runningCount || 0,
          pendingCount: response.pendingCount || 0,
          succeededCount: response.succeededCount || 0,
          failedCount: response.failedCount || 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Failed to connect to Ottoscaler:', error);

      return {
        connected: false,
        status: 'unhealthy',
        responseTime,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to connect to Ottoscaler gRPC service',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
