import { tags } from 'typia';

export interface CreatePipelineRunRequestDto {
  /**
   * 실행할 브랜치
   */
  branch?: string & tags.MinLength<1> & tags.MaxLength<255>;
  /**
   * 커밋 SHA
   */
  commitSha?: string & tags.MinLength<1> & tags.MaxLength<40>;
  /**
   * 커밋 메시지
   */
  commitMessage?: string & tags.MaxLength<1000>;
}
