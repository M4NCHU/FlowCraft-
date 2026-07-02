export type LayoutElementType =
  | "department"
  | "workstation"
  | "storage"
  | "transport"
  | "area"
  | "machine";

export interface LayoutElement {
  id: string;
  type: LayoutElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked?: boolean;
  machineId?: string;
}

export interface TransportPath {
  id: string;
  name: string;
  points: number[];
  width: number;
}
export interface LayoutScale {
  metersPerGridCell: number;
  gridSize?: number;
}

export interface HallBoundary {
  points: number[];
  closed: boolean;
}

export interface HallOutlineDtoV2 {
  boundary: HallBoundary;
  scale?: LayoutScale;
  roads?: TransportPath[];
}
