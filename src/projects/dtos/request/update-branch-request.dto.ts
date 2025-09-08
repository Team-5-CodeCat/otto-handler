import { tags } from 'typia';

export interface UpdateBranchRequestDto {
  /**
   * 새로운 브랜치명
   */
  branchName: string & tags.MinLength<1>;
}
