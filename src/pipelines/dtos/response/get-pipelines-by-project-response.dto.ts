import type { PipelineListItemDto } from './pipeline-list-item.dto';

export interface GetPipelinesByProjectResponseDto {
  /**
   * 프로젝트별 파이프라인 목록
   */
  pipelines: PipelineListItemDto[];
}
