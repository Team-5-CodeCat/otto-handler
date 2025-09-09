export interface UpdateBranchResponseDto {
  id: string;
  projectID: string;
  repoFullName: string;
  selectedBranch: string;
  installationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: {
    projectID: string;
    name: string;
  };
}
