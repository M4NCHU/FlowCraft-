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
  machineId?: string; // tylko dla type: "machine"
}

export interface TransportPath {
  id: string;
  name: string;
  points: number[]; // [x1, y1, x2, y2, ...]
  width: number;
}

export interface HallBoundary {
  points: number[]; // [x1, y1, x2, y2, ...]
  closed: boolean;
}
