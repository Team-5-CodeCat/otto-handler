export interface PipelineExecutionDto {
  /**
   * 실행 고유 ID
   */
  id: string;
  /**
   * 파이프라인 ID
   */
  pipelineId: string;
  /**
   * 실행 ID (AWS CodeBuild ID)
   */
  executionId: string;
  /**
   * 실행 상태
   */
  status: string;
  /**
   * 트리거 타입
   */
  triggerType: string;
  /**
   * 브랜치
   */
  branch: string | null;
  /**
   * 커밋 SHA
   */
  commitSha: string | null;
  /**
   * 커밋 메시지
   */
  commitMessage: string | null;
  /**
   * 시작 시간
   */
  startedAt: string | null;
  /**
   * 완료 시간
   */
  completedAt: string | null;
  /**
   * 실행 시간 (초)
   */
  duration: number | null;
  /**
   * 생성일시 (ISO 8601)
   */
  createdAt: string;
  /**
   * 수정일시 (ISO 8601)
   */
  updatedAt: string;
}
