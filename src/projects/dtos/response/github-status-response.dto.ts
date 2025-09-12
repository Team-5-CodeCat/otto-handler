/**
 * GitHub 설치 상태 및 연결된 프로젝트 현황 응답 DTO
 */
export interface GithubStatusResponseDto {
  /** GitHub App이 설치되어 있는지 여부 */
  hasInstallation: boolean;

  /** 전체 설치 개수 */
  totalInstallations: number;

  /** 연결된 전체 프로젝트 개수 */
  totalConnectedProjects: number;

  /** 설치 목록 */
  installations: Array<{
    /** 내부 설치 ID (UUID) */
    installationId: string;
    /** GitHub 설치 ID */
    githubInstallationId: string;
    /** GitHub 계정 로그인명 */
    accountLogin: string;
    /** GitHub 계정 ID */
    accountId: string;
    /** GitHub 계정 타입 */
    accountType: string;
    /** 연결된 프로젝트 개수 */
    connectedProjects: number;
    /** 설치일시 (ISO 8601) */
    installedAt: string;
  }>;
}
