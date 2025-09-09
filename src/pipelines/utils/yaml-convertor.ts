/* src/converter.ts */

import { ProjectInfo, YamlStage } from './yaml-type';
import {
  PipelineRequest,
  PipelineStage,
  RetryPolicy,
  StageType,
} from '../../generated/otto';

/**
 * Convert YamlStage[] -> proto PipelineRequest
 */
export class YamlToProtoConverter {
  convertToPipelineRequest(
    yamlStages: YamlStage[],
    projectInfo: ProjectInfo,
  ): PipelineRequest {
    const pipelineId = `pipeline-${projectInfo.projectId}-${Date.now()}`;

    const protoStages: PipelineStage[] = yamlStages.map((s) =>
      this.convertStage(s),
    );

    return {
      pipelineId,
      name: `${projectInfo.projectName} CI/CD Pipeline`,
      stages: protoStages,
      repository: projectInfo.repository,
      commitSha: projectInfo.commitSha,
      triggeredBy: projectInfo.userId,
      metadata: {
        branch: projectInfo.branch,
        pr_number: projectInfo.prNumber?.toString() ?? '',
        project_id: projectInfo.projectId,
      },
    };
  }

  private convertStage(s: YamlStage): PipelineStage {
    const processed = this.processCommands(s.commands);

    // config를 Record<string, string>으로 변환
    const configAsStrings = this.convertConfigToStrings(s.config);

    const stage: PipelineStage = {
      stageId: s.name,
      type: this.detectStageType(s.name),
      name: this.formatStageName(s.name),
      workerCount: s.worker_count ?? 1,
      dependsOn: s.dependencies ?? [],
      config: configAsStrings,
      image: s.image,
      command: ['sh', '-c'],
      args: [processed],
      timeoutSeconds: s.timeout ?? 600,
      retryPolicy: undefined,
    };

    // Optionally, infer basic retryPolicy (not present in YAML examples)
    // leave undefined unless user supplies something in s.config like retry.* keys
    const rp = this.inferRetryPolicyFromConfig(configAsStrings);
    if (rp) stage.retryPolicy = rp;

    return stage;
  }

  private processCommands(commands: string): string {
    const trimmed = commands.trim();
    // If user already added set -e or shebang, don't duplicate
    if (/^#!/m.test(trimmed) || /^set -e/m.test(trimmed)) {
      return trimmed;
    }
    return `set -e\n${trimmed}`;
  }

  private detectStageType(name: string): StageType {
    const n = name.toLowerCase();
    if (n.includes('setup') || n.includes('install'))
      return StageType.STAGE_TYPE_SETUP;
    if (n.includes('build') || n.includes('compile') || n.includes('package'))
      return StageType.STAGE_TYPE_BUILD;
    if (n.includes('test') || n.includes('lint') || n.includes('typecheck'))
      return StageType.STAGE_TYPE_TEST;
    if (n.includes('deploy') || n.includes('preview') || n.includes('release'))
      return StageType.STAGE_TYPE_DEPLOY;
    if (n.includes('cleanup') || n.includes('clean') || n.includes('teardown'))
      return StageType.STAGE_TYPE_CLEANUP;
    if (n.includes('notify') || n.includes('slack') || n.includes('email'))
      return StageType.STAGE_TYPE_NOTIFY;
    if (n.includes('approve') || n.includes('approval'))
      return StageType.STAGE_TYPE_APPROVAL;
    return StageType.STAGE_TYPE_CUSTOM;
  }

  private formatStageName(name: string): string {
    return name
      .split(/[-_]/)
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  private convertConfigToStrings(
    config?: Record<string, unknown>,
  ): Record<string, string> {
    if (!config) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (value === undefined || value === null) {
        continue;
      }
      // Handle different types appropriately
      if (typeof value === 'object') {
        result[key] = JSON.stringify(value);
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        result[key] = String(value);
      } else {
        // For other types, use JSON.stringify
        result[key] = JSON.stringify(value);
      }
    }
    return result;
  }

  private inferRetryPolicyFromConfig(
    config?: Record<string, string>,
  ): RetryPolicy | undefined {
    if (!config) return undefined;
    // convention: config may include keys like retry.maxAttempts, retry.delaySeconds
    const maxAttempts = config['retry.maxAttempts']
      ? Number(config['retry.maxAttempts'])
      : undefined;
    const retryDelaySeconds = config['retry.delaySeconds']
      ? Number(config['retry.delaySeconds'])
      : undefined;
    if (maxAttempts && retryDelaySeconds) {
      return {
        maxAttempts,
        retryDelaySeconds,
        retryableFailures: (config['retry.retryableFailures'] ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
    }
    return undefined;
  }
}
