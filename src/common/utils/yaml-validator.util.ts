import * as yaml from 'js-yaml';

/**
 * YAML 형식 검증 유틸리티
 * 단순히 YAML 형식만 검증
 */
export class YamlValidatorUtil {
  /**
   * YAML 문자열이 유효한 형식인지 체크
   * @param yamlContent - 검증할 YAML 문자열
   * @returns 유효성 여부
   */
  static isValidYamlFormat(yamlContent: string): boolean {
    try {
      yaml.load(yamlContent, { schema: yaml.DEFAULT_SCHEMA });
      return true;
    } catch {
      return false;
    }
  }
}
