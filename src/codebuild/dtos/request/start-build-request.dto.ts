import { tags } from 'typia';
import type { ComputeType } from '@aws-sdk/client-codebuild';

export interface StartBuildRequestDto {
  /** CodeBuild 프로젝트명 */
  projectName: string & tags.MinLength<1>;

  /** 파이프라인 ID */
  pipelineId: string & tags.MinLength<1>;

  /** 파이프라인명 (선택) */
  pipelineName?: string & tags.MaxLength<100>;

  /** 파이프라인 타입 */
  pipelineType: 'build' | 'test' | 'deploy';

  /** 환경 */
  environment: 'development' | 'staging' | 'production';

  /** 브랜치 또는 커밋 SHA (선택) */
  sourceVersion?: string & tags.MinLength<1>;

  /** 컴퓨팅 타입 (선택) */
  computeType?: ComputeType;

  /** Docker 이미지 (선택) */
  image?: string & tags.MinLength<1>;

  /** 빌드 타임아웃 분 (선택, 기본 60분) */
  timeoutInMinutes?: number &
    tags.Type<'int32'> &
    tags.Minimum<5> &
    tags.Maximum<480>;

  /** 커스텀 환경변수 (선택) */
  customEnvironmentVariables?: Array<{
    name: string & tags.MinLength<1>;
    value: string;
    type?: 'PLAINTEXT' | 'PARAMETER_STORE' | 'SECRETS_MANAGER';
  }>;

  /** buildspec 오버라이드 (선택) */
  buildspecOverride?: string;
}
