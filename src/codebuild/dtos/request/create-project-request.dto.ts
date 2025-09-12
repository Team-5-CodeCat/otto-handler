import { tags } from 'typia';

export interface CreateProjectRequestDto {
  /** 사용자 ID */
  userId: string & tags.MinLength<1>;

  /** 프로젝트 ID */
  projectId: string & tags.MinLength<1>;

  /** 프로젝트명 (선택, 자동 생성됨) */
  projectName?: string & tags.MinLength<1> & tags.MaxLength<100>;

  /** 프로젝트 설명 */
  description?: string & tags.MaxLength<500>;

  /** GitHub 소스 위치 */
  sourceLocation?: string & tags.Format<'url'>;

  /** 커스텀 buildspec (선택) */
  buildspec?: string;

  /** 아티팩트 S3 버킷 (선택) */
  artifactsBucket?: string & tags.MinLength<1>;
}
