export type WorkstationStatus = "operational" | "maintenance" | "down";

export interface WorkstationEntity {
  id: string;
  name: string;
  status: WorkstationStatus;
  model?: string;
  description?: string;
}
