import { tags } from 'typia';

export interface RegisterInstallationRequestDto {
  /**
   * GitHub App 설치 ID
   */
  installationId: string & tags.Format<'uuid'>;
}
