/**
 * 브랜치 등록 요청 DTO
 */
export interface RegisterBranchDto {
  repo: string;    // 레포지토리 전체 이름 (owner/repo)
  branch: string;  // 선택한 브랜치명
}
