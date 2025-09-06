// DTO 인터페이스들 - 요청 데이터의 형태를 정의
export interface CreateProjectDto {
  name: string;
  webhookUrl?: string;
}

export interface RegisterInstallationDto {
  installationId: string;
}

export interface ConnectRepositoryDto {
  repoFullName: string;
  selectedBranch: string;
  installationId?: string;
}

export interface UpdateBranchDto {
  branchName: string;
}
