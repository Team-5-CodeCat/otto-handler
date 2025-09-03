import { tags } from 'typia';

export interface SignUpRequestDto {
  /**
   * 이메일
   */
  email: string;
  /**
   * 비밀번호
   */
  password: string & tags.MinLength<8>;
  /**
   * 닉네임
   */
  username: string;
}
