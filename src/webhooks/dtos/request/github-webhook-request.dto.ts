import { tags } from 'typia';

export interface GithubWebhookRequestDto {
  action?: string;
  installation?: {
    id: number;
  };
  repository?: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string & tags.Format<'uri'>;
    clone_url: string & tags.Format<'uri'>;
    default_branch: string;
  };
  ref?: string;
  after?: string;
  before?: string;
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string & tags.Format<'email'>;
    };
    url: string & tags.Format<'uri'>;
  }>;
  pull_request?: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
  };
  sender?: {
    id: number;
    login: string;
    type: 'User' | 'Bot';
  };
}
