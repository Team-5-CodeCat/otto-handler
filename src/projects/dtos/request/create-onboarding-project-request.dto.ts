import { tags } from 'typia';

export interface CreateOnboardingProjectRequestDto {
  /** 프로젝트 이름 */
  projectName: string & tags.MinLength<1> & tags.MaxLength<100>;

  /** GitHub 소유자명 */
  githubOwner: string & tags.MinLength<1>;

  /** GitHub 레포지토리 ID */
  githubRepoId: string & tags.MinLength<1>;

  /** GitHub 레포지토리 이름 */
  githubRepoName: string & tags.MinLength<1>;

  /** GitHub 레포지토리 URL */
  githubRepoUrl: string & tags.Format<'url'>;

  /** GitHub App 설치 ID */
  installationId: string;

  /** 선택된 브랜치 (옵션, 기본값: main) */
  selectedBranch?: string & tags.MinLength<1>;
}
