export type GetUserProjectsResponseDto = Array<{
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
    isActive: boolean;
  }>;
}>;
