export type GetUserGithubInstallationsResponseDto = Array<{
  installationId: string;
  userId: string;
  githubInstallationId: string;
  accountLogin: string;
  accountType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;
