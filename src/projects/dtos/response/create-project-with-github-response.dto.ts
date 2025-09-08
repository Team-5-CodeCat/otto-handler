export interface CreateProjectWithGithubResponseDto {
  /**
   * 생성된 프로젝트 정보
   */
  project: {
    /**
     * 프로젝트 ID
     * @example "6b8fd749-c0c6-4470-a028-f7ae2f96b6a0"
     */
    projectID: string;

    /**
     * 프로젝트 이름
     * @example "My Awesome Project"
     */
    name: string;

    /**
     * 웹훅 URL (자동 생성)
     * @example "https://api.example.com/webhooks/github/project-6b8fd749"
     */
    webhookUrl: string | null;

    /**
     * 생성 시간
     * @example "2025-09-08T10:34:23.958Z"
     */
    createdAt: string;
  };

  /**
   * 연결된 레포지토리 정보
   */
  repository: {
    /**
     * 레포지토리 연결 ID
     * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
     */
    id: string;

    /**
     * 레포지토리 full name
     * @example "kimkimkimbo/AppleFasting"
     */
    repoFullName: string;

    /**
     * 선택된 브랜치
     * @example "main"
     */
    selectedBranch: string;

    /**
     * Installation ID (숫자)
     * @example "83162481"
     */
    installationId: string | null;

    /**
     * 활성 상태
     * @example true
     */
    isActive: boolean;
  };
}
