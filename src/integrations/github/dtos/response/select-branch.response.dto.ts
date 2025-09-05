/**
 * 브랜치 선택 응답 DTO
 * - 브랜치 선택 완료 후 응답
 */
export interface SelectBranchResponseDto {
  /**
   * 선택 성공 여부
   */
  success: boolean;
  
  /**
   * 프로젝트 ID
   */
  projectID: string;
  
  /**
   * 레포지토리 전체 이름
   */
  repoFullName: string;
  
  /**
   * 선택된 브랜치 이름
   */
  branchName: string;
  
  /**
   * 응답 메시지
   */
  message: string;
}
