import type { PipelineFlowData } from '../common/pipeline-flow-data.dto';

/**
 * JSON to buildspec.yaml 변환 응답 DTO
 */
export interface JsonToBuildSpecResponseDto {
  /**
   * 생성된 buildspec.yaml 내용
   */
  buildSpecYaml: string;

  /**
   * 변환 성공 여부
   */
  success: boolean;

  /**
   * 변환된 노드 개수
   */
  nodesProcessed: number;
}

/**
 * buildspec.yaml to JSON 변환 응답 DTO
 */
export interface BuildSpecToJsonResponseDto {
  /**
   * 변환된 React Flow 파이프라인 데이터
   */
  pipelineData: PipelineFlowData<any>;

  /**
   * 변환 성공 여부
   */
  success: boolean;

  /**
   * 생성된 노드 개수
   */
  nodesGenerated: number;
}
