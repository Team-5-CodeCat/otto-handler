export interface GetProjectDetailResponseDto {
  projectID: string;
  userID: string;
  name: string;
  webhookUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  repositories: Array<{
    id: string;
    repoFullName: string;
    selectedBranch: string;
    installationId?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  user: {
    userID: string;
    email: string;
    name: string;
  };
}
