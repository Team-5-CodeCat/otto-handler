export interface CreateProjectResponseDto {
  projectId: string;
  name: string;
  webhookUrl?: string | null;
  user: {
    userId: string;
    email: string;
    name: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}
