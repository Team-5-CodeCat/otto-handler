export type GetUserGithubInstallationsResponseDto = Array<{
  id: string;
  userID: string;
  installationId: string;
  accountLogin: string | null;
  accountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;
