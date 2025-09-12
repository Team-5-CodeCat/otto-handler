export interface CreatePipelineResponseDto {
  /**
   * 파이프라인 고유 ID
   */
  id: string;
  /**
   * 파이프라인 이름
   */
  name: string;
  /**
   * 파이프라인 설명
   */
  description: string | null;
  /**
   * 활성 상태 여부
   */
  isActive: boolean;
  /**
   * 소속 프로젝트 ID
   */
  projectId: string;
  /**
   * 트리거 타입
   */
  triggerType: string;
  /**
   * 트리거 브랜치 리스트
   */
  triggerBranches: string[];
  /**
   * 파이프라인 YAML
   */
  pipelineYaml: string | null;
  /**
   * 시각화 설정 (JSON 객체)
   */
  visualConfig: KVType | null;
  /**
   * 생성일시 (ISO 8601)
   */
  createdAt: string;
  /**
   * 수정일시 (ISO 8601)
   */
  updatedAt: string;
}

export type KVType = Record<string, unknown>;
