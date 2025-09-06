export type GetRepositoriesResponseDto = Array<{
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
}>;


