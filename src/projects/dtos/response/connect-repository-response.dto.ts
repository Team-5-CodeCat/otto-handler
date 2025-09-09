export interface ConnectRepositoryResponseDto {
  /**
   * 레포지토리 연결 ID
   */
  id: string;
  /**
   * 프로젝트 ID
   */
  projectID: string;
  /**
   * 레포지토리 전체 이름
   */
  repoFullName: string;
  /**
   * 선택된 브랜치
   */
  selectedBranch: string;
  /**
   * 설치 ID
   */
  installationId?: string | null;
  /**
   * 활성 상태
   */
  isActive: boolean;
  /**
   * 생성일
   */
  createdAt: Date;
  /**
   * 수정일
   */
  updatedAt: Date;
  /**
   * 프로젝트 정보
   */
  project: {
    /**
     * 프로젝트 ID
     */
    projectID: string;
    /**
     * 프로젝트 이름
     */
    name: string;
  };
}
