export interface RegisterInstallationResponseDto {
  id: string;
  userID: string;
  installationId: string;
  accountLogin: string | null;
  accountId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    userID: string;
    email: string;
    name: string;
  };
}


