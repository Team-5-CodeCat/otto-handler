export interface ConnectRepositoryResponseDto {
  id: string;
  projectID: string;
  repoFullName: string;
  selectedBranch: string;
  installationId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  project: {
    projectID: string;
    name: string;
  };
}


