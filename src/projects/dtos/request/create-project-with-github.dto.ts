import { tags } from 'typia';

export interface CreateProjectWithGithubDto {
  /**
   * 프로젝트 이름
   */
  name: string & tags.MinLength<1> & tags.MaxLength<100>;
  /**
   * 프로젝트 설명
   */
  description?: string & tags.MaxLength<500>;
  /**
   * GitHub Installation ID
   */
  installationId: string;
  /**
   * GitHub Repository ID
   */
  githubRepoId: string;
  /**
   * GitHub Repository URL
   */
  githubRepoUrl: string;
  /**
   * GitHub Repository Name
   */
  githubRepoName: string;
  /**
   * GitHub Owner
   */
  githubOwner: string;
  /**
   * 비공개 레포지토리 여부
   */
  isPrivate: boolean;
  /**
   * 선택된 브랜치
   */
  selectedBranch: string & tags.MinLength<1>;
}
