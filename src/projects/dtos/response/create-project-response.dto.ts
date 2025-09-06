export interface CreateProjectResponseDto {
  projectID: string;
  name: string;
  webhookUrl?: string | null;
  user: {
    userID: string;
    email: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}


