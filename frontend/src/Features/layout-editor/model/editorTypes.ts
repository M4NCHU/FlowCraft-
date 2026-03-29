import type { AssetStatus } from "../../machines/api/contracts";
import type { HallBoundary } from "./layoutTypes";

export type LayoutEditorMode = "select" | "boundary" | "place-machine";

export interface LayoutSectionOverlay {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  areaSqMeters: number;
  boundary: HallBoundary;
}

export interface LayoutMachineItem {
  assetId: string;
  name: string;
  code: string;
  status: AssetStatus;
  category?: string | null;
  hallId?: string | null;
  sectionId?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  placementId?: string | null;
  placementNotes?: string | null;
  isDirty: boolean;
  openIncidentsCount: number;
  openWorkOrdersCount: number;
}
