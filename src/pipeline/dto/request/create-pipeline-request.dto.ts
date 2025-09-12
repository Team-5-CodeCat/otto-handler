import type { PipelineFlowData } from '../common/pipeline-flow-data.dto';

export interface CreatePipelineRequestDto<T = Record<string, any>> {
  /**
   * 파이프라인 이름
   */
  name: string;

  /**
   * 파이프라인 설명 (선택사항)
   */
  description?: string;

  /**
   * 프로젝트 ID
   */
  projectId: string;

  /**
   * React Flow 파이프라인 데이터 (노드, 엣지, 설정 포함)
   */
  pipelineData: PipelineFlowData<T> | null;

  /**
   * 활성화 여부 (기본값: true)
   */
  isActive?: boolean;
}
