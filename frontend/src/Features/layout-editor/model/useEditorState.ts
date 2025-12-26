import { create } from "zustand";
import type {
  LayoutElement,
  LayoutElementType,
  TransportPath,
  HallBoundary,
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

  // maszyny
  pendingMachineId: string | null; // wybrana z palety do osadzenia
  openMachineDetailsId: string | null; // do modala

  activeTool: ToolId;
  snapping: SnappingSettings;

  // dodawanie elementów i dróg
  addElementAt: (x: number, y: number) => void;
  addRoadSegment: (x1: number, y1: number, x2: number, y2: number) => void;

  // obrys hali
  addBoundaryPoint: (x: number, y: number) => void;
  closeBoundary: () => void;
  clearBoundary: () => void;

  // edycja / zaznaczenie
  moveElement: (id: string, x: number, y: number) => void;
  selectElement: (id: string | null) => void;
  updateElement: (id: string, patch: Partial<LayoutElement>) => void;

  // sterowanie
  setActiveTool: (tool: ToolId) => void;
  setSnapToGrid: (value: boolean) => void;
  setGridSize: (value: number) => void;
  setPendingMachine: (machineId: string | null) => void;
  setOpenMachineDetails: (machineId: string | null) => void;

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
  snapping: {
    snapToGrid: true,
    gridSize: 40,
  },

  addElementAt: (x, y) => {
    const { activeTool, elements, snapping, pendingMachineId } = get();

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

    // dla maszyny wymagamy pendingMachineId
    if (type === "machine" && !pendingMachineId) {
      // brak wybranej maszyny — nic nie dodajemy
      return;
    }

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
      // pojedyncze osadzenie — wyczyść wybor maszyny
      pendingMachineId: type === "machine" ? null : get().pendingMachineId,
    });
  },

  addRoadSegment: (x1, y1, x2, y2) => {
    const { snapping, roads } = get();
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

  addBoundaryPoint: (x, y) => {
    const { boundary, snapping } = get();
    if (boundary.closed) return;
    const gridSize = snapping.gridSize || 40;
    const snap = (v: number) =>
      snapping.snapToGrid ? Math.round(v / gridSize) * gridSize : v;
    set({
      boundary: {
        ...boundary,
        points: [...boundary.points, snap(x), snap(y)],
      },
    });
  },

  closeBoundary: () =>
    set((s) => ({
      boundary:
        s.boundary.points.length >= 6
          ? { ...s.boundary, closed: true }
          : s.boundary,
    })),

  clearBoundary: () => set({ boundary: { points: [], closed: false } }),

  moveElement: (id, x, y) => {
    const { snapping } = get();
    const gridSize = snapping.gridSize || 40;
    const snap = (v: number) =>
      snapping.snapToGrid ? Math.round(v / gridSize) * gridSize : v;

    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id ? { ...e, x: snap(x), y: snap(y) } : e
      ),
    }));
  },

  selectElement: (id) => set({ selectedElementId: id }),

  updateElement: (id, patch) =>
    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    })),

  setActiveTool: (tool) => set({ activeTool: tool }),

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
    }),
}));
