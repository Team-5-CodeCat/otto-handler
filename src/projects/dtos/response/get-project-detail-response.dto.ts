export interface GetProjectDetailResponseDto {
  projectId: string;
  userId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  githubRepoId: string;
  selectedBranch: string;
  installationId?: string | null;
  githubRepoUrl: string;
  githubRepoName: string;
  githubOwner: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    userId: string;
    email: string;
    name: string | null;
  };
  installation: {
    installationId: string;
    githubInstallationId: string;
    accountLogin: string;
    accountType: string;
  } | null;
  pipelines: Array<{
    pipelineId: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}
