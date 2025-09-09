/**
 * 개별 서비스의 헬스 상태를 나타내는 DTO
 */
export interface ServiceHealthDto {
  /** 서비스 이름 */
  name: string;

  /** 서비스 상태 (healthy, unhealthy, degraded) */
  status: 'healthy' | 'unhealthy' | 'degraded';

  /** 응답 시간 (ms) */
  responseTime?: number;

  /** 추가 메시지 */
  message?: string;

  /** 상태 체크 시간 */
  checkedAt: string;
}

/**
 * 전체 시스템 헬스체크 응답 DTO
 */
export interface HealthCheckResponseDto {
  /** 전체 시스템 상태 */
  status: 'healthy' | 'unhealthy' | 'degraded';

  /** API 서버 버전 */
  version?: string;

  /** 서버 가동 시간 (초) */
  uptime: number;

  /** 각 서비스별 상태 */
  services: ServiceHealthDto[];

  /** 체크 시간 */
  timestamp: string;
}

/**
 * Ottoscaler 헬스체크 응답 DTO
 */
export interface OttoscalerHealthDto {
  /** 연결 상태 */
  connected: boolean;

  /** gRPC 서비스 상태 */
  status: 'healthy' | 'unhealthy';

  /** 응답 시간 (ms) */
  responseTime: number;

  /** 워커 상태 정보 */
  workerStatus?: {
    /** 전체 워커 수 */
    totalCount: number;

    /** 실행 중인 워커 수 */
    runningCount: number;

    /** 대기 중인 워커 수 */
    pendingCount: number;

    /** 성공한 워커 수 */
    succeededCount: number;

    /** 실패한 워커 수 */
    failedCount: number;
  };

  /** 에러 메시지 (연결 실패 시) */
  error?: string;

  /** 체크 시간 */
  timestamp: string;
}
