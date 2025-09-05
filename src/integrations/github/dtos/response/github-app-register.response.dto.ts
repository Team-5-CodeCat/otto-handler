/**
 * GitHub 앱 등록 응답 DTO
 * - GitHub 계정 등록 후 접근 가능한 레포지토리 목록 반환
 */
export interface GithubAppRegisterResponseDto {
  /**
   * 등록 성공 여부
   */
  success: boolean;
  
  /**
   * GitHub 설치 ID
   */
  installationId: string;
  
  /**
   * 접근 가능한 레포지토리 목록
   */
  repositories: RepositoryInfo[];
  
  /**
   * 응답 메시지
   */
  message: string;
}

/**
 * 레포지토리 정보
 */
export interface RepositoryInfo {
  /**
   * 레포지토리 ID
   */
  id: number;
  
  /**
   * 레포지토리 이름
   */
  name: string;
  
  /**
   * 레포지토리 전체 이름 (owner/repo)
   */
  full_name: string;
  
  /**
   * 레포지토리 설명
   */
  description: string | null;
  
  /**
   * 비공개 레포지토리 여부
   */
  private: boolean;
  
  /**
   * GitHub URL
   */
  html_url: string;
  
  /**
   * 기본 브랜치
   */
  default_branch: string;
}
