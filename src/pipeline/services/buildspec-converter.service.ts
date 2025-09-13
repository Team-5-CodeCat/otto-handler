import { Injectable, BadRequestException } from '@nestjs/common';
import * as yaml from 'js-yaml';
import type { PipelineFlowData, FlowNode, FlowEdge } from '../dto/common';

/**
 * AWS CodeBuild buildspec.yml 구조 인터페이스
 */
interface BuildSpecPhase {
  'run-as'?: string;
  commands?: string[];
  finally?: string[];
}

interface BuildSpecEnv {
  variables?: Record<string, string>;
  'parameter-store'?: Record<string, string>;
  'secrets-manager'?: Record<string, string>;
}

interface BuildSpecArtifacts {
  files?: string[];
  name?: string;
  'discard-paths'?: 'yes' | 'no';
  'base-directory'?: string;
}

interface BuildSpecCache {
  paths?: string[];
}

export interface BuildSpecYaml {
  version: string;
  env?: BuildSpecEnv;
  phases?: {
    install?: BuildSpecPhase;
    pre_build?: BuildSpecPhase;
    build?: BuildSpecPhase;
    post_build?: BuildSpecPhase;
  };
  artifacts?: BuildSpecArtifacts;
  cache?: BuildSpecCache;
}

/**
 * React Flow 노드에서 사용되는 파이프라인 단계 데이터
 */
interface PipelineStepData {
  label: string;
  stepType:
    | 'INSTALL'
    | 'PRE_BUILD'
    | 'BUILD'
    | 'POST_BUILD'
    | 'ENV'
    | 'ARTIFACTS'
    | 'CACHE';
  commands?: string[];
  env?: Record<string, string>;
  artifacts?: {
    files?: string[];
    name?: string;
    baseDirectory?: string;
  };
  cache?: {
    paths?: string[];
  };
  runAs?: string;
}

@Injectable()
export class BuildSpecConverterService {
  /**
   * React Flow JSON 데이터를 AWS CodeBuild buildspec.yaml로 변환
   */
  convertToBuildSpec(
    pipelineData: PipelineFlowData,
  ): string {
    if (!pipelineData || !pipelineData.nodes) {
      throw new BadRequestException('파이프라인 데이터가 없습니다.');
    }

    const buildSpec: BuildSpecYaml = {
      version: '0.2',
    };

    // 노드들을 단계별로 분류하고 처리
    const { phases, env, artifacts, cache } = this.processNodes(
      pipelineData.nodes as FlowNode<PipelineStepData>[],
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
   */
  private processNodes(
    nodes: FlowNode<PipelineStepData>[],
  ) {
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
   */
  private processEnvNode(
    stepData: PipelineStepData,
  ): BuildSpecEnv | undefined {
    if (!stepData.env || Object.keys(stepData.env).length === 0) {
      return undefined;
    }

    return {
      variables: stepData.env,
    };
  }

  /**
   * 빌드 단계 노드 처리
   */
  private processPhaseNode(
    stepData: PipelineStepData,
  ): BuildSpecPhase {
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
   */
  private processArtifactsNode(stepData: PipelineStepData): BuildSpecArtifacts | undefined {
    if (!stepData.artifacts) {
      return undefined;
    }

    const artifacts: BuildSpecArtifacts = {};

    if (stepData.artifacts.files && stepData.artifacts.files.length > 0) {
      artifacts.files = stepData.artifacts.files;
    }

    if (stepData.artifacts.name) {
      artifacts.name = stepData.artifacts.name;
    }

    if (stepData.artifacts.baseDirectory) {
      artifacts['base-directory'] = stepData.artifacts.baseDirectory;
    }

    return Object.keys(artifacts).length > 0 ? artifacts : undefined;
  }

  /**
   * 캐시 노드 처리
   */
  private processCacheNode(stepData: PipelineStepData): BuildSpecCache | undefined {
    if (!stepData.cache?.paths || stepData.cache.paths.length === 0) {
      return undefined;
    }

    return {
      paths: stepData.cache.paths,
    };
  }

  /**
   * buildspec.yaml을 React Flow JSON 데이터로 역변환 (참고용)
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
            files: buildSpec.artifacts.files,
            name: buildSpec.artifacts.name,
            baseDirectory: buildSpec.artifacts['base-directory'],
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
            paths: buildSpec.cache.paths,
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