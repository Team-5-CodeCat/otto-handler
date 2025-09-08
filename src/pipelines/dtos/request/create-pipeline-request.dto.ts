import { tags } from 'typia';

export interface CreatePipelineRequestDto {
  name: string & tags.MinLength<1> & tags.MaxLength<255>;
  yamlContent: string & tags.MinLength<1>;
  projectID: string & tags.Format<'uuid'>;
  isBlockBased?: boolean;
  version?: number;
}
