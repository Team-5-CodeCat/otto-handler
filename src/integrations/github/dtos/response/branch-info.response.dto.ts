/**
 * 브랜치 정보 응답 DTO
 * - 특정 레포지토리의 브랜치 목록 반환
 */
export interface BranchInfoResponseDto {
  /**
   * 브랜치 목록
   */
  branches: BranchInfo[];
  
  /**
   * 레포지토리 전체 이름
   */
  repoFullName: string;
}

/**
 * 브랜치 정보
 */
export interface BranchInfo {
  /**
   * 브랜치 이름
   */
  name: string;
  
  /**
   * 최신 커밋 정보
   */
  commit: {
    /**
     * 커밋 SHA
     */
    sha: string;
    
    /**
     * 커밋 URL
     */
    url: string;
  };
  
  /**
   * 보호된 브랜치 여부
   */
  protected: boolean;
}
