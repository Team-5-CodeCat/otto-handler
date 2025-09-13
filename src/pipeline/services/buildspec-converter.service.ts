import { Injectable, BadRequestException } from '@nestjs/common';
import * as yaml from 'js-yaml';
import type { PipelineFlowData, FlowNode, FlowEdge } from '../dto/common';

/**
 * AWS CodeBuild buildspec.yml 구조 인터페이스
 * @see https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
 */
interface BuildSpecPhase {
  /**
   * 빌드 단계를 실행할 사용자
   * @example "root"
   */
  'run-as'?: string;

  /**
   * 실행할 명령어 목록
   * @example ["npm install", "npm run build"]
   */
  commands?: string[];

  /**
   * 단계 완료 후 실행할 정리 명령어
   * @example ["echo 'Cleanup completed'"]
   */
  finally?: string[];
}

/**
 * AWS CodeBuild 환경변수 설정 인터페이스
 * @description 빌드 환경에서 사용할 환경변수들을 정의
 */
interface BuildSpecEnv {
  /**
   * 일반 텍스트 환경변수
   * @example { "NODE_ENV": "production", "API_URL": "https://api.example.com" }
   */
  variables?: Record<string, string>;

  /**
   * AWS Systems Manager Parameter Store에서 가져올 환경변수
   * @example { "DB_PASSWORD": "/myapp/database/password" }
   */
  'parameter-store'?: Record<string, string>;

  /**
   * AWS Secrets Manager에서 가져올 환경변수
   * @example { "API_KEY": "prod/api/key:api_key" }
   */
  'secrets-manager'?: Record<string, string>;
}

/**
 * AWS CodeBuild 아티팩트 설정 인터페이스
 * @description 빌드 결과물을 S3에 업로드할 때 사용하는 설정
 */
interface BuildSpecArtifacts {
  /**
   * 아티팩트에 포함할 파일 패턴 목록
   * @example ["build/**\\/*", "dist/**\\/*", "package.json"]
   */
  files?: string[];

  /**
   * 아티팩트 이름
   * @example "MyAppBuildArtifacts"
   */
  name?: string;

  /**
   * 파일 경로 유지 여부
   * @default "no"
   */
  'discard-paths'?: 'yes' | 'no';

  /**
   * 아티팩트의 기본 디렉터리
   * @example "build"
   */
  'base-directory'?: string;
}

/**
 * AWS CodeBuild 캐시 설정 인터페이스
 * @description 빌드 속도 향상을 위한 캐시 설정
 */
interface BuildSpecCache {
  /**
   * 캐시할 디렉터리 경로 목록
   * @example ["node_modules/**\\/*", ".npm/**\\/*"]
   */
  paths?: string[];
}

/**
 * AWS CodeBuild buildspec.yml 전체 구조 인터페이스
 * @description buildspec.yml 파일의 완전한 구조를 정의
 * @see https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
 */
export interface BuildSpecYaml {
  /**
   * buildspec 버전 (권장값: '0.2')
   * @example "0.2"
   */
  version: string;

  /**
   * 환경변수 설정
   * @description 빌드 환경에서 사용할 환경변수들
   */
  env?: BuildSpecEnv;

  /**
   * 빌드 단계별 설정
   * @description install, pre_build, build, post_build 단계 정의
   */
  phases?: {
    /** 의존성 설치 단계 */
    install?: BuildSpecPhase;
    /** 빌드 전 준비 단계 */
    pre_build?: BuildSpecPhase;
    /** 메인 빌드 단계 (필수) */
    build?: BuildSpecPhase;
    /** 빌드 후 처리 단계 */
    post_build?: BuildSpecPhase;
  };

  /**
   * 빌드 결과물 설정
   * @description S3에 업로드할 아티팩트 설정
   */
  artifacts?: BuildSpecArtifacts;

  /**
   * 캐시 설정
   * @description 빌드 속도 향상을 위한 캐시 디렉터리 설정
   */
  cache?: BuildSpecCache;
}

/**
 * React Flow 노드에서 사용되는 파이프라인 단계 데이터 인터페이스
 * @description 프론트엔드 React Flow 노드의 data 속성에 저장되는 데이터 구조
 */
