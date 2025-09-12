import type { StatusType, ComputeType } from '@aws-sdk/client-codebuild';

/**
 * CodeBuild 프로젝트 생성에 필요한 기본 정보
 */
export interface CodeBuildProjectConfig {
  /** 프로젝트명 */
  name: string;
  /** 프로젝트 설명 */
  description?: string;
  /** 소스 타입 (기본: GITHUB) */
  sourceType?: 'GITHUB' | 'CODECOMMIT' | 'S3' | 'NO_SOURCE';
  /** GitHub 소스 위치 */
  sourceLocation?: string;
  /** buildspec 파일 내용 */
  buildspec?: string;
  /** 서비스 역할 ARN */
  serviceRole: string;
  /** 아티팩트 S3 버킷 */
  artifactsBucket?: string;
}

/**
 * 빌드 실행 시 오버라이드 설정
 */
export interface BuildOverrides {
  /** 소스 버전 (브랜치 또는 커밋 SHA) */
  sourceVersion?: string;
  /** 환경변수 오버라이드 */
  environmentVariables?: EnvironmentVariable[];
  /** 컴퓨팅 타입 오버라이드 */
  computeType?: ComputeType;
  /** Docker 이미지 오버라이드 */
  image?: string;
  /** 빌드 타임아웃 (분) */
  timeoutInMinutes?: number;
  /** buildspec 오버라이드 */
  buildspecOverride?: string;
}

/**
 * 환경변수 정의
 */
export interface EnvironmentVariable {
  /** 환경변수명 */
  name: string;
  /** 환경변수값 */
  value: string;
  /** 타입 */
  type?: 'PLAINTEXT' | 'PARAMETER_STORE' | 'SECRETS_MANAGER';
}

/**
 * 파이프라인 정보
 */
export interface PipelineInfo {
  /** 파이프라인 ID */
  pipelineId: string;
  /** 파이프라인명 */
  pipelineName?: string;
  /** 파이프라인 타입 */
  pipelineType: 'build' | 'test' | 'deploy';
  /** 환경 */
  environment: 'development' | 'staging' | 'production';
  /** 프로젝트 ID */
  projectId: string;
  /** 사용자 ID */
  userId: string;
}

/**
 * 빌드 상태 정보
 */
export interface BuildStatusInfo {
  /** 빌드 ID */
  buildId: string;
  /** 빌드 상태 */
  status: StatusType;
  /** 시작 시간 */
  startTime?: Date;
  /** 종료 시간 */
  endTime?: Date;
  /** 소스 버전 */
  sourceVersion?: string;
  /** 파이프라인 정보 */
  pipelineInfo?: {
    pipelineId: string;
    environment: string;
    pipelineType: string;
  };
}

/**
 * CodeBuild 프로젝트 네이밍 컨벤션
 */
export interface ProjectNaming {
  /** 프로젝트명 생성 */
  generateProjectName(
    userId: string,
    projectId: string,
    suffix?: string,
  ): string;
  /** 프로젝트명에서 정보 추출 */
  parseProjectName(projectName: string): {
    userId: string;
    projectId: string;
    suffix?: string;
  } | null;
}
