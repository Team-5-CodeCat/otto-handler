export interface ConnectRepositoryRequestDto {
  /** owner/repo */
  repoFullName: string;
  /** 선택된 브랜치 */
  selectedBranch: string;
  /** 설치 ID (선택) */
  installationId?: string;
}