interface PipelineStepData {
  /**
   * 노드 라벨 (사용자에게 표시되는 이름)
   * @example "Build Application"
   */
  label: string;

  /**
   * 파이프라인 단계 타입
   * @description AWS CodeBuild의 빌드 단계에 매핑되는 타입
   */
  stepType:
    | 'INSTALL' // 의존성 설치 단계
    | 'PRE_BUILD' // 빌드 전 준비 단계
    | 'BUILD' // 메인 빌드 단계
    | 'POST_BUILD' // 빌드 후 처리 단계
    | 'ENV' // 환경변수 설정
    | 'ARTIFACTS' // 아티팩트 설정
    | 'CACHE'; // 캐시 설정

  /**
   * 실행할 명령어 목록 (BUILD 단계용)
   * @example ["npm run build", "npm test"]
   */
  commands?: string[];

  /**
   * 환경변수 (ENV 단계용)
   * @example { "NODE_ENV": "production", "API_URL": "https://api.example.com" }
   */
  env?: Record<string, string>;

  /**
   * 아티팩트 설정 (ARTIFACTS 단계용)
   */
  artifacts?: {
    /** 포함할 파일 패턴 */
    files?: string[];
    /** 아티팩트 이름 */
    name?: string;
    /** 기본 디렉터리 */
    baseDirectory?: string;
  };

  /**
   * 캐시 설정 (CACHE 단계용)
   */
  cache?: {
    /** 캐시할 경로 목록 */
    paths?: string[];
  };

  /**
   * 실행 사용자 (BUILD 단계용)
   * @example "root"
   */
  runAs?: string;
}

