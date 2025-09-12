export type GetUserGithubInstallationsResponseDto = Array<{
  installationId: string;
  userId: string;
  githubInstallationId: string;
  accountLogin: string;
  accountId: string;
  accountType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;
