export interface CreatePipelineResponseDto {
  /**
   * 파이프라인 고유 ID
   */
  pipelineID: string;
  /**
   * 파이프라인 이름
   */
  name: string;
  /**
   * 파이프라인 버전
   */
  version: number;
  /**
   * 활성 상태 여부
   */
  active: boolean;
  /**
   * 소속 프로젝트 ID
   */
  projectID: string;
  /**
   * 소유자 정보
   */
  owner: string | null;
  /**
   * 파이프라인 스펙 (JSON 객체)
   */
  pipelineSpec: KVType;
  /**
   * 원본 YAML/JSON 스펙
   */
  originalSpec: string | null;
  /**
   * 정규화된 스펙 (JSON 객체)
   */
  normalizedSpec: KVType | null;
  /**
   * 스펙 해시 (SHA-256)
   */
  specHash: string | null;
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
