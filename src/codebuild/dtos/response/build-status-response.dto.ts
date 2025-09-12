import type { StatusType } from '@aws-sdk/client-codebuild';

export interface BuildStatusResponseDto {
  /** 빌드 ID */
  buildId: string;

  /** 현재 빌드 상태 */
  status: StatusType;

  /** 현재 단계 */
  currentPhase?: string;

  /** 진행률 (0-100) */
  progressPercent?: number;

  /** 프로젝트명 */
  projectName: string;

  /** 파이프라인 정보 */
  pipelineInfo: {
    pipelineId: string;
    pipelineType: string;
    environment: string;
  };

  /** 소스 정보 */
  sourceInfo?: {
    version: string;
    type: string;
    location?: string;
  };

  /** 시간 정보 */
  timeInfo: {
    /** 제출 시간 */
    submitTime?: Date;
    /** 시작 시간 */
    startTime?: Date;
    /** 종료 시간 */
    endTime?: Date;
    /** 총 소요시간 (초) */
    durationInSeconds?: number;
  };

  /** 로그 정보 */
  logInfo?: {
    /** CloudWatch 로그 그룹명 */
    groupName: string;
    /** CloudWatch 로그 스트림명 */
    streamName: string;
    /** 로그 URL */
    deepLink?: string;
  };

  /** 빌드 아티팩트 정보 */
  artifacts?: Array<{
    location: string;
    type: string;
  }>;

  /** 에러 정보 (실패 시) */
  errorInfo?: {
    message: string;
    type: string;
  };
}
