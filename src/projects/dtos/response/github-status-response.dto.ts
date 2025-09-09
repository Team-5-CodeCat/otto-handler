/**
 * GitHub 설치 상태 및 연결된 레포지토리 현황 응답 DTO
 */
export interface GithubStatusResponseDto {
  /** GitHub App이 설치되어 있는지 여부 */
  hasInstallation: boolean;

  /** 전체 설치 개수 */
  totalInstallations: number;

  /** 연결된 전체 레포지토리 개수 */
  totalConnectedRepositories: number;

  /** 설치 목록 */
  installations: Array<{
    /** 내부 설치 ID (UUID) */
    id: string;
    /** GitHub 설치 ID */
    installationId: string;
    /** GitHub 계정 로그인명 */
    accountLogin: string;
    /** GitHub 계정 ID */
    accountId: string;
    /** 연결된 레포지토리 개수 */
    connectedRepositories: number;
    /** 설치일시 (ISO 8601) */
    installedAt: string;
    /** 마지막 사용일시 (ISO 8601, nullable) */
    lastUsedAt: string | null;
  }>;
}
