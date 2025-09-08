export interface GithubStatusResponseDto {
  hasInstallation: boolean;
  installations: Array<{
    id: string;
    installationId: string;
    accountLogin: string | null;
    createdAt: string;
  }>;
}
