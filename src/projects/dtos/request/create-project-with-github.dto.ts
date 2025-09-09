import { tags } from 'typia';

export interface CreateProjectWithGithubDto {
  /**
   * 프로젝트 이름
   */
  name: string & tags.MinLength<1> & tags.MaxLength<100>;
  /**
   * GitHub Installation UUID
   */
  installationId: string & tags.Format<'uuid'>;
  /**
   * 레포지토리 전체 이름
   */
  repositoryFullName: string & tags.MinLength<1>;
  /**
   * 선택된 브랜치
   */
  selectedBranch: string & tags.MinLength<1>;
}
