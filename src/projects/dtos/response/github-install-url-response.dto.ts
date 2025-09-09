export interface GithubInstallUrlResponseDto {
  /**
   * 사용자 ID
   */
  userId: string;
  /**
   * 앱 슬러그
   */
  appSlug: string;
  /**
   * 상태 토큰
   */
  state: string;
  /**
   * 설치 URL
   */
  installUrl: string;
}
