export interface PipelineRunDto {
  /**
   * 파이프라인 실행 고유 ID
   */
  id: string;
  /**
   * 소속 파이프라인 ID
   */
  pipelineID: string;
  /**
   * 실행 시점의 파이프라인 버전
   */
  pipelineVersion: number;
  /**
   * 실행 상태
   */
  status: string;
  /**
   * 대기 시작일시 (ISO 8601)
   */
  queuedAt: string | null;
  /**
   * 실행 시작일시 (ISO 8601)
   */
  startedAt: string | null;
  /**
   * 실행 완료일시 (ISO 8601)
   */
  finishedAt: string | null;
  /**
   * 종료 코드
   */
  exitCode: number | null;
  /**
   * 실행 요청자
   */
  owner: string | null;
  /**
   * 실행 에이전트 (서버/컨테이너)
   */
  agent: string | null;
  /**
   * 컨테이너 이미지
   */
  containerImage: string | null;
  /**
   * 실행 트리거 (webhook/manual 등)
   */
  trigger: string | null;
  /**
   * 레이블 (메타데이터)
   */
  labels: Record<string, unknown> | null;
  /**
   * 추가 메타데이터
   */
  metadata: Record<string, unknown> | null;
  /**
   * 외부 실행 키 (고유)
   */
  externalRunKey: string | null;
  /**
   * 요청 멱등키
   */
  idempotencyKey: string | null;
  /**
   * 생성일시 (ISO 8601)
   */
  createdAt: string;
}