@Injectable()
export class BuildSpecConverterService {
  /**
   * React Flow JSON 데이터를 AWS CodeBuild buildspec.yaml로 변환
   *
   * @description 프론트엔드에서 전달받은 React Flow 파이프라인 데이터를
   *              AWS CodeBuild에서 실행 가능한 buildspec.yaml 형식으로 변환합니다.
   *              변환 과정에서 노드들을 단계별로 분류하고 AWS buildspec 구조에 맞게 재구성합니다.
   *
   * @param pipelineData - React Flow에서 생성된 파이프라인 데이터 (nodes, edges, viewport 포함)
   * @returns AWS CodeBuild buildspec.yaml 형식의 YAML 문자열
   *
   * @throws BadRequestException 파이프라인 데이터가 없거나 유효하지 않은 경우
   * @throws BadRequestException buildspec.yaml 생성에 실패한 경우
   *
   * @example
   * ```typescript
   * const pipelineData = {
   *   nodes: [
   *     { id: '1', data: { stepType: 'BUILD', commands: ['npm install', 'npm run build'] } }
   *   ],
   *   edges: [],
   *   viewport: { x: 0, y: 0, zoom: 1 }
   * };
   *
   * const yamlString = converter.convertToBuildSpec(pipelineData);
   * // 결과: version: '0.2'\nphases:\n  build:\n    commands:\n      - npm install\n      - npm run build
   * ```
   */
  convertToBuildSpec(pipelineData: PipelineFlowData): string {
    if (!pipelineData || !pipelineData.nodes) {
      throw new BadRequestException('파이프라인 데이터가 없습니다.');
    }

    if (pipelineData.nodes.length === 0) {
      throw new BadRequestException('파이프라인 노드가 비어있습니다.');
    }

    const buildSpec: BuildSpecYaml = {
      version: '0.2',
    };

    // 노드들을 단계별로 분류하고 처리
    const { phases, env, artifacts, cache } = this.processNodes(
      pipelineData.nodes as unknown as FlowNode<PipelineStepData>[],
    );

    if (env) buildSpec.env = env;
    if (phases) buildSpec.phases = phases;
    if (artifacts) buildSpec.artifacts = artifacts;
    if (cache) buildSpec.cache = cache;

    try {
      return yaml.dump(buildSpec, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });
    } catch {
      throw new BadRequestException('buildspec.yaml 생성에 실패했습니다.');
    }
  }

  /**
   * 노드들을 분석하여 buildspec 구조로 변환
   *
   * @description React Flow 노드 배열을 순회하면서 각 노드의 stepType에 따라
   *              AWS CodeBuild buildspec의 해당 섹션(phases, env, artifacts, cache)으로 분류합니다.
   *              각 노드는 고유한 역할을 가지며 최종적으로 통합된 buildspec 구조를 반환합니다.
   *
   * @param nodes - 처리할 React Flow 노드 배열 (PipelineStepData 타입의 data 속성 포함)
   * @returns 분류된 buildspec 구성 요소들을 포함하는 객체
   *          - phases: 빌드 단계별 설정 (install, pre_build, build, post_build)
   *          - env: 환경변수 설정
   *          - artifacts: 빌드 결과물 설정
   *          - cache: 캐시 설정
   *
   * @example
   * ```typescript
   * const nodes = [
   *   { data: { stepType: 'BUILD', commands: ['npm run build'] } },
   *   { data: { stepType: 'ENV', env: { NODE_ENV: 'production' } } }
   * ];
   *
   * const result = this.processNodes(nodes);
   * // 결과: { phases: { build: { commands: ['npm run build'] } }, env: { variables: { NODE_ENV: 'production' } } }
   * ```
   */
  private processNodes(nodes: FlowNode<PipelineStepData>[]) {
    const phases: BuildSpecYaml['phases'] = {};
    let env: BuildSpecEnv | undefined;
    let artifacts: BuildSpecArtifacts | undefined;
    let cache: BuildSpecCache | undefined;

    for (const node of nodes) {
      const stepData = node.data;

      if (!stepData || !stepData.stepType) {
        continue;
      }

      switch (stepData.stepType) {
        case 'ENV':
          env = this.processEnvNode(stepData);
          break;
        case 'INSTALL':
          phases.install = this.processPhaseNode(stepData);
          break;
        case 'PRE_BUILD':
          phases.pre_build = this.processPhaseNode(stepData);
          break;
        case 'BUILD':
          phases.build = this.processPhaseNode(stepData);
          break;
        case 'POST_BUILD':
          phases.post_build = this.processPhaseNode(stepData);
          break;
        case 'ARTIFACTS':
          artifacts = this.processArtifactsNode(stepData);
          break;
        case 'CACHE':
          cache = this.processCacheNode(stepData);
          break;
      }
    }

    return { phases, env, artifacts, cache };
  }

  /**
   * 환경변수 노드 처리
   *
   * @description ENV stepType을 가진 노드의 데이터를 AWS CodeBuild buildspec의
   *              환경변수 섹션 형식으로 변환합니다. 현재는 일반 텍스트 환경변수만 지원하며,
   *              향후 parameter-store, secrets-manager 지원을 추가할 수 있습니다.
   *
   * @param stepData - ENV 타입의 파이프라인 단계 데이터 (env 속성 포함)
   * @returns AWS CodeBuild 환경변수 설정 객체 또는 undefined (환경변수가 없는 경우)
   *
   * @example
   * ```typescript
   * const stepData = {
   *   stepType: 'ENV',
   *   env: { NODE_ENV: 'production', API_URL: 'https://api.example.com' }
   * };
   *
   * const result = this.processEnvNode(stepData);
   * // 결과: { variables: { NODE_ENV: 'production', API_URL: 'https://api.example.com' } }
   * ```
   */
  private processEnvNode(stepData: PipelineStepData): BuildSpecEnv | undefined {
    if (!stepData.env || Object.keys(stepData.env).length === 0) {
      return undefined;
    }

    return {
      variables: stepData.env,
    };
  }

  /**
   * 빌드 단계 노드 처리
   *
   * @description BUILD, INSTALL, PRE_BUILD, POST_BUILD stepType을 가진 노드의 데이터를
   *              AWS CodeBuild buildspec의 phases 섹션 형식으로 변환합니다.
   *              commands와 run-as 설정을 처리하며, 향후 finally 명령어도 지원 가능합니다.
   *
   * @param stepData - 빌드 단계 타입의 파이프라인 단계 데이터 (commands, runAs 속성 포함)
   * @returns AWS CodeBuild 빌드 단계 설정 객체
   *
   * @example
   * ```typescript
   * const stepData = {
   *   stepType: 'BUILD',
   *   commands: ['npm install', 'npm run build', 'npm test'],
   *   runAs: 'root'
   * };
   *
   * const result = this.processPhaseNode(stepData);
   * // 결과: { commands: ['npm install', 'npm run build', 'npm test'], 'run-as': 'root' }
   * ```
   */
  private processPhaseNode(stepData: PipelineStepData): BuildSpecPhase {
    const phase: BuildSpecPhase = {};

    if (stepData.commands && stepData.commands.length > 0) {
      phase.commands = stepData.commands;
    }

    if (stepData.runAs) {
      phase['run-as'] = stepData.runAs;
    }

    return phase;
  }

  /**
   * 아티팩트 노드 처리
   *
   * @description ARTIFACTS stepType을 가진 노드의 데이터를 AWS CodeBuild buildspec의
   *              artifacts 섹션 형식으로 변환합니다. 빌드 결과물을 S3에 업로드하기 위한
   *              파일 패턴, 아티팩트 이름, 기본 디렉터리 등을 설정합니다.
   *
   * @param stepData - ARTIFACTS 타입의 파이프라인 단계 데이터 (artifacts 속성 포함)
   * @returns AWS CodeBuild 아티팩트 설정 객체 또는 undefined (아티팩트 설정이 없는 경우)
   *
   * @example
   * ```typescript
   * const stepData = {
   *   stepType: 'ARTIFACTS',
   *   artifacts: {
   *     files: ['build/**\/*', 'dist/**\/*'],
   *     name: 'MyAppBuildArtifacts',
   *     baseDirectory: 'build'
   *   }
   * };
   *
   * const result = this.processArtifactsNode(stepData);
   * // 결과: { files: ['build/**\/*', 'dist/**\/*'], name: 'MyAppBuildArtifacts', 'base-directory': 'build' }
   * ```
   */
  private processArtifactsNode(
    stepData: PipelineStepData,
  ): BuildSpecArtifacts | undefined {
    if (!stepData.artifacts) {
      return undefined;
    }

    const artifacts: BuildSpecArtifacts = {};

    if (stepData.artifacts.files && stepData.artifacts.files.length > 0) {
      (artifacts as Required<Pick<BuildSpecArtifacts, 'files'>>).files =
        stepData.artifacts.files;
    }

    if (stepData.artifacts.name) {
      (artifacts as Required<Pick<BuildSpecArtifacts, 'name'>>).name =
        stepData.artifacts.name;
    }

    if (stepData.artifacts.baseDirectory) {
      artifacts['base-directory'] = stepData.artifacts.baseDirectory;
    }

    return Object.keys(artifacts).length > 0 ? artifacts : undefined;
  }

  /**
   * 캐시 노드 처리
   *
   * @description CACHE stepType을 가진 노드의 데이터를 AWS CodeBuild buildspec의
   *              cache 섹션 형식으로 변환합니다. 빌드 속도 향상을 위해 캐시할 디렉터리 경로들을
   *              설정하며, 주로 node_modules, .npm, pip cache 등이 대상이 됩니다.
   *
   * @param stepData - CACHE 타입의 파이프라인 단계 데이터 (cache.paths 속성 포함)
   * @returns AWS CodeBuild 캐시 설정 객체 또는 undefined (캐시 경로가 없는 경우)
   *
   * @example
   * ```typescript
   * const stepData = {
   *   stepType: 'CACHE',
   *   cache: {
   *     paths: ['node_modules/**\/*', '.npm/**\/*', '~/.pip/cache/**\/*']
   *   }
   * };
   *
   * const result = this.processCacheNode(stepData);
   * // 결과: { paths: ['node_modules/**\/*', '.npm/**\/*', '~/.pip/cache/**\/*'] }
   * ```
   */
  private processCacheNode(
    stepData: PipelineStepData,
  ): BuildSpecCache | undefined {
    if (!stepData.cache?.paths || stepData.cache.paths.length === 0) {
      return undefined;
    }

    return {
      paths: stepData.cache.paths,
    };
  }

  /**
   * buildspec.yaml을 React Flow JSON 데이터로 역변환
   *
   * @description AWS CodeBuild buildspec.yaml 문자열을 파싱하여 프론트엔드에서 사용할 수 있는
   *              React Flow 파이프라인 데이터 형식으로 역변환합니다. 기존 파이프라인을 시각적으로
   *              편집하거나 가져오기 기능을 구현할 때 유용합니다.
   *
   * @param buildSpecYaml - AWS CodeBuild buildspec.yaml 형식의 YAML 문자열
   * @returns React Flow에서 사용 가능한 파이프라인 데이터 (nodes, edges, viewport 포함)
   *
   * @throws BadRequestException 유효하지 않은 YAML 형식인 경우
   * @throws BadRequestException buildspec.yaml이 객체 형태가 아닌 경우
   *
   * @example
   * ```typescript
   * const yamlString = `
   * version: '0.2'
   * env:
   *   variables:
   *     NODE_ENV: production
   * phases:
   *   build:
   *     commands:
   *       - npm install
   *       - npm run build
   * `;
   *
   * const result = converter.convertFromBuildSpec(yamlString);
   * // 결과: { nodes: [...], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
   * ```
   */
  convertFromBuildSpec(
    buildSpecYaml: string,
  ): PipelineFlowData<PipelineStepData> {
    let buildSpec: BuildSpecYaml;

    try {
      buildSpec = yaml.load(buildSpecYaml) as BuildSpecYaml;
    } catch {
      throw new BadRequestException('유효하지 않은 buildspec.yaml 형식입니다.');
    }

    if (!buildSpec || typeof buildSpec !== 'object') {
      throw new BadRequestException('buildspec.yaml은 객체 형태여야 합니다.');
    }

    const nodes: FlowNode<PipelineStepData>[] = [];
    const edges: FlowEdge[] = [];

    let nodeIndex = 0;
    let yPosition = 100;
    const xPosition = 200;
    const nodeSpacing = 150;

    // ENV 노드 생성
    if (buildSpec.env?.variables) {
      nodes.push({
        id: `env-${nodeIndex++}`,
        type: 'custom',
        position: { x: xPosition, y: yPosition },
        data: {
          label: 'Environment Variables',
          stepType: 'ENV',
          env: buildSpec.env.variables,
        },
      });
      yPosition += nodeSpacing;
    }

    // Phase 노드들 생성
    const phases: Array<{
      key: keyof NonNullable<BuildSpecYaml['phases']>;
      stepType: PipelineStepData['stepType'];
      label: string;
    }> = [
      { key: 'install', stepType: 'INSTALL', label: 'Install' },
      { key: 'pre_build', stepType: 'PRE_BUILD', label: 'Pre Build' },
      { key: 'build', stepType: 'BUILD', label: 'Build' },
      { key: 'post_build', stepType: 'POST_BUILD', label: 'Post Build' },
    ];

    for (const { key, stepType, label } of phases) {
      const phase = buildSpec.phases?.[key];
      if (phase?.commands) {
        nodes.push({
          id: `${key}-${nodeIndex++}`,
          type: 'custom',
          position: { x: xPosition, y: yPosition },
          data: {
            label,
            stepType,
            commands: phase.commands,
            runAs: phase['run-as'],
          },
        });
        yPosition += nodeSpacing;
      }
    }

    // Artifacts 노드 생성
    if (buildSpec.artifacts) {
      nodes.push({
        id: `artifacts-${nodeIndex++}`,
        type: 'custom',
        position: { x: xPosition, y: yPosition },
        data: {
          label: 'Artifacts',
          stepType: 'ARTIFACTS',
          artifacts: {
            files: buildSpec.artifacts?.files,
            name: buildSpec.artifacts?.name,
            baseDirectory: buildSpec.artifacts?.['base-directory'],
          },
        },
      });
      yPosition += nodeSpacing;
    }

    // Cache 노드 생성
    if (buildSpec.cache?.paths) {
      nodes.push({
        id: `cache-${nodeIndex++}`,
        type: 'custom',
        position: { x: xPosition, y: yPosition },
        data: {
          label: 'Cache',
          stepType: 'CACHE',
          cache: {
            paths: buildSpec.cache?.paths,
          },
        },
      });
    }

    return {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }
}
