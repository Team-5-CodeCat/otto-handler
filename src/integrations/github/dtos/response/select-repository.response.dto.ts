/**
 * 레포지토리 선택 응답 DTO
 * - 레포지토리 선택 완료 후 응답
 */
export interface SelectRepositoryResponseDto {
  /**
   * 선택 성공 여부
   */
  success: boolean;
  
  /**
   * 프로젝트 ID
   */
  projectID: string;
  
  /**
   * 선택된 레포지토리 전체 이름
   */
  repoFullName: string;
  
  /**
   * GitHub 설치 ID
   */
  installationId: string;
  
  /**
   * 응답 메시지
   */
  message: string;
}
