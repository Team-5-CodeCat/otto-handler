/**
 * 깃허브 앱 등록 요청 DTO
 * 프론트엔드에서 깃허브 앱 설치 ID 등 필요한 정보를 전달
 */
export interface RegisterGithubAppDto {
  /**
   * 깃허브 앱 설치 ID
   */
  installationId: number;
  /**
   * (선택) 깃허브에서 받은 accessToken 등 추가 정보 필요시 확장
   */
  accessToken?: string;
}
