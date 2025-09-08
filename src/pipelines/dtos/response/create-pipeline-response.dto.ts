export interface CreatePipelineResponseDto {
  pipelineID: string;
  name: string;
  version: number;
  active: boolean;
  projectID: string;
  owner: string | null;
  pipelineSpec: KVType; // JSON 객체
  originalSpec: string | null;
  normalizedSpec: KVType | null; // JSON 객체
  specHash?: string | null;
  createdAt: string;
  updatedAt: string;
}
export type KVType = Record<string, unknown>;
