export interface YamlStage {
  name: string;
  image: string;
  commands: string;
  dependencies?: string[];
  worker_count?: number;
  timeout?: number; // seconds
  config?: Record<string, unknown>;
}

export interface ProjectInfo {
  projectId: string;
  projectName: string;
  repository: string;
  commitSha: string;
  userId: string;
  branch: string;
  prNumber?: number | string;
}
