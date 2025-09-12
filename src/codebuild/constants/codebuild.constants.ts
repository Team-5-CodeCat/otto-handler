import type { ComputeType } from '@aws-sdk/client-codebuild';
import type { ProjectNaming } from '../types/codebuild.types';

/**
 * CodeBuild 관련 상수들
 */
export const CODEBUILD_CONSTANTS = {
  /** 프로젝트명 접두사 */
  PROJECT_PREFIX: 'otto',

  /** 기본 빌드 타임아웃 (분) */
  DEFAULT_TIMEOUT_MINUTES: 60,

  /** 기본 Docker 이미지 */
  DEFAULT_IMAGE: 'aws/codebuild/standard:7.0',

  /** 기본 컴퓨팅 타입 */
  DEFAULT_COMPUTE_TYPE: 'BUILD_GENERAL1_MEDIUM' as ComputeType,

  /** 환경 타입 */
  ENVIRONMENT_TYPE: 'LINUX_CONTAINER' as const,

  /** 소스 타입 */
  SOURCE_TYPE: 'GITHUB' as const,

  /** 아티팩트 타입 */
  ARTIFACTS_TYPE: 'S3' as const,

  /** 기본 buildspec 파일명 */
  DEFAULT_BUILDSPEC: 'buildspec.yml',
} as const;

/**
 * 파이프라인 타입별 컴퓨팅 리소스 매핑
 */
export const COMPUTE_TYPE_BY_PIPELINE: Record<string, ComputeType> = {
  test: 'BUILD_GENERAL1_SMALL', // 테스트는 작은 인스턴스
  build: 'BUILD_GENERAL1_MEDIUM', // 빌드는 중간 인스턴스
  deploy: 'BUILD_GENERAL1_LARGE', // 배포는 큰 인스턴스
} as const;

/**
 * 환경별 Docker 이미지 매핑
 */
export const DOCKER_IMAGES = {
  nodejs: 'aws/codebuild/standard:7.0', // Node.js 18, Python 3.11 등
  python: 'aws/codebuild/standard:7.0', // Python 지원
  java: 'aws/codebuild/amazonlinux2-x86_64-standard:corretto17', // Java 17
  dotnet: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0', // .NET
  ubuntu: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0', // 일반적인 Linux
} as const;

/**
 * 기본 환경변수들
 */
export const DEFAULT_ENVIRONMENT_VARIABLES = [
  {
    name: 'CODEBUILD_PROJECT_TYPE',
    value: 'OTTO_HANDLER',
    type: 'PLAINTEXT' as const,
  },
  {
    name: 'CI',
    value: 'true',
    type: 'PLAINTEXT' as const,
  },
] as const;

/**
 * 기본 buildspec 템플릿
 */
export const DEFAULT_BUILDSPEC_TEMPLATE = `version: 0.2

env:
  variables:
    PIPELINE_ID: \${PIPELINE_ID}
    ENVIRONMENT: \${ENVIRONMENT}
    PIPELINE_TYPE: \${PIPELINE_TYPE}

phases:
  pre_build:
    commands:
      - echo "Pipeline \${PIPELINE_ID} started on branch \${CODEBUILD_SOURCE_VERSION}"
      - echo "Environment: \${ENVIRONMENT}, Type: \${PIPELINE_TYPE}"
      
  build:
    commands:
      - echo "Build started on \`date\`"
      - echo "Running build for \${ENVIRONMENT} environment..."
      - |
        if [ "\${PIPELINE_TYPE}" = "test" ]; then
          echo "Running tests..."
          # 테스트 명령어 실행
          sleep 5
        elif [ "\${PIPELINE_TYPE}" = "build" ]; then
          echo "Building application..."
          # 빌드 명령어 실행
          sleep 10
        elif [ "\${PIPELINE_TYPE}" = "deploy" ]; then
          echo "Deploying to \${ENVIRONMENT}..."
          # 배포 명령어 실행
          sleep 15
        fi
        
  post_build:
    commands:
      - echo "Build completed on \`date\`"
      - echo "Pipeline \${PIPELINE_ID} finished successfully"

artifacts:
  files:
    - '**/*'
  name: \${PIPELINE_ID}-\${CODEBUILD_BUILD_ID}
`;

/**
 * 프로젝트 네이밍 유틸리티
 */
export const PROJECT_NAMING: ProjectNaming = {
  /**
   * 프로젝트명 생성
   */
  generateProjectName(
    userId: string,
    projectId: string,
    suffix: string = 'build',
  ): string {
    return `${CODEBUILD_CONSTANTS.PROJECT_PREFIX}-${userId}-${projectId}-${suffix}`;
  },

  /**
   * 프로젝트명에서 정보 추출
   */
  parseProjectName(projectName: string) {
    const parts = projectName.split('-');
    if (parts.length < 4 || parts[0] !== CODEBUILD_CONSTANTS.PROJECT_PREFIX) {
      return null;
    }

    return {
      userId: parts[1],
      projectId: parts[2],
      suffix: parts.slice(3).join('-'),
    };
  },
};

/**
 * 에러 메시지들
 */
export const CODEBUILD_ERROR_MESSAGES = {
  PROJECT_NOT_FOUND: '코드빌드 프로젝트를 찾을 수 없습니다',
  BUILD_NOT_FOUND: '빌드를 찾을 수 없습니다',
  BUILD_START_FAILED: '빌드 시작에 실패했습니다',
  BUILD_STOP_FAILED: '빌드 중단에 실패했습니다',
  INVALID_PROJECT_NAME: '유효하지 않은 프로젝트명입니다',
  INVALID_PARAMETERS: '잘못된 파라미터입니다',
  AWS_CREDENTIALS_ERROR: 'AWS 자격증명이 올바르지 않습니다',
  PERMISSION_DENIED: 'AWS 권한이 부족합니다',
} as const;
