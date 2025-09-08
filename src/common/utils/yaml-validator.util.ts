import * as yaml from 'js-yaml';
import { BadRequestException } from '@nestjs/common';

/**
 * YAML 형식 검증 유틸리티
 * YAML 형식과 필수 필드 검증
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

  /**
   * YAML 파일에 build 필드가 포함되어 있는지 검증
   * @param yamlContent - 검증할 YAML 문자열
   * @throws BadRequestException - build 필드가 없는 경우
   */
  static validateBuildField(yamlContent: string): void {
    if (!YamlValidatorUtil.isValidYamlFormat(yamlContent)) {
      throw new BadRequestException('유효하지 않은 YAML 형식입니다.');
    }

    let parsedYaml: any;
    try {
      parsedYaml = yaml.load(yamlContent, { schema: yaml.DEFAULT_SCHEMA });
    } catch (error) {
      throw new BadRequestException('YAML 파싱에 실패했습니다.');
    }

    // build 필드 검증
    if (!parsedYaml || typeof parsedYaml !== 'object') {
      throw new BadRequestException('YAML은 객체 형태여야 합니다.');
    }

    if (!parsedYaml.build) {
      throw new BadRequestException('YAML 파일에 "build" 필드가 필요합니다.');
    }

    if (
      typeof parsedYaml.build !== 'object' ||
      Array.isArray(parsedYaml.build)
    ) {
      throw new BadRequestException('"build" 필드는 객체 형태여야 합니다.');
    }
  }
}
