/**
 * GitHub 앱 등록 응답 DTO
 */
export interface GithubAppRegisterResponseDto {
  success: boolean;
  repositories: RepositoryInfo[];
}

/**
 * 레포지토리 정보 DTO
 */
export interface RepositoryInfo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
}
