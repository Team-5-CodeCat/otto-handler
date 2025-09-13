/**
 * JSON 파이프라인 배포 응답 DTO
 */
export interface DeployFromJsonResponseDto {
  /**
   * 변환 및 배포 성공 여부
   */
  success: boolean;

  /**
   * 생성된 buildspec.yaml 내용
   */
  buildSpecYaml: string;

  /**
   * CodeBuild 빌드 ID
   */
  buildId: string;

  /**
   * 빌드 상태
   */
  buildStatus: string;

  /**
   * CodeBuild 프로젝트명
   */
  projectName: string;

  /**
   * 처리된 노드 개수
   */
  nodesProcessed: number;

  /**
   * 빌드 시작 시간
   */
  buildStartTime?: Date;

  /**
   * CloudWatch 로그 정보
   */
  logInfo?: {
    groupName: string;
    streamName: string;
  };

  /**
   * 메타데이터
   */
  metadata: {
    pipelineId: string;
    pipelineType: string;
    environment: string;
    generatedAt: Date;
  };
}
