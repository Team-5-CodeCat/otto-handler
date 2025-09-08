import { JsonValue } from '@prisma/client/runtime/library';

export interface CreatePipelineResponseDto {
  pipelineID: string;
  name: string;
  version: number;
  active: boolean;
  projectID: string;
  isBlockBased: boolean;
  owner?: string | null;
  pipelineSpec: JsonValue; // JSON 객체
  originalSpec?: string | null;
  normalizedSpec?: JsonValue | null; // JSON 객체
  specHash?: string | null;
  createdAt: string;
  updatedAt: string;
}
