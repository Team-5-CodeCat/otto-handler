import type { PipelineFlowData } from '../common/pipeline-flow-data.dto';

export interface UpdatePipelineRequestDto<T = Record<string, any>> {
  /**
   * 파이프라인 이름
   */
  name?: string;

  /**
   * 파이프라인 설명
   */
  description?: string;

  /**
   * React Flow 파이프라인 데이터 (노드, 엣지, 설정 포함)
   */
  pipelineData?: PipelineFlowData<T> | null;

  /**
   * 활성화 여부
   */
  isActive?: boolean;
}
