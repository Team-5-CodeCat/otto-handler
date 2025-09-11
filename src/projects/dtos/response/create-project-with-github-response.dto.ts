export interface CreateProjectWithGithubResponseDto {
  /**
   * 생성된 프로젝트 정보
   */
  project: {
    /**
     * 프로젝트 ID
     * @example "6b8fd749-c0c6-4470-a028-f7ae2f96b6a0"
     */
    projectId: string;

    /**
     * 프로젝트 이름
     * @example "My Awesome Project"
     */
    name: string;

    /**
     * 프로젝트 설명
     * @example "My awesome project description"
     */
    description: string | null;

    /**
     * 활성 상태
     * @example true
     */
    isActive: boolean;

    /**
     * GitHub 레포지토리 ID
     * @example "123456789"
     */
    githubRepoId: string;

    /**
     * 선택된 브랜치
     * @example "main"
     */
    selectedBranch: string;

    /**
     * GitHub 레포지토리 URL
     * @example "https://github.com/owner/repo"
     */
    githubRepoUrl: string;

    /**
     * GitHub 레포지토리 이름
     * @example "my-repo"
     */
    githubRepoName: string;

    /**
     * GitHub 소유자
     * @example "owner"
     */
    githubOwner: string;

    /**
     * 비공개 레포지토리 여부
     * @example true
     */
    isPrivate: boolean;

    /**
     * 생성 시간
     * @example "2025-09-08T10:34:23.958Z"
     */
    createdAt: string;
  };
}
