export interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetails extends ProjectSummary {
  layoutsCount: number;
}
