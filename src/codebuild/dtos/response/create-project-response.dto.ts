export interface CreateProjectResponseDto {
  /** 생성된 CodeBuild 프로젝트명 */
  projectName: string;

  /** 프로젝트 ARN */
  arn: string;

  /** 프로젝트 설명 */
  description?: string;

  /** 소스 위치 */
  sourceLocation?: string;

  /** 서비스 역할 ARN */
  serviceRole: string;

  /** 생성 시간 */
  created: Date;

  /** 사용자 ID */
  userId: string;

  /** 프로젝트 ID */
  projectId: string;
}
