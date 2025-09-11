import { tags } from 'typia';

export interface ConnectRepositoryRequestDto {
  /**
   * GitHub Repository ID
   */
  githubRepoId: string & tags.MinLength<1>;
  /**
   * GitHub Repository URL
   */
  githubRepoUrl: string & tags.MinLength<1>;
  /**
   * GitHub Repository Name
   */
  githubRepoName: string & tags.MinLength<1>;
  /**
   * GitHub Owner
   */
  githubOwner: string & tags.MinLength<1>;
  /**
   * 비공개 레포지토리 여부
   */
  isPrivate: boolean;
  /**
   * 선택된 브랜치
   */
  selectedBranch: string & tags.MinLength<1>;
  /**
   * 설치 ID (선택)
   */
  installationId?: string;
}
