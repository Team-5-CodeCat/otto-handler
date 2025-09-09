import { tags } from 'typia';

export interface CreateProjectRequestDto {
  /** 프로젝트 이름 */
  name: string & tags.MinLength<1>;
  /** 웹훅 URL (선택) */
  webhookUrl?: string & tags.Format<'url'>;
}
