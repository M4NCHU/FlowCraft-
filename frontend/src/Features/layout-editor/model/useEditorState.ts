// Features/layout-editor/model/useEditorState.ts
import { create } from "zustand";
import type {
  LayoutElement,
  LayoutElementType,
  TransportPath,
  HallBoundary,
  LayoutScale,
} from "./layoutTypes";
import { TOOL_DEFINITIONS, type ToolId } from "./tools";

interface SnappingSettings {
  snapToGrid: boolean;
  gridSize: number;
}

interface EditorState {
  elements: LayoutElement[];
  roads: TransportPath[];
  boundary: HallBoundary;
  selectedElementId: string | null;

  pendingMachineId: string | null;
  openMachineDetailsId: string | null;

  activeTool: ToolId;
  snapping: SnappingSettings;

  layoutScale: LayoutScale;

  boundaryRequired: boolean;

  addElementAt: (x: number, y: number) => void;
  addRoad: (road: { points: number[]; width?: number; name?: string }) => void;
  addRoadSegment: (x1: number, y1: number, x2: number, y2: number) => void;
  updateRoad: (id: string, patch: Partial<TransportPath>) => void;
  deleteRoad: (id: string) => void;

  addBoundaryPoint: (x: number, y: number) => void;
  undoBoundaryPoint: () => void;
  closeBoundary: () => void;
  clearBoundary: () => void;

  moveElement: (id: string, x: number, y: number) => void;
  selectElement: (id: string | null) => void;
  updateElement: (id: string, patch: Partial<LayoutElement>) => void;

  setActiveTool: (tool: ToolId) => void;
  setSnapToGrid: (value: boolean) => void;
  setGridSize: (value: number) => void;
  setPendingMachine: (machineId: string | null) => void;
  setOpenMachineDetails: (machineId: string | null) => void;

  setBoundaryRequired: (value: boolean) => void;

  setMetersPerGridCell: (value: number) => void;

  hydrate: (data: {
    elements: LayoutElement[];
    roads: TransportPath[];
    boundary: HallBoundary;
    layoutScale?: LayoutScale;
  }) => void;

  clearAll: () => void;
}

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const defaultElementName = (type: LayoutElementType, index: number) => {
  switch (type) {
    case "department":
      return `Gniazdo ${index}`;
    case "workstation":
      return `Stanowisko ${index}`;
    case "storage":
      return `Magazyn ${index}`;
    case "transport":
      return `Strefa transportowa ${index}`;
    case "area":
      return `Strefa ${index}`;
    case "machine":
      return `Maszyna ${index}`;
    default:
      return `Element ${index}`;
  }
};

