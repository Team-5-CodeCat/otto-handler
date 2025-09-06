export type GetBranchesResponseDto = Array<{
  name: string;
  protected: boolean;
  commit: {
    sha: string;
    url: string;
  };
}>;
