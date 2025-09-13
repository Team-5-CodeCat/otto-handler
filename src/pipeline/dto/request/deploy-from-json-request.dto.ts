import { tags } from 'typia';
import type { PipelineFlowData } from '../common/pipeline-flow-data.dto';

/**
 * JSON 파이프라인을 직접 배포하는 요청 DTO
 */
export interface DeployFromJsonRequestDto {
  /**
   * React Flow 파이프라인 데이터
   */
  pipelineData: PipelineFlowData;

  /**
   * 프로젝트 ID
   */
  projectId: string & tags.Format<'uuid'>;

  /**
   * 환경 (선택, 기본값: development)
   */
  environment?: 'development' | 'staging' | 'production';

  /**
   * 파이프라인 타입 (선택, 기본값: build)
   */
  pipelineType?: 'build' | 'test' | 'deploy';

  /**
   * 소스 버전 (브랜치 또는 커밋, 선택)
   */
  sourceVersion?: string & tags.MinLength<1>;

  /**
   * 빌드 타임아웃 (분, 선택)
   */
  timeoutInMinutes?: number &
    tags.Type<'int32'> &
    tags.Minimum<5> &
    tags.Maximum<480>;

  /**
   * 커스텀 환경변수 (선택)
   */
  customEnvironmentVariables?: Array<{
    name: string & tags.MinLength<1>;
    value: string;
    type?: 'PLAINTEXT' | 'PARAMETER_STORE' | 'SECRETS_MANAGER';
  }>;
}
