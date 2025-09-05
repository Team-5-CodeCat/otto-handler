import { tags } from 'typia';

/**
 * GitHub 앱 등록 요청 DTO
 * - GitHub App 설치 후 받은 installationId와 accessToken을 전달
 */
export interface RegisterGithubAppDto {
  /**
   * GitHub App 설치 ID (고유 식별자)
   */
  installationId: string;
  
  /**
   * GitHub App 액세스 토큰
   */
  accessToken: string;
}