export const useEditorState = create<EditorState>((set, get) => ({
  elements: [],
  roads: [],
  boundary: { points: [], closed: false },
  selectedElementId: null,

  pendingMachineId: null,
  openMachineDetailsId: null,

  activeTool: "workstation",
  snapping: { snapToGrid: true, gridSize: 40 },

  layoutScale: { metersPerGridCell: 1 },

  boundaryRequired: false,

  setMetersPerGridCell: (value) => {
    const v = Number.isFinite(value) ? Math.max(0.01, value) : 1;
    set({ layoutScale: { metersPerGridCell: v } });
  },

  setBoundaryRequired: (value) => {
    set({ boundaryRequired: value });
    if (value) set({ activeTool: "boundary" });
  },

  hydrate: ({ elements, roads, boundary, layoutScale }) => {
    const hasBoundary =
      (boundary?.points?.length ?? 0) >= 6 && !!boundary?.closed;

    set({
      elements: elements ?? [],
      roads: roads ?? [],
      boundary: boundary ?? { points: [], closed: false },
      selectedElementId: null,
      openMachineDetailsId: null,
      layoutScale: layoutScale ?? get().layoutScale,
      boundaryRequired: !hasBoundary,
      activeTool: !hasBoundary ? "boundary" : get().activeTool,
    });
  },

  addElementAt: (x, y) => {
    const {
      activeTool,
      elements,
      snapping,
      pendingMachineId,
      boundaryRequired,
      boundary,
    } = get();

    if (boundaryRequired && !boundary.closed) return;
    if (activeTool === "road" || activeTool === "boundary") return;

    const type: LayoutElementType = activeTool as LayoutElementType;
    const toolDef = TOOL_DEFINITIONS.find((t) => t.id === type);
    const gridSize = snapping.gridSize || 40;

    const snap = (v: number) =>
      snapping.snapToGrid ? Math.round(v / gridSize) * gridSize : v;

    const snappedX = snap(x);
    const snappedY = snap(y);

    const countOfType = elements.filter((e) => e.type === type).length;
    const size = toolDef?.defaultSize ?? { width: 2, height: 1 };

    if (type === "machine" && !pendingMachineId) return;

    const id = createId();
    const newElement: LayoutElement = {
      id,
      type,
      name: defaultElementName(type, countOfType + 1),
      x: snappedX,
      y: snappedY,
      width: size.width * gridSize,
      height: size.height * gridSize,
      rotation: 0,
      ...(type === "machine" ? { machineId: pendingMachineId! } : {}),
    };

    set({
      elements: [...elements, newElement],
      selectedElementId: id,
      pendingMachineId: type === "machine" ? null : get().pendingMachineId,
    });
  },

  addRoadSegment: (x1, y1, x2, y2) => {
    const { snapping, roads, boundaryRequired, boundary } = get();
    if (boundaryRequired && !boundary.closed) return;

    const gridSize = snapping.gridSize || 40;
    const snap = (v: number) =>
      snapping.snapToGrid ? Math.round(v / gridSize) * gridSize : v;

    const points = [snap(x1), snap(y1), snap(x2), snap(y2)];

    const newRoad: TransportPath = {
      id: createId(),
      name: `Droga ${roads.length + 1}`,
      points,
      width: gridSize / 4,
    };

    set({ roads: [...roads, newRoad] });
  },

  addRoad: ({ points, width, name }) => {
    const { snapping, roads, boundaryRequired, boundary } = get();
    if (boundaryRequired && !boundary.closed) return;

    const gridSize = snapping.gridSize || 40;
    const snap = (v: number) =>
      snapping.snapToGrid ? Math.round(v / gridSize) * gridSize : v;

    const normalizedPoints = (points ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .map((value) => snap(value));

    if (normalizedPoints.length < 4) return;

    const newRoad: TransportPath = {
      id: createId(),
      name: name?.trim() || `Droga ${roads.length + 1}`,
      points: normalizedPoints,
      width:
        typeof width === "number" && Number.isFinite(width) && width > 0
          ? width
          : gridSize / 4,
    };

    set({ roads: [...roads, newRoad] });
  },

  updateRoad: (id, patch) =>
    set((state) => ({
      roads: state.roads.map((road) =>
        road.id === id
          ? {
              ...road,
              ...patch,
              name: patch.name?.trim() || road.name,
              width:
                typeof patch.width === "number" &&
                Number.isFinite(patch.width) &&
                patch.width > 0
                  ? patch.width
                  : road.width,
              points:
                patch.points
                  ?.map((value) => Number(value))
                  .filter((value) => Number.isFinite(value)) ?? road.points,
            }
          : road,
      ),
    })),

  deleteRoad: (id) =>
    set((state) => ({
      roads: state.roads.filter((road) => road.id !== id),
    })),

  addBoundaryPoint: (x, y) => {
    const { boundary, snapping } = get();
    if (boundary.closed) return;

    const gridSize = snapping.gridSize || 40;
    const snap = (v: number) =>
      snapping.snapToGrid ? Math.round(v / gridSize) * gridSize : v;

    set({
      boundary: { ...boundary, points: [...boundary.points, snap(x), snap(y)] },
    });
  },

  undoBoundaryPoint: () =>
    set((state) => ({
      boundary: {
        ...state.boundary,
        closed: false,
        points: state.boundary.points.slice(0, -2),
      },
    })),

  closeBoundary: () =>
    set((s) => {
      if (s.boundary.points.length < 6) return s;
      return {
        ...s,
        boundary: { ...s.boundary, closed: true },
        boundaryRequired: false,
      };
    }),

  clearBoundary: () => set({ boundary: { points: [], closed: false } }),

  moveElement: (id, x, y) => {
    const { snapping } = get();
    const gridSize = snapping.gridSize || 40;
    const snap = (v: number) =>
      snapping.snapToGrid ? Math.round(v / gridSize) * gridSize : v;

    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id ? { ...e, x: snap(x), y: snap(y) } : e,
      ),
    }));
  },

  selectElement: (id) => set({ selectedElementId: id }),

  updateElement: (id, patch) =>
    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    })),

  setActiveTool: (tool) => {
    const { boundaryRequired, boundary } = get();
    if (boundaryRequired && !boundary.closed && tool !== "boundary") return;
    set({ activeTool: tool });
  },

  setSnapToGrid: (value) =>
    set((state) => ({ snapping: { ...state.snapping, snapToGrid: value } })),

  setGridSize: (value) =>
    set((state) => ({ snapping: { ...state.snapping, gridSize: value } })),

  setPendingMachine: (machineId) => set({ pendingMachineId: machineId }),
  setOpenMachineDetails: (machineId) =>
    set({ openMachineDetailsId: machineId }),

  clearAll: () =>
    set({
      elements: [],
      roads: [],
      boundary: { points: [], closed: false },
      selectedElementId: null,
      openMachineDetailsId: null,
      boundaryRequired: true,
      activeTool: "boundary",
    }),
}));
