import { tags } from 'typia';

export interface ConnectRepositoryRequestDto {
  /**
   * 레포지토리 전체 이름 (owner/repo)
   */
  repoFullName: string & tags.MinLength<1>;
  /**
   * 선택된 브랜치
   */
  selectedBranch: string & tags.MinLength<1>;
  /**
   * 설치 ID (선택)
   */
  installationId?: string;
}
