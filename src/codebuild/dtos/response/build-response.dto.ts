import type { StatusType } from '@aws-sdk/client-codebuild';

export interface BuildResponseDto {
  /** 빌드 ID */
  buildId: string;

  /** 빌드 상태 */
  status: StatusType;

  /** 프로젝트명 */
  projectName: string;

  /** 파이프라인 ID */
  pipelineId: string;

  /** 파이프라인 타입 */
  pipelineType: string;

  /** 환경 */
  environment: string;

  /** 소스 버전 (브랜치/커밋) */
  sourceVersion?: string;

  /** 시작 시간 */
  startTime?: Date;

  /** 종료 시간 */
  endTime?: Date;

  /** CloudWatch 로그 그룹 */
  logGroup?: string;

  /** CloudWatch 로그 스트림 */
  logStream?: string;
}
