export interface RegisterInstallationResponseDto {
  installationId: string;
  userId: string;
  githubInstallationId: string;
  accountLogin: string;
  accountId: string;
  accountType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    userId: string;
    email: string;
    name: string | null;
  };
}
