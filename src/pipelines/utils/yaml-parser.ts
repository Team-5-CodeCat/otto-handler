import yaml from 'js-yaml';
import { YamlStage } from './yaml-type';

export class YamlPipelineParser {
  /**
   * Parse YAML string -> YamlStage[] with validation
   */
  parse(yamlText: string): YamlStage[] {
    let value: unknown;
    try {
      value = yaml.load(yamlText);
    } catch (err) {
      throw new Error(`YAML syntax error: ${(err as Error).message}`);
    }

    // Type assertion and validation
    const stages = value as YamlStage[];

    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error('Parsed YAML must be a non-empty array of stages.');
    }

    // basic per-stage validation
    for (const [i, s] of stages.entries()) {
      if (!s || typeof s !== 'object') {
        throw new Error(`Stage at index ${i} is not an object.`);
      }
      if (typeof s.name !== 'string' || s.name.trim() === '') {
        throw new Error(`Stage at index ${i} missing/invalid 'name'.`);
      }
      if (typeof s.image !== 'string' || s.image.trim() === '') {
        throw new Error(`Stage '${s.name}': missing/invalid 'image'.`);
      }
      if (typeof s.commands !== 'string' || s.commands.trim() === '') {
        throw new Error(`Stage '${s.name}': missing/invalid 'commands'.`);
      }
      if (s.dependencies) {
        if (
          !Array.isArray(s.dependencies) ||
          s.dependencies.some((d) => typeof d !== 'string')
        ) {
          throw new Error(`Stage '${s.name}': 'dependencies' must be string[]`);
        }
      }
      if (
        s.worker_count !== undefined &&
        (!Number.isInteger(s.worker_count) || s.worker_count <= 0)
      ) {
        throw new Error(
          `Stage '${s.name}': 'worker_count' must be positive integer`,
        );
      }
      if (
        s.timeout !== undefined &&
        (!Number.isInteger(s.timeout) || s.timeout < 0)
      ) {
        throw new Error(
          `Stage '${s.name}': 'timeout' must be non-negative integer (seconds)`,
        );
      }
    }

    // unique name check
    const seen = new Set<string>();
    for (const s of stages) {
      if (seen.has(s.name))
        throw new Error(`Duplicate stage name: "${s.name}"`);
      seen.add(s.name);
    }

    // dependency existence
    const names = new Set(stages.map((s) => s.name));
    for (const s of stages) {
      for (const d of s.dependencies ?? []) {
        if (!names.has(d))
          throw new Error(`Stage '${s.name}' depends on unknown stage '${d}'`);
      }
    }

    // cycle detection
    this.assertAcyclic(stages);

    // normalization: fill defaults and trim commands
    return stages.map((s) => ({
      ...s,
      commands: s.commands.trim(),
      dependencies: s.dependencies ?? [],
      worker_count: s.worker_count ?? 1,
      timeout: s.timeout ?? 600,
      config: s.config ?? {},
    }));
  }

  private assertAcyclic(stages: YamlStage[]) {
    const graph = new Map<string, string[]>();
    stages.forEach((s) => graph.set(s.name, s.dependencies ?? []));

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: string) => {
      if (visiting.has(node)) {
        throw new Error(`Dependency cycle detected at "${node}"`);
      }
      if (visited.has(node)) return;
      visiting.add(node);
      const neighbors = graph.get(node) ?? [];
      for (const n of neighbors) dfs(n);
      visiting.delete(node);
      visited.add(node);
    };

    for (const s of stages) dfs(s.name);
  }
}
