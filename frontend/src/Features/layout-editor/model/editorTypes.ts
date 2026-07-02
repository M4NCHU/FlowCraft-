import type { AssetStatus } from "../../machines/api/contracts";
import type { HallBoundary, TransportPath } from "./layoutTypes";

export type LayoutEditorMode =
  | "select"
  | "boundary"
  | "place-machine"
  | "draw-section"
  | "draw-road";

export interface LayoutSectionOverlay {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  areaSqMeters: number;
  boundary: HallBoundary;
}

export type LayoutSectionHealth = "ok" | "warning" | "critical" | "idle";

export interface LayoutSectionPresentationStats {
  machineCount: number;
  incidentsCount: number;
  workOrdersCount: number;
  attentionMachinesCount: number;
  health: LayoutSectionHealth;
}

export interface LayoutMachineItem {
  assetId: string;
  name: string;
  code: string;
  status: AssetStatus;
  category?: string | null;
  hallId?: string | null;
  sectionId?: string | null;
  footprintWidthMeters?: number | null;
  footprintLengthMeters?: number | null;
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

export interface LayoutSectionDraft {
  id?: string | null;
  name: string;
  code: string;
  description: string;
  boundary: HallBoundary;
}

export interface LayoutRoadDraft
  extends Pick<TransportPath, "name" | "width" | "points"> {}
