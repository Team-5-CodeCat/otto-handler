import { Controller, HttpStatus, Logger } from '@nestjs/common';
import { TypedRoute, TypedException } from '@nestia/core';
import { HealthService } from '../services/health.service';
import type { CommonErrorResponseDto } from '../../common/dto';
import type { OttoscalerHealthDto } from '../dtos';

/**
 * HealthController는 시스템 전체의 건강 상태를 확인하는 엔드포인트를 제공합니다.
 *
 * 현재 지원하는 헬스체크:
 * - API 서버 자체 상태
 * - Ottoscaler gRPC 연결 상태
 * - (향후 추가 예정: Database, Redis 등)
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  /**
   * @tag health
   * @summary Ottoscaler 헬스체크
   * @description Ottoscaler gRPC 서비스의 연결 상태와 워커 정보를 확인합니다
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Ottoscaler 서비스에 연결할 수 없음',
  })
  @TypedRoute.Get('/ottoscaler')
  async checkOttoscalerHealth(): Promise<OttoscalerHealthDto> {
    this.logger.log('Ottoscaler health check requested');
    return this.healthService.checkOttoscalerHealth();
  }
}
