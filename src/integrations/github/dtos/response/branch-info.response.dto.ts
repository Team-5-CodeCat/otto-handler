/**
 * 브랜치 정보 응답 DTO
 */
export interface BranchInfoResponseDto {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}
