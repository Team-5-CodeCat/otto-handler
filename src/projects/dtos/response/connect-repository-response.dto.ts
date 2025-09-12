export interface ConnectRepositoryResponseDto {
  /**
   * 프로젝트 ID
   */
  projectId: string;
  /**
   * 프로젝트 이름
   */
  name: string;
  /**
   * 프로젝트 설명
   */
  description: string | null;
  /**
   * 활성 상태
   */
  isActive: boolean;
  /**
   * GitHub 레포지토리 ID
   */
  githubRepoId: string;
  /**
   * 선택된 브랜치
   */
  selectedBranch: string;
  /**
   * 설치 ID
   */
  installationId?: string | null;
  /**
   * GitHub 레포지토리 URL
   */
  githubRepoUrl: string;
  /**
   * GitHub 레포지토리 이름
   */
  githubRepoName: string;
  /**
   * GitHub 소유자
   */
  githubOwner: string;
  /**
   * 비공개 레포지토리 여부
   */
  isPrivate: boolean;
  /**
   * 생성일
   */
  createdAt: Date;
  /**
   * 수정일
   */
  updatedAt: Date;
  /**
   * 사용자 정보
   */
  user: {
    userId: string;
    username: string | null;
  };
}
