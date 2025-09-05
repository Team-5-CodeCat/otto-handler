import { tags } from 'typia';

/**
 * 레포지토리 선택 요청 DTO
 * - 사용자가 선택한 레포지토리를 프로젝트에 연결
 */
export interface SelectRepositoryDto {
  /**
   * 프로젝트 ID
   */
  projectID: string;
  
  /**
   * 선택된 레포지토리 전체 이름 (owner/repo)
   */
  repoFullName: string;
  
  /**
   * GitHub 설치 ID (어떤 GitHub 계정에서 가져온 레포인지)
   */
  installationId: string;
}
