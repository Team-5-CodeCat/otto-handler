export interface OnboardingProjectResponseDto {
  /** 생성된 프로젝트 정보 */
  project: {
    projectId: string;
    name: string;
    description: string | null;
    githubOwner: string;
    githubRepoName: string;
    githubRepoUrl: string;
    selectedBranch: string;
    createdAt: Date;
  };

  /** 생성된 기본 파이프라인 정보 */
  pipeline: {
    pipelineId: string;
    name: string;
    description: string | null;
    triggerType: string;
    isActive: boolean;
    createdAt: Date;
  };

  /** 프론트엔드 리다이렉트 URL */
  redirectUrl: string;
}
