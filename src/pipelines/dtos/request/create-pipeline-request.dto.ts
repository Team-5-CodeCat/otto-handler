import { tags } from 'typia';

export interface CreatePipelineRequestDto {
  /**
   * 파이프라인 이름 (1-255자)
   */
  name: string & tags.MinLength<1> & tags.MaxLength<255>;
  /**
   * YAML 파이프라인 설정 내용
   */
  yamlContent: string & tags.MinLength<1>;
  /**
   * 소속 프로젝트 ID (UUID 형식)
   */
  projectID: string & tags.Format<'uuid'>;
  /**
   * 파이프라인 버전
   */
  version: number;
}
