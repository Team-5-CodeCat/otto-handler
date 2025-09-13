import { tags } from 'typia';
import type { PipelineFlowData } from '../common/pipeline-flow-data.dto';

/**
 * JSON to buildspec.yaml 변환 요청 DTO
 */
export interface JsonToBuildSpecRequestDto {
  /**
   * React Flow 파이프라인 데이터
   */
  pipelineData: PipelineFlowData;
}

/**
 * buildspec.yaml to JSON 변환 요청 DTO
 */
export interface BuildSpecToJsonRequestDto {
  /**
   * buildspec.yaml 내용
   */
  buildSpecYaml: string & tags.MinLength<1>;
}