import { tags } from 'typia';

/**
 * 브랜치 선택 요청 DTO
 * - 선택된 레포지토리의 브랜치를 지정
 */
export interface SelectBranchDto {
  /**
   * 프로젝트 ID
   */
  projectID: string;
  
  /**
   * 레포지토리 전체 이름 (owner/repo)
   */
  repoFullName: string;
  
  /**
   * 선택된 브랜치 이름
   */
  branchName: string;
}
