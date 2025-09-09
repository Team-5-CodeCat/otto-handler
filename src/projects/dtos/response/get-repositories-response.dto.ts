export type GetRepositoriesResponseDto = Array<{
  /**
   * 레포지토리 ID
   */
  id: number;
  /**
   * 레포지토리 이름
   */
  name: string;
  /**
   * 레포지토리 전체 이름
   */
  fullName: string;
  /**
   * 레포지토리 설명
   */
  description: string | null;
  /**
   * 비공개 여부
   */
  private: boolean;
  /**
   * 기본 브랜치
   */
  defaultBranch: string;
  /**
   * 주 언어
   */
  language: string | null;
  /**
   * 스타 개수
   */
  stargazersCount: number;
  /**
   * 포크 개수
   */
  forksCount: number;
  /**
   * 업데이트 시간
   */
  updatedAt: string;
}>;
