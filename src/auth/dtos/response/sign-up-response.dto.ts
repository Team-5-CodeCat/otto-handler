import type { AuthResponseEnum } from '../../constants';

export interface SignUpResponseDto {
  /**
   * 회원가입 결과 메시지
   */
  message: AuthResponseEnum;
}
