import { tags } from 'typia';

export interface LoginRequestDto {
  /**
   * 이메일
   */
  email: string & tags.Format<'email'>;
  /**
   * 비밀번호
   */
  password: string;
}
