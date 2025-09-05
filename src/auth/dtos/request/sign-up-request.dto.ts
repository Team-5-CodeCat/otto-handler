import { tags } from 'typia';

export interface SignUpRequestDto {
  /**
   * 사용자 이메일 (고유 식별자)
   */
  email: string & tags.Format<'email'>;
  /**
   * 사용자 비밀번호 (최소 8자)
   */
  password: string & tags.MinLength<8>;
  /**
   * 사용자 닉네임 (표시 이름)
   */
  username: string;
}
