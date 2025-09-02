/**
 * GitHub 앱 설치 콜백 요청 DTO
 */
export interface InstallationCallbackDto {
  installation_id: string;
  setup_action: 'install' | 'update';
  state?: string; // 설치 상태를 추적하기 위한 선택적 파라미터
}
