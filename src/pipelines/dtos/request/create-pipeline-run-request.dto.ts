import { tags } from 'typia';

export interface CreatePipelineRunRequestDto {
  /**
   * 실행에 첨부할 라벨 메타데이터 (검색/분류 용도)
   */
  labels?: Record<string, unknown>;
  /**
   * 실행에 첨부할 임의의 메타데이터 (디버깅/추적 용도)
   */
  metadata?: Record<string, unknown>;
  /**
   * 멱등성 보장을 위한 요청 키 (동일 키로 중복 실행 방지)
   */
  idempotencyKey?: string & tags.MinLength<1> & tags.MaxLength<128>;
  /**
   * 외부 시스템과 연동 시 사용하는 실행 키
   */
  externalRunKey?: string & tags.MinLength<1> & tags.MaxLength<128>;
}
