import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import {
  createSection,
  deleteSection,
  getHallDetails,
  updateHall,
  updateSection,
} from "../../halls/api/hallsApi";
import type {
  HallDetailsResponse,
  HallSectionResponse,
} from "../../halls/api/contracts";
import { failureReportsApi } from "../../incidents/api/failureReportsApi";
import type { FailureReportDto } from "../../incidents/api/contracts";
import { assetsApi } from "../../machines/api/assetsApi";
import {
  AssetType,
  type AssetDetailsDto,
  type PlaceAssetRequest,
} from "../../machines/api/contracts";
import type {
  LayoutEditorMode,
  LayoutMachineItem,
  LayoutRoadDraft,
  LayoutSectionDraft,
  LayoutSectionPresentationStats,
  LayoutSectionOverlay,
} from "../model/editorTypes";
import type {
  HallBoundary,
  HallOutlineDtoV2,
  LayoutScale,
  TransportPath,
} from "../model/layoutTypes";
import { useEditorState } from "../model/useEditorState";
import {
  validateLayout,
  type LayoutValidationIssue,
} from "../lib/layoutValidation";
import { HallCanvas } from "./HallCanvas";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { SnappingControls } from "./SnappingControls";
import type { MachinePaletteItem } from "./components/MachinePalette";

type ParsedOutline = {
  boundary: HallBoundary;
  scale?: HallOutlineDtoV2["scale"];
  roads: TransportPath[];
};

function parseBoundary(value: unknown): HallBoundary | null {
  if (!value || typeof value !== "object") return null;

  if ("points" in value && Array.isArray((value as { points?: unknown }).points)) {
    const points = (value as { points: unknown[] }).points
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));

    return {
      points,
      closed: Boolean((value as { closed?: boolean }).closed),
    };
  }

  return null;
}
function parseRoads(value: unknown): TransportPath[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;

      const points = Array.isArray((item as { points?: unknown }).points)
        ? (item as { points: unknown[] }).points
            .map((point) => Number(point))
            .filter((point) => Number.isFinite(point))
        : [];

      const width = Number((item as { width?: unknown }).width);
      const name = String(
        (item as { name?: unknown }).name ?? `Droga ${index + 1}`
      ).trim();
      const id = String(
        (item as { id?: unknown }).id ?? `road-${index + 1}`
      ).trim();

      if (points.length < 4) return null;

      return {
        id,
        name: name || `Droga ${index + 1}`,
        points,
        width: Number.isFinite(width) && width > 0 ? width : 10,
      } satisfies TransportPath;
    })
    .filter(Boolean) as TransportPath[];
}

function parseOutlineJson(outlineJson: string | null | undefined): ParsedOutline {
  const raw = (outlineJson ?? "").trim();
  if (!raw) return { boundary: { points: [], closed: false }, roads: [] };

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      const points = parsed
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));
      return {
        boundary: { points, closed: points.length >= 6 },
        roads: [],
      };
    }

    const directBoundary = parseBoundary(parsed);
    if (directBoundary) {
      return { boundary: directBoundary, roads: [] };
    }

    if (parsed && typeof parsed === "object" && "boundary" in parsed) {
      const boundary = parseBoundary((parsed as { boundary?: unknown }).boundary);
      const roads = parseRoads((parsed as { roads?: unknown }).roads);
      const scaleCandidate =
        (parsed as { scale?: { metersPerGridCell?: unknown } }).scale
          ?.metersPerGridCell;
      const gridSizeCandidate =
        (parsed as { scale?: { gridSize?: unknown } }).scale?.gridSize;

      return {
        boundary: boundary ?? { points: [], closed: false },
        roads,
        scale:
          typeof scaleCandidate === "number" && Number.isFinite(scaleCandidate)
            ? {
                metersPerGridCell: Math.max(0.01, scaleCandidate),
                gridSize:
                  typeof gridSizeCandidate === "number" &&
                  Number.isFinite(gridSizeCandidate) &&
                  gridSizeCandidate > 0
                    ? gridSizeCandidate
                    : undefined,
              }
            : undefined,
      };
    }
  } catch {
    return { boundary: { points: [], closed: false }, roads: [] };
  }

  return { boundary: { points: [], closed: false }, roads: [] };
}

function buildOutlineJson(
  boundary: HallBoundary,
  metersPerGridCell: number,
  gridSize: number,
  roads: TransportPath[] = []
) {
  return JSON.stringify({
    boundary,
    scale: { metersPerGridCell, gridSize },
    roads,
  });
}

function extractCurrentPlacement(asset: AssetDetailsDto) {
  return (
    [...asset.placements]
      .filter((placement) => placement.isCurrent)
      .sort(
        (left, right) =>
          Date.parse(right.placedAtUtc) - Date.parse(left.placedAtUtc)
      )[0] ?? null
  );
}
function pointInPolygon(point: { x: number; y: number }, polygon: number[]) {
  let inside = false;

  for (
    let left = 0, right = polygon.length - 2;
    left < polygon.length;
    right = left, left += 2
  ) {
    const xi = polygon[left];
    const yi = polygon[left + 1];
    const xj = polygon[right];
    const yj = polygon[right + 1];

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function getMachinePolygon(
  machine: Pick<
    LayoutMachineItem,
    "x" | "y" | "width" | "height" | "rotationDeg"
  >
) {
  const angle = ((machine.rotationDeg ?? 0) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    { x: 0, y: 0 },
    { x: machine.width, y: 0 },
    { x: machine.width, y: machine.height },
    { x: 0, y: machine.height },
  ].map((point) => ({
    x: machine.x + point.x * cos - point.y * sin,
    y: machine.y + point.x * sin + point.y * cos,
  }));
}

function getMachineCenter(
  machine: Pick<
    LayoutMachineItem,
    "x" | "y" | "width" | "height" | "rotationDeg"
  >
) {
  const polygon = getMachinePolygon(machine);
  const sum = polygon.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / polygon.length,
    y: sum.y / polygon.length,
  };
}

function sectionContainsMachine(
  machine: Pick<
    LayoutMachineItem,
    "x" | "y" | "width" | "height" | "rotationDeg"
  >,
  section: LayoutSectionOverlay
) {
  const polygon = getMachinePolygon(machine);
  return polygon.every((point) => pointInPolygon(point, section.boundary.points));
}

function inferSectionId(
  machine: Pick<
    LayoutMachineItem,
    "x" | "y" | "width" | "height" | "rotationDeg"
  >,
  sections: LayoutSectionOverlay[]
) {
  const containingSection = sections.find((section) =>
    sectionContainsMachine(machine, section)
  );
  if (containingSection) return containingSection.id;

  const center = getMachineCenter(machine);
  return sections.find((section) => pointInPolygon(center, section.boundary.points))?.id ?? null;
}

function autoAssignMachinesToSections(
  machines: LayoutMachineItem[],
  sections: LayoutSectionOverlay[]
) {
  return machines.map((machine) => {
    if (machine.sectionId) return machine;

    const inferredSectionId = inferSectionId(machine, sections);
    if (!inferredSectionId) return machine;

    return {
      ...machine,
      sectionId: inferredSectionId,
      isDirty: true,
    };
  });
}

function mapSection(section: HallSectionResponse): LayoutSectionOverlay | null {
  const parsed = parseOutlineJson(section.outlineJson);
  if (parsed.boundary.points.length < 6) return null;

  return {
    id: section.id,
    name: section.name,
    code: section.code,
    description: section.description,
    areaSqMeters: section.areaSqMeters,
    boundary: parsed.boundary,
  };
}

function getMachineFootprintSizePx(
  asset: Pick<AssetDetailsDto, "footprintWidthMeters" | "footprintLengthMeters">,
  metersPerGridCell: number,
  gridSize: number
) {
  const widthMeters = Number(asset.footprintWidthMeters);
  const lengthMeters = Number(asset.footprintLengthMeters);

  if (
    !Number.isFinite(widthMeters) ||
    !Number.isFinite(lengthMeters) ||
    widthMeters <= 0 ||
    lengthMeters <= 0 ||
    metersPerGridCell <= 0 ||
    gridSize <= 0
  ) {
    return null;
  }

  const pixelsPerMeter = gridSize / metersPerGridCell;

  return {
    width: widthMeters * pixelsPerMeter,
    height: lengthMeters * pixelsPerMeter,
  };
}

function toMachineItem(
  asset: AssetDetailsDto,
  hallId: string,
  sections: LayoutSectionOverlay[],
  gridSize: number,
  metersPerGridCell: number
): LayoutMachineItem | null {
  const currentPlacement = extractCurrentPlacement(asset);
  if (!currentPlacement || currentPlacement.hallId !== hallId) return null;

  const footprintSize = getMachineFootprintSizePx(
    asset,
    metersPerGridCell,
    gridSize
  );
  const width = footprintSize?.width ?? (Number(currentPlacement.width) || gridSize * 2);
  const height = footprintSize?.height ?? (Number(currentPlacement.height) || gridSize * 2);

  return {
    assetId: asset.id,
    name: asset.name,
    code: asset.code,
    status: asset.status,
    category: asset.category,
    hallId: currentPlacement.hallId,
    footprintWidthMeters: asset.footprintWidthMeters ?? null,
    footprintLengthMeters: asset.footprintLengthMeters ?? null,
    sectionId:
      currentPlacement.sectionId ??
      inferSectionId(
        {
          x: Number(currentPlacement.x),
          y: Number(currentPlacement.y),
          width,
          height,
          rotationDeg: Number(currentPlacement.rotationDeg) || 0,
        },
        sections
      ),
    x: Number(currentPlacement.x),
    y: Number(currentPlacement.y),
    width,
    height,
    rotationDeg: Number(currentPlacement.rotationDeg) || 0,
    placementId: currentPlacement.id,
    placementNotes: currentPlacement.notes ?? null,
    isDirty: false,
    openIncidentsCount: asset.failureReportsCount,
    openWorkOrdersCount: asset.workOrdersCount,
  };
}

function computePolygonAreaSqMeters(boundary: HallBoundary, metersPerPx: number) {
  if (!boundary.closed || boundary.points.length < 6) return 0;

  let area = 0;
  for (let index = 0; index < boundary.points.length; index += 2) {
    const nextIndex = (index + 2) % boundary.points.length;
    area +=
      boundary.points[index] * boundary.points[nextIndex + 1] -
      boundary.points[nextIndex] * boundary.points[index + 1];
  }

  return Math.abs(area / 2) * metersPerPx * metersPerPx;
}

function computePolylineLength(points: number[]) {
  let length = 0;

  for (let index = 2; index < points.length; index += 2) {
    const dx = points[index] - points[index - 2];
    const dy = points[index + 1] - points[index - 1];
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
}

function formatMetricValue(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits,
  }).format(value);
}

function createDefaultSectionDraft(index: number): LayoutSectionDraft {
  return {
    id: null,
    name: `Sekcja ${index}`,
    code: "",
    description: "",
    boundary: { points: [], closed: false },
  };
}

function createDefaultRoadDraft(index: number, defaultWidth: number): LayoutRoadDraft {
  return {
    name: `Droga ${index}`,
    width: defaultWidth,
    points: [],
  };
}

function getSectionPresentationStats(
  sectionId: string,
  machines: LayoutMachineItem[]
): LayoutSectionPresentationStats {
  const sectionMachines = machines.filter((machine) => machine.sectionId === sectionId);
  const incidentsCount = sectionMachines.reduce(
    (sum, machine) => sum + machine.openIncidentsCount,
    0
  );
  const workOrdersCount = sectionMachines.reduce(
    (sum, machine) => sum + machine.openWorkOrdersCount,
    0
  );
  const attentionMachinesCount = sectionMachines.filter(
    (machine) => machine.openIncidentsCount > 0 || machine.openWorkOrdersCount > 0
  ).length;

  let health: LayoutSectionPresentationStats["health"] = "idle";
  if (sectionMachines.length > 0) {
    health =
      incidentsCount > 0
        ? "critical"
        : workOrdersCount > 0
          ? "warning"
          : "ok";
  }

  return {
    machineCount: sectionMachines.length,
    incidentsCount,
    workOrdersCount,
    attentionMachinesCount,
    health,
  };
}

interface EditorSnapshot {
  boundary: HallBoundary;
  boundaryRequired: boolean;
  roads: TransportPath[];
  layoutScale: LayoutScale;
  placedMachines: LayoutMachineItem[];
  removedMachineAssetIds?: string[];
  sectionDraft: LayoutSectionDraft | null;
  roadDraft: LayoutRoadDraft | null;
  mode: LayoutEditorMode;
  selectedAssetId: string | null;
  selectedSectionId: string | null;
  selectedRoadId: string | null;
  pendingMachineId: string | null;
}

interface PersistedLayoutDraft {
  hallId: string;
  savedAtUtc: string;
  snapshot: EditorSnapshot;
}

function cloneBoundary(boundary: HallBoundary): HallBoundary {
  return {
    points: [...boundary.points],
    closed: boundary.closed,
  };
}

function cloneRoad(road: TransportPath): TransportPath {
  return {
    ...road,
    points: [...road.points],
  };
}

function cloneMachine(machine: LayoutMachineItem): LayoutMachineItem {
  return { ...machine };
}

function cloneSectionDraft(sectionDraft: LayoutSectionDraft | null) {
  if (!sectionDraft) return null;

  return {
    ...sectionDraft,
    boundary: cloneBoundary(sectionDraft.boundary),
  };
}

function cloneRoadDraft(roadDraft: LayoutRoadDraft | null) {
  if (!roadDraft) return null;

  return {
    ...roadDraft,
    points: [...roadDraft.points],
  };
}

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    boundary: cloneBoundary(snapshot.boundary),
    boundaryRequired: snapshot.boundaryRequired,
    roads: snapshot.roads.map(cloneRoad),
    layoutScale: { ...snapshot.layoutScale },
    placedMachines: snapshot.placedMachines.map(cloneMachine),
    removedMachineAssetIds: [...(snapshot.removedMachineAssetIds ?? [])],
    sectionDraft: cloneSectionDraft(snapshot.sectionDraft),
    roadDraft: cloneRoadDraft(snapshot.roadDraft),
    mode: snapshot.mode,
    selectedAssetId: snapshot.selectedAssetId,
    selectedSectionId: snapshot.selectedSectionId,
    selectedRoadId: snapshot.selectedRoadId,
    pendingMachineId: snapshot.pendingMachineId,
  };
}

function serializeSnapshot(snapshot: EditorSnapshot) {
  return JSON.stringify(snapshot);
}

function getDraftStorageKey(hallId: string) {
  return `flowcraft-layout-editor:${hallId}`;
}

function readPersistedDraft(hallId: string): PersistedLayoutDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(hallId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedLayoutDraft;
    if (!parsed || parsed.hallId !== hallId || !parsed.snapshot) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writePersistedDraft(draft: PersistedLayoutDraft) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getDraftStorageKey(draft.hallId),
      JSON.stringify(draft)
    );
  } catch {
    // Ignore local draft persistence errors.
  }
}

function clearPersistedDraft(hallId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(getDraftStorageKey(hallId));
  } catch {
    // Ignore storage cleanup errors.
  }
}

export function LayoutEditorScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const historyGuardRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hall, setHall] = useState<HallDetailsResponse | null>(null);
  const [machineCatalog, setMachineCatalog] = useState<AssetDetailsDto[]>([]);
  const [placedMachines, setPlacedMachines] = useState<LayoutMachineItem[]>([]);
  const [removedMachineAssetIds, setRemovedMachineAssetIds] = useState<string[]>([]);
  const [openIncidents, setOpenIncidents] = useState<FailureReportDto[]>([]);
  const [sectionDraft, setSectionDraft] = useState<LayoutSectionDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [deletingSection, setDeletingSection] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);
  const [pendingMachineId, setPendingMachineId] = useState<string | null>(null);
  const [roadDraft, setRoadDraft] = useState<LayoutRoadDraft | null>(null);
  const [mode, setMode] = useState<LayoutEditorMode>("select");
  const [historyState, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [attentionMode, setAttentionMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [recoverableDraft, setRecoverableDraft] =
    useState<PersistedLayoutDraft | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const hallId = searchParams.get("hallId");
  const focusedMachineId = searchParams.get("machineId");

  const {
    roads,
    boundary,
    boundaryRequired,
    snapping,
    layoutScale,
    addRoad,
    updateRoad,
    deleteRoad,
    undoBoundaryPoint,
    clearAll,
    clearBoundary,
    hydrate,
    setBoundaryRequired,
    setSnapToGrid,
    setGridSize,
    setMetersPerGridCell,
  } = useEditorState();

  const [savedOutlineSignature, setSavedOutlineSignature] = useState("");

  const syncHistoryState = () => {
    setHistoryState({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  };

  const captureSnapshot = (): EditorSnapshot => ({
    boundary: cloneBoundary(boundary),
    boundaryRequired,
    roads: roads.map(cloneRoad),
    layoutScale: {
      ...layoutScale,
      gridSize: snapping.gridSize || 40,
    },
    placedMachines: placedMachines.map(cloneMachine),
    removedMachineAssetIds: [...removedMachineAssetIds],
    sectionDraft: cloneSectionDraft(sectionDraft),
    roadDraft: cloneRoadDraft(roadDraft),
    mode,
    selectedAssetId,
    selectedSectionId,
    selectedRoadId,
    pendingMachineId,
  });

  const applySnapshot = (snapshot: EditorSnapshot) => {
    historyGuardRef.current = true;

    hydrate({
      elements: [],
      roads: snapshot.roads.map(cloneRoad),
      boundary: cloneBoundary(snapshot.boundary),
      layoutScale: { ...snapshot.layoutScale },
    });
    setGridSize(snapshot.layoutScale.gridSize ?? 40);
    setBoundaryRequired(snapshot.boundaryRequired);
    setPlacedMachines(snapshot.placedMachines.map(cloneMachine));
    setRemovedMachineAssetIds([...(snapshot.removedMachineAssetIds ?? [])]);
    setSectionDraft(cloneSectionDraft(snapshot.sectionDraft));
    setRoadDraft(cloneRoadDraft(snapshot.roadDraft));
    setSelectedAssetId(snapshot.selectedAssetId);
    setSelectedSectionId(snapshot.selectedSectionId);
    setSelectedRoadId(snapshot.selectedRoadId);
    setPendingMachineId(snapshot.pendingMachineId);
    setMode(snapshot.mode);
    historyGuardRef.current = false;
  };

  const clearHistory = () => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryState();
  };

  const pushHistorySnapshot = () => {
    if (historyGuardRef.current) return;

    const snapshot = cloneSnapshot(captureSnapshot());
    const nextSignature = serializeSnapshot(snapshot);
    const previousSnapshot = undoStackRef.current[undoStackRef.current.length - 1];
    if (previousSnapshot && serializeSnapshot(previousSnapshot) === nextSignature) {
      return;
    }

    undoStackRef.current.push(snapshot);
    redoStackRef.current = [];
    syncHistoryState();
  };

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const sections = useMemo(
    () => ((hall?.sections ?? []).map(mapSection).filter(Boolean) as LayoutSectionOverlay[]),
    [hall?.sections]
  );

  const visibleSections = useMemo(() => {
    if (!sectionDraft?.id) return sections;
    return sections.filter((section) => section.id !== sectionDraft.id);
  }, [sectionDraft?.id, sections]);

  const draftValidationSection = useMemo<LayoutSectionOverlay | null>(() => {
    if (
      !sectionDraft ||
      !sectionDraft.boundary.closed ||
      sectionDraft.boundary.points.length < 6
    ) {
      return null;
    }

    const metersPerPx = layoutScale.metersPerGridCell / (snapping.gridSize || 40);

    return {
      id: sectionDraft.id ?? "__draft-section__",
      name: sectionDraft.name.trim() || "Nowa sekcja",
      code: sectionDraft.code.trim() || null,
      description: sectionDraft.description.trim() || null,
      areaSqMeters: computePolygonAreaSqMeters(sectionDraft.boundary, metersPerPx),
      boundary: cloneBoundary(sectionDraft.boundary),
    };
  }, [
    layoutScale.metersPerGridCell,
    sectionDraft,
    snapping.gridSize,
  ]);

  const validationSections = useMemo(() => {
    if (!draftValidationSection) return sections;

    return sectionDraft?.id
      ? sections.map((section) =>
          section.id === draftValidationSection.id ? draftValidationSection : section
        )
      : [...sections, draftValidationSection];
  }, [draftValidationSection, sectionDraft?.id, sections]);

  const validationMachines = useMemo(
    () => autoAssignMachinesToSections(placedMachines, validationSections),
    [placedMachines, validationSections]
  );

  const outlineSignature = useMemo(
    () =>
      JSON.stringify({
        boundary,
        roads,
        scale: {
          metersPerGridCell: layoutScale.metersPerGridCell,
          gridSize: snapping.gridSize || 40,
        },
      }),
    [boundary, layoutScale.metersPerGridCell, roads, snapping.gridSize]
  );

  const machineCatalogItems = useMemo<MachinePaletteItem[]>(() => {
    const placedIds = new Set(placedMachines.map((machine) => machine.assetId));
    return machineCatalog
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, "pl"))
      .map((machine) => ({
        id: machine.id,
        name: machine.name,
        code: machine.code,
        category: machine.category,
        status: machine.status,
        isPlacedOnCurrentHall: placedIds.has(machine.id),
      }));
  }, [machineCatalog, placedMachines]);

  const selectedMachine = useMemo(
    () => placedMachines.find((machine) => machine.assetId === selectedAssetId) ?? null,
    [placedMachines, selectedAssetId]
  );
  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId]
  );
  const pendingMachineLabel = useMemo(() => {
    const machine = machineCatalog.find((item) => item.id === pendingMachineId);
    return machine ? `${machine.name} (${machine.code})` : undefined;
  }, [machineCatalog, pendingMachineId]);
  const pendingMachinePreview = useMemo(() => {
    const machine = machineCatalog.find((item) => item.id === pendingMachineId);
    if (!machine) return undefined;

    return getMachineFootprintSizePx(
      machine,
      layoutScale.metersPerGridCell,
      snapping.gridSize || 40
    );
  }, [
    layoutScale.metersPerGridCell,
    machineCatalog,
    pendingMachineId,
    snapping.gridSize,
  ]);
  const sectionStatsById = useMemo<Record<string, LayoutSectionPresentationStats>>(
    () =>
      Object.fromEntries(
        sections.map((section) => [
          section.id,
          getSectionPresentationStats(section.id, placedMachines),
        ])
      ),
    [placedMachines, sections]
  );
  const hallPresentationStats = useMemo(() => {
    const totalMachines = placedMachines.length;
    const activeIncidents = placedMachines.reduce(
      (sum, machine) => sum + machine.openIncidentsCount,
      0
    );
    const openWorkOrders = placedMachines.reduce(
      (sum, machine) => sum + machine.openWorkOrdersCount,
      0
    );
    const sectionsRequiringAttention = Object.values(sectionStatsById).filter(
      (stats) => stats.health === "critical" || stats.health === "warning"
    ).length;
    const machinesWithRealFootprint = placedMachines.filter(
      (machine) =>
        (machine.footprintWidthMeters ?? 0) > 0 &&
        (machine.footprintLengthMeters ?? 0) > 0
    ).length;

    return {
      totalMachines,
      activeIncidents,
      openWorkOrders,
      sectionsRequiringAttention,
      machinesWithRealFootprint,
    };
  }, [placedMachines, sectionStatsById]);
  const incidentPreviewByAssetId = useMemo<Record<string, FailureReportDto[]>>(() => {
    const map = new Map<string, FailureReportDto[]>();

    for (const incident of openIncidents) {
      if (!incident.assetId) continue;

      const current = map.get(incident.assetId) ?? [];
      current.push(incident);
      map.set(incident.assetId, current);
    }

    return Object.fromEntries(
      [...map.entries()].map(([assetId, incidents]) => [
        assetId,
        incidents
          .slice()
          .sort(
            (left, right) =>
              Date.parse(right.reportedAtUtc) - Date.parse(left.reportedAtUtc)
          ),
      ])
    );
  }, [openIncidents]);
  const selectedRoad = useMemo(
    () => roads.find((road) => road.id === selectedRoadId) ?? null,
    [roads, selectedRoadId]
  );
  const selectedRoadLengthLabel = useMemo(() => {
    if (!selectedRoad) return null;

    const metersPerPx = layoutScale.metersPerGridCell / (snapping.gridSize || 40);
    return `${formatMetricValue(computePolylineLength(selectedRoad.points) * metersPerPx)} m`;
  }, [layoutScale.metersPerGridCell, selectedRoad, snapping.gridSize]);
  const draftRoadLengthLabel = useMemo(() => {
    if (!roadDraft || roadDraft.points.length < 4) return null;

    const metersPerPx = layoutScale.metersPerGridCell / (snapping.gridSize || 40);
    return `${formatMetricValue(computePolylineLength(roadDraft.points) * metersPerPx)} m`;
  }, [layoutScale.metersPerGridCell, roadDraft, snapping.gridSize]);
  const validationIssues = useMemo<LayoutValidationIssue[]>(
    () =>
      validateLayout({
        boundary,
        sections: validationSections,
        roads,
        machines: validationMachines,
      }),
    [boundary, roads, validationMachines, validationSections]
  );
  const validationErrors = validationIssues.filter(
    (issue) => issue.severity === "error"
  );
  const validationWarnings = validationIssues.filter(
    (issue) => issue.severity === "warning"
  );
  const invalidMachineIds = [
    ...new Set(
      validationIssues
        .filter((issue) => issue.entityKind === "machine" && issue.entityId)
        .map((issue) => issue.entityId as string)
    ),
  ];
  const invalidSectionIds = [
    ...new Set(
      validationIssues
        .filter((issue) => issue.entityKind === "section" && issue.entityId)
        .map((issue) => issue.entityId as string)
    ),
  ];
  const invalidRoadIds = [
    ...new Set(
      validationIssues
        .filter((issue) => issue.entityKind === "road" && issue.entityId)
        .map((issue) => issue.entityId as string)
    ),
  ];

  const dirtyCount =
    placedMachines.filter((machine) => machine.isDirty).length +
    removedMachineAssetIds.length +
    (outlineSignature !== savedOutlineSignature ? 1 : 0) +
    (roadDraft ? 1 : 0) +
    (sectionDraft ? 1 : 0);

  useEffect(() => {
    if (validationErrors.length > 0) {
      setDiagnosticsOpen(true);
    }
  }, [validationErrors.length]);

  const loadData = async (targetHallId: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const [hallDetails, machineSummaries, incidents] = await Promise.all([
        getHallDetails(targetHallId, signal),
        assetsApi.list({ signal }),
        failureReportsApi.list({ openOnly: true, signal }),
      ]);
      const machineCandidates = (machineSummaries ?? []).filter(
        (machine) => machine.type === AssetType.Machine && machine.isActive
      );
      const machineDetailsResults = await Promise.allSettled(
        machineCandidates.map((machine) => assetsApi.getById(machine.id, signal))
      );
      const resolvedMachines = machineDetailsResults
        .filter(
          (result): result is PromiseFulfilledResult<AssetDetailsDto> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);

      if (signal?.aborted) return;

      const nextSections = (hallDetails.sections ?? [])
        .map(mapSection)
        .filter(Boolean) as LayoutSectionOverlay[];
      const parsedOutline = parseOutlineJson(hallDetails.outlineJson);
      const scale = parsedOutline.scale ?? layoutScale;
      const effectiveGridSize =
        scale.gridSize && Number.isFinite(scale.gridSize) && scale.gridSize > 0
          ? scale.gridSize
          : snapping.gridSize || 40;

      hydrate({
        elements: [],
        roads: parsedOutline.roads,
        boundary: parsedOutline.boundary,
        layoutScale: scale,
      });
      setGridSize(effectiveGridSize);

      const placedMachineItems = resolvedMachines
        .map((machine) =>
          toMachineItem(
            machine,
            hallDetails.id,
            nextSections,
            effectiveGridSize,
            scale.metersPerGridCell
          )
        )
        .filter(Boolean) as LayoutMachineItem[];
      const placedAssetIds = new Set(placedMachineItems.map((machine) => machine.assetId));
      const hallIncidents = (incidents ?? []).filter(
        (incident) =>
          incident.hallId === hallDetails.id ||
          (incident.assetId ? placedAssetIds.has(incident.assetId) : false)
      );

      setHall(hallDetails);
      setMachineCatalog(resolvedMachines);
      setPlacedMachines(placedMachineItems);
      setRemovedMachineAssetIds([]);
      setOpenIncidents(hallIncidents);
      setSectionDraft(null);
      setRoadDraft(null);
      setSavedOutlineSignature(
        JSON.stringify({
          boundary: parsedOutline.boundary,
          roads: parsedOutline.roads,
          scale: {
            metersPerGridCell: scale.metersPerGridCell,
            gridSize: effectiveGridSize,
          },
        })
      );
      setSelectedAssetId(null);
      setSelectedSectionId(null);
      setSelectedRoadId(null);
      setPendingMachineId(null);
      setMode("select");
      clearHistory();

      const serverSnapshot: EditorSnapshot = {
        boundary: cloneBoundary(parsedOutline.boundary),
        boundaryRequired:
          !parsedOutline.boundary.closed || parsedOutline.boundary.points.length < 6,
        roads: parsedOutline.roads.map(cloneRoad),
        layoutScale: { ...scale, gridSize: effectiveGridSize },
        placedMachines: placedMachineItems.map(cloneMachine),
        removedMachineAssetIds: [],
        sectionDraft: null,
        roadDraft: null,
        mode: "select",
        selectedAssetId: null,
        selectedSectionId: null,
        selectedRoadId: null,
        pendingMachineId: null,
      };
      const persistedDraft = readPersistedDraft(hallDetails.id);
      if (
        persistedDraft &&
        serializeSnapshot(persistedDraft.snapshot) !== serializeSnapshot(serverSnapshot)
      ) {
        setRecoverableDraft(persistedDraft);
      } else {
        setRecoverableDraft(null);
        clearPersistedDraft(hallDetails.id);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(toApiError(err, "Nie udało się pobrać danych layoutu."));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!hallId && focusedMachineId) {
      let cancelled = false;

      const resolveHallId = async () => {
        try {
          const asset = await assetsApi.getById(focusedMachineId);
          const placement = extractCurrentPlacement(asset);
          if (cancelled || !placement?.hallId) return;

          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("hallId", placement.hallId);
          nextParams.set("machineId", focusedMachineId);
          setSearchParams(nextParams, { replace: true });
        } catch {
          if (!cancelled) {
            setError(
              toApiError(null, "Nie udało się ustalić hali dla wskazanej maszyny.")
            );
          }
        }
      };

      void resolveHallId();

      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [focusedMachineId, hallId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hallId) {
      clearAll();
      setHall(null);
      setMachineCatalog([]);
      setPlacedMachines([]);
      setOpenIncidents([]);
      setSectionDraft(null);
      setRoadDraft(null);
      setSelectedRoadId(null);
      setSavedOutlineSignature("");
      setRecoverableDraft(null);
      clearHistory();
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    void loadData(hallId, controller.signal);
    return () => controller.abort();
  }, [clearAll, hallId]);

  useEffect(() => {
    if (!focusedMachineId) return;

    const machine = placedMachines.find((item) => item.assetId === focusedMachineId);
    if (!machine) return;

    setSelectedAssetId(machine.assetId);
    setSelectedSectionId(machine.sectionId ?? null);
    setPendingMachineId(null);
    setMode("select");
  }, [focusedMachineId, placedMachines]);

  useEffect(() => {
    setSelectedRoadId((current) =>
      current && roads.some((road) => road.id === current) ? current : null
    );
  }, [roads]);

  useEffect(() => {
    if (boundaryRequired && mode !== "boundary") {
      setMode("boundary");
      setPendingMachineId(null);
      setSectionDraft(null);
      setRoadDraft(null);
      setSelectedRoadId(null);
    }
  }, [boundaryRequired, mode]);

  useEffect(() => {
    if (!hallId) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyCount <= 0) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyCount, hallId]);

  useEffect(() => {
    if (!hallId || loading || recoverableDraft) return;

    if (dirtyCount > 0) {
      writePersistedDraft({
        hallId,
        savedAtUtc: new Date().toISOString(),
        snapshot: cloneSnapshot(captureSnapshot()),
      });
      return;
    }

    clearPersistedDraft(hallId);
  }, [captureSnapshot, dirtyCount, hallId, loading, recoverableDraft]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          if (redoStackRef.current.length === 0) return;
          const currentSnapshot = cloneSnapshot(captureSnapshot());
          const nextSnapshot = redoStackRef.current.pop();
          if (!nextSnapshot) return;
          undoStackRef.current.push(currentSnapshot);
          applySnapshot(nextSnapshot);
          syncFocusedMachine(nextSnapshot.selectedAssetId);
          syncHistoryState();
          setSaveHint("Przywrocono cofnieta zmiane.");
          setError(null);
          return;
        }

        if (undoStackRef.current.length === 0) return;
        const currentSnapshot = cloneSnapshot(captureSnapshot());
        const nextSnapshot = undoStackRef.current.pop();
        if (!nextSnapshot) return;
        redoStackRef.current.push(currentSnapshot);
        applySnapshot(nextSnapshot);
        syncFocusedMachine(nextSnapshot.selectedAssetId);
        syncHistoryState();
        setSaveHint("Cofnieto ostatnia zmiane.");
        setError(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captureSnapshot]);

  useEffect(() => {
    if (machineCatalog.length === 0) return;

    const gridSize = snapping.gridSize || 40;

    setPlacedMachines((current) =>
      current.map((machine) => {
        const asset = machineCatalog.find((item) => item.id === machine.assetId);
        if (!asset) return machine;

        const footprintSize = getMachineFootprintSizePx(
          asset,
          layoutScale.metersPerGridCell,
          gridSize
        );
        const nextFootprintWidth = asset.footprintWidthMeters ?? null;
        const nextFootprintLength = asset.footprintLengthMeters ?? null;
        if (!footprintSize) {
          if (
            machine.footprintWidthMeters === nextFootprintWidth &&
            machine.footprintLengthMeters === nextFootprintLength
          ) {
            return machine;
          }

          return {
            ...machine,
            footprintWidthMeters: nextFootprintWidth,
            footprintLengthMeters: nextFootprintLength,
          };
        }

        const widthChanged = Math.abs(machine.width - footprintSize.width) > 0.01;
        const heightChanged = Math.abs(machine.height - footprintSize.height) > 0.01;
        const footprintChanged =
          machine.footprintWidthMeters !== nextFootprintWidth ||
          machine.footprintLengthMeters !== nextFootprintLength;

        if (!widthChanged && !heightChanged && !footprintChanged) {
          return machine;
        }

        return {
          ...machine,
          footprintWidthMeters: nextFootprintWidth,
          footprintLengthMeters: nextFootprintLength,
          width: footprintSize.width,
          height: footprintSize.height,
          isDirty: true,
        };
      })
    );
  }, [layoutScale.metersPerGridCell, machineCatalog, snapping.gridSize]);

  const getSectionMachinesCount = (sectionId: string) =>
    placedMachines.filter((machine) => machine.sectionId === sectionId).length;

  const syncFocusedMachine = (assetId: string | null) => {
    const nextParams = new URLSearchParams(searchParams);

    if (assetId) {
      nextParams.set("machineId", assetId);
    } else {
      nextParams.delete("machineId");
    }

    setSearchParams(nextParams, { replace: true });
  };

  const snapValue = (value: number) => {
    const gridSize = snapping.gridSize || 40;
    return snapping.snapToGrid ? Math.round(value / gridSize) * gridSize : value;
  };

  const handleUndoChange = () => {
    if (undoStackRef.current.length === 0) return;

    const currentSnapshot = cloneSnapshot(captureSnapshot());
    const nextSnapshot = undoStackRef.current.pop();
    if (!nextSnapshot) return;

    redoStackRef.current.push(currentSnapshot);
    applySnapshot(nextSnapshot);
    syncFocusedMachine(nextSnapshot.selectedAssetId);
    syncHistoryState();
    setSaveHint("Cofnieto ostatnia zmiane.");
    setError(null);
  };

  const handleRedoChange = () => {
    if (redoStackRef.current.length === 0) return;

    const currentSnapshot = cloneSnapshot(captureSnapshot());
    const nextSnapshot = redoStackRef.current.pop();
    if (!nextSnapshot) return;

    undoStackRef.current.push(currentSnapshot);
    applySnapshot(nextSnapshot);
    syncFocusedMachine(nextSnapshot.selectedAssetId);
    syncHistoryState();
    setSaveHint("Przywrocono cofnieta zmiane.");
    setError(null);
  };

  const handleRestoreDraft = () => {
    if (!recoverableDraft) return;

    pushHistorySnapshot();
    applySnapshot(recoverableDraft.snapshot);
    syncFocusedMachine(recoverableDraft.snapshot.selectedAssetId);
    setRecoverableDraft(null);
    setSaveHint("Przywrocono lokalna wersje robocza.");
    setError(null);
  };

  const handleDiscardRecoveredDraft = () => {
    if (!hallId) return;

    clearPersistedDraft(hallId);
    setRecoverableDraft(null);
    setSaveHint("Usunieto lokalna wersje robocza.");
  };

  const handleSnapToGridChange = (value: boolean) => {
    pushHistorySnapshot();
    setSnapToGrid(value);
    setSaveHint(null);
  };

  const handleGridSizeChange = (value: number) => {
    pushHistorySnapshot();
    setGridSize(value);
    setSaveHint(null);
  };

  const handleScaleChange = (value: number) => {
    pushHistorySnapshot();
    setMetersPerGridCell(value);
    setSaveHint(null);
  };

  const handleSelectMachine = (assetId: string | null) => {
    setSelectedAssetId(assetId);
    setSelectedRoadId(null);
    syncFocusedMachine(assetId);

    if (!assetId) {
      if (!selectedSectionId) {
        setMode("select");
      }
      return;
    }

    setRightPanelCollapsed(false);
    const machine = placedMachines.find((item) => item.assetId === assetId) ?? null;
    setSelectedSectionId(machine?.sectionId ?? null);
    setSectionDraft(null);
    setRoadDraft(null);
    setMode("select");
  };

  const handleSelectSection = (sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setSelectedAssetId(null);
    setSelectedRoadId(null);
    setPendingMachineId(null);
    setSectionDraft(null);
    setRoadDraft(null);
    if (sectionId) {
      setRightPanelCollapsed(false);
    }
    setMode("select");
    syncFocusedMachine(null);
  };

  const handleSelectRoad = (roadId: string | null) => {
    setSelectedRoadId(roadId);
    setSelectedAssetId(null);
    setSelectedSectionId(null);
    setPendingMachineId(null);
    setSectionDraft(null);
    setRoadDraft(null);
    if (roadId) {
      setRightPanelCollapsed(false);
    }
    setMode("select");
    syncFocusedMachine(null);
  };

  const handlePickMachine = (assetId: string) => {
    if (!selectedSectionId) {
      setError(toApiError(null, "Najpierw wybierz sekcje hali, aby dodac do niej maszyne."));
      return;
    }

    setError(null);
    setPendingMachineId(assetId);
    setSelectedAssetId(null);
    setSelectedRoadId(null);
    setSectionDraft(null);
    setRoadDraft(null);
    setMode("place-machine");
    syncFocusedMachine(null);
  };

  const updateMachine = (
    assetId: string,
    patch: Partial<LayoutMachineItem>,
    options?: { recordHistory?: boolean }
  ) => {
    if (options?.recordHistory ?? true) {
      pushHistorySnapshot();
    }

    setPlacedMachines((current) =>
      current.map((machine) => {
        if (machine.assetId !== assetId) return machine;

        const next = {
          ...machine,
          ...patch,
        };

        if (!Object.prototype.hasOwnProperty.call(patch, "sectionId")) {
          next.sectionId = inferSectionId(next, sections);
        }

        return {
          ...next,
          isDirty: true,
        };
      })
    );
  };

  const handleRemoveMachineFromHall = (assetId: string) => {
    const machine = placedMachines.find((item) => item.assetId === assetId);
    if (!machine) return;

    pushHistorySnapshot();
    setError(null);
    setSaveHint(null);
    setPlacedMachines((current) =>
      current.filter((item) => item.assetId !== assetId)
    );
    setRemovedMachineAssetIds((current) =>
      current.includes(assetId) ? current : [...current, assetId].sort()
    );
    setSelectedAssetId(null);
    setSelectedSectionId(machine.sectionId ?? null);
    setPendingMachineId(null);
    setMode("select");
    syncFocusedMachine(null);
  };

  const handlePlaceMachine = (assetId: string, x: number, y: number) => {
    const asset = machineCatalog.find((item) => item.id === assetId);
    if (!asset || !hallId) return;
    if (!selectedSectionId) {
      setError(toApiError(null, "Wybierz sekcje przed rozmieszczeniem maszyny."));
      return;
    }

    const existing = placedMachines.find((machine) => machine.assetId === assetId);
    const currentPlacement = extractCurrentPlacement(asset);
    const gridSize = snapping.gridSize || 40;
    const footprintSize = getMachineFootprintSizePx(
      asset,
      layoutScale.metersPerGridCell,
      gridSize
    );
    const width =
      existing?.width ??
      footprintSize?.width ??
      (Number(currentPlacement?.width) || gridSize * 2);
    const height =
      existing?.height ??
      footprintSize?.height ??
      (Number(currentPlacement?.height) || gridSize * 2);
    const nextX = snapValue(x);
    const nextY = snapValue(y);
    const inferredSectionId = inferSectionId(
      {
        x: nextX,
        y: nextY,
        width,
        height,
        rotationDeg: existing?.rotationDeg ?? (Number(currentPlacement?.rotationDeg) || 0),
      },
      sections
    );

    if (inferredSectionId !== selectedSectionId) {
      setError(
        toApiError(
          null,
          "Maszyne mozna dodac tylko wewnatrz aktualnie wybranej sekcji."
        )
      );
      return;
    }

    const nextSectionId = selectedSectionId;
    setError(null);
    pushHistorySnapshot();

    const nextMachine: LayoutMachineItem = {
      assetId,
      name: asset.name,
      code: asset.code,
      status: asset.status,
      category: asset.category,
      hallId,
      sectionId: nextSectionId,
      footprintWidthMeters: asset.footprintWidthMeters ?? null,
      footprintLengthMeters: asset.footprintLengthMeters ?? null,
      x: nextX,
      y: nextY,
      width,
      height,
      rotationDeg: existing?.rotationDeg ?? (Number(currentPlacement?.rotationDeg) || 0),
      placementId: existing?.placementId ?? currentPlacement?.id ?? null,
      placementNotes: existing?.placementNotes ?? currentPlacement?.notes ?? null,
      isDirty: true,
      openIncidentsCount: asset.failureReportsCount,
      openWorkOrdersCount: asset.workOrdersCount,
    };

    setPlacedMachines((current) => {
      const withoutCurrent = current.filter((machine) => machine.assetId !== assetId);
      return [...withoutCurrent, nextMachine].sort((left, right) =>
        left.name.localeCompare(right.name, "pl")
      );
    });
    setRemovedMachineAssetIds((current) =>
      current.filter((currentAssetId) => currentAssetId !== assetId)
    );

    setSelectedAssetId(assetId);
    setSelectedSectionId(nextSectionId ?? null);
    setPendingMachineId(null);
    setMode("select");
    syncFocusedMachine(assetId);
  };

  const handleMachineMoveStart = (_assetId: string) => {
    pushHistorySnapshot();
  };

  const handleMoveMachine = (assetId: string, x: number, y: number) => {
    updateMachine(assetId, {
      x: snapValue(x),
      y: snapValue(y),
    }, { recordHistory: false });
  };

  const handleStartRoadDraw = () => {
    const defaultWidth = Math.max((snapping.gridSize || 40) / 3, 12);

    pushHistorySnapshot();
    setRoadDraft(createDefaultRoadDraft(roads.length + 1, defaultWidth));
    setSelectedRoadId(null);
    setSelectedAssetId(null);
    setSelectedSectionId(null);
    setPendingMachineId(null);
    setSectionDraft(null);
    setMode("draw-road");
    setSaveHint(null);
    syncFocusedMachine(null);
  };

  const handleAddRoadPoint = (x: number, y: number) => {
    pushHistorySnapshot();
    setRoadDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        points: [...current.points, snapValue(x), snapValue(y)],
      };
    });
  };

  const handleChangeRoadDraft = (patch: Partial<LayoutRoadDraft>) => {
    pushHistorySnapshot();
    setRoadDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const handleResetRoadDraft = () => {
    pushHistorySnapshot();
    setRoadDraft((current) =>
      current ? { ...current, points: [] } : current
    );
  };

  const handleFinishRoad = () => {
    if (!roadDraft || roadDraft.points.length < 4) return;

    pushHistorySnapshot();
    addRoad({
      name: roadDraft.name,
      width: roadDraft.width,
      points: roadDraft.points,
    });

    setRoadDraft(null);
    setMode("select");
  };

  const handleCancelRoadDraw = () => {
    if (roadDraft) {
      pushHistorySnapshot();
    }
    setRoadDraft(null);
    setMode("select");
  };

  const handleUndoLastPoint = () => {
    pushHistorySnapshot();

    if (mode === "boundary") {
      undoBoundaryPoint();
      return;
    }

    if (mode === "draw-section") {
      setSectionDraft((current) =>
        current
          ? {
              ...current,
              boundary: {
                ...current.boundary,
                closed: false,
                points: current.boundary.points.slice(0, -2),
              },
            }
          : current
      );
      return;
    }

    if (mode === "draw-road") {
      setRoadDraft((current) =>
        current
          ? {
              ...current,
              points: current.points.slice(0, -2),
            }
          : current
      );
    }
  };

  const handleReload = async () => {
    if (!hallId) return;
    await loadData(hallId);
  };

  const handleSave = async () => {
    if (!hall || !hallId) return;
    if (validationErrors.length > 0) {
      setError(
        toApiError(
          null,
          `Layout zawiera ${validationErrors.length} błędów walidacji. Popraw je przed zapisem.`
        )
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSaveHint(null);

    try {
      await updateHall(hallId, {
        name: hall.name,
        code: hall.code,
        description: hall.description ?? null,
        outlineJson: buildOutlineJson(
          boundary,
          layoutScale.metersPerGridCell,
          snapping.gridSize || 40,
          roads
        ),
      });

      const dirtyMachines = placedMachines.filter((machine) => machine.isDirty);
      const invalidMachine = dirtyMachines.find(
        (machine) =>
          !machine.sectionId || !sections.some((section) => section.id === machine.sectionId)
      );

      if (invalidMachine) {
        throw new Error(
          `Maszyna ${invalidMachine.name} musi byc przypisana do istniejacej sekcji przed zapisem.`
        );
      }

      if (dirtyMachines.length > 0) {
        await Promise.all(
          dirtyMachines.map((machine) => {
            const body: PlaceAssetRequest = {
              hallId,
              sectionId: machine.sectionId ?? null,
              x: machine.x,
              y: machine.y,
              width: machine.width,
              height: machine.height,
              rotationDeg: machine.rotationDeg,
              notes: machine.placementNotes ?? null,
            };

            return assetsApi.place(machine.assetId, body);
          })
        );
      }

      if (removedMachineAssetIds.length > 0) {
        await Promise.all(
          removedMachineAssetIds.map((assetId) => assetsApi.removePlacement(assetId))
        );
      }

      await loadData(hallId);
      setSaveHint("Zapisano layout hali, drogi i rozmieszczenie maszyn.");
    } catch (err) {
      setError(toApiError(err, "Nie udało się zapisać layoutu hali."));
    } finally {
      setSaving(false);
    }
  };

  const handleStartBoundaryRedraw = () => {
    pushHistorySnapshot();
    clearBoundary();
    setBoundaryRequired(true);
    setPendingMachineId(null);
    setSelectedAssetId(null);
    setSelectedSectionId(null);
    setSelectedRoadId(null);
    setSectionDraft(null);
    setRoadDraft(null);
    setMode("boundary");
    setSaveHint(null);
  };

  const handleStartSectionDraw = () => {
    pushHistorySnapshot();
    setSectionDraft(createDefaultSectionDraft(sections.length + 1));
    setPendingMachineId(null);
    setSelectedAssetId(null);
    setSelectedSectionId(null);
    setSelectedRoadId(null);
    setRoadDraft(null);
    setRightPanelCollapsed(false);
    setMode("draw-section");
    setSaveHint(null);
    syncFocusedMachine(null);
  };

  const handleChangeSectionDraft = (patch: Partial<LayoutSectionDraft>) => {
    pushHistorySnapshot();
    setSectionDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const handleAddSectionPoint = (x: number, y: number) => {
    pushHistorySnapshot();
    setSectionDraft((current) => {
      if (!current || current.boundary.closed) return current;

      return {
        ...current,
        boundary: {
          ...current.boundary,
          points: [...current.boundary.points, snapValue(x), snapValue(y)],
        },
      };
    });
  };

  const handleCloseSection = () => {
    pushHistorySnapshot();
    setSectionDraft((current) => {
      if (!current || current.boundary.points.length < 6) return current;

      return {
        ...current,
        boundary: {
          ...current.boundary,
          closed: true,
        },
      };
    });
  };

  const handleResetSectionDraftBoundary = () => {
    pushHistorySnapshot();
    setSectionDraft((current) =>
      current
        ? {
            ...current,
            boundary: { points: [], closed: false },
          }
        : current
    );
  };

  const handleCancelSectionDraft = () => {
    if (sectionDraft) {
      pushHistorySnapshot();
    }
    setSectionDraft(null);
    setMode("select");
  };

  const handleSaveSection = async () => {
    if (!hallId || !sectionDraft) return;

    const sectionName = sectionDraft.name.trim();
    if (!sectionName || !sectionDraft.boundary.closed || sectionDraft.boundary.points.length < 6) {
      setError(toApiError(null, "Uzupełnij nazwę i domknij obrys sekcji przed zapisem."));
      return;
    }

    if (
      boundary.closed &&
      sectionDraft.boundary.points.some((value, index, points) => {
        if (index % 2 !== 0) return false;
        return !pointInPolygon(
          { x: value, y: points[index + 1] ?? 0 },
          boundary.points
        );
      })
    ) {
      setError(toApiError(null, "Sekcja musi pozostawac w granicach obrysu hali."));
      return;
    }

    setSavingSection(true);
    setError(null);
    setSaveHint(null);

    try {
      const metersPerPx = layoutScale.metersPerGridCell / (snapping.gridSize || 40);
      const areaSqMeters = computePolygonAreaSqMeters(sectionDraft.boundary, metersPerPx);
      const body = {
        name: sectionName,
        code: sectionDraft.code.trim() || null,
        description: sectionDraft.description.trim() || null,
        outlineJson: buildOutlineJson(
          sectionDraft.boundary,
          layoutScale.metersPerGridCell,
          snapping.gridSize || 40
        ),
        areaSqMeters,
      };

      let nextSelectedSectionId = sectionDraft.id ?? null;
      let nextSavedSection: LayoutSectionOverlay | null = null;

      if (sectionDraft.id) {
        await updateSection(hallId, sectionDraft.id, body);
        nextSavedSection = {
          id: sectionDraft.id,
          name: body.name,
          code: body.code,
          description: body.description,
          areaSqMeters,
          boundary: cloneBoundary(sectionDraft.boundary),
        };
      } else {
        const createdSection = await createSection(hallId, body);
        nextSelectedSectionId = createdSection.id;
        nextSavedSection = {
          id: createdSection.id,
          name: createdSection.name,
          code: createdSection.code,
          description: createdSection.description,
          areaSqMeters: createdSection.areaSqMeters,
          boundary: cloneBoundary(sectionDraft.boundary),
        };
      }

      const nextSections =
        nextSavedSection == null
          ? sections
          : sectionDraft.id
            ? sections.map((section) =>
                section.id === nextSavedSection.id ? nextSavedSection : section
              )
            : [...sections, nextSavedSection];

      await loadData(hallId);
      setPlacedMachines((current) => autoAssignMachinesToSections(current, nextSections));
      setSelectedSectionId(nextSelectedSectionId);
      setSectionDraft(null);
      setMode("select");
      setSaveHint(
        nextSelectedSectionId === sectionDraft.id
          ? "Sekcja zaktualizowana."
          : "Sekcja dodana do hali."
      );
    } catch (err) {
      setError(toApiError(err, "Nie udało się zapisać sekcji."));
    } finally {
      setSavingSection(false);
    }
  };

  const handleStartEditSection = () => {
    if (!selectedSection) return;

    pushHistorySnapshot();
    setSectionDraft({
      id: selectedSection.id,
      name: selectedSection.name,
      code: selectedSection.code ?? "",
      description: selectedSection.description ?? "",
      boundary: selectedSection.boundary,
    });
    setSelectedAssetId(null);
    setSelectedRoadId(null);
    setPendingMachineId(null);
    setRoadDraft(null);
    setRightPanelCollapsed(false);
    setMode("draw-section");
  };

  const handleDeleteSection = async () => {
    if (!hallId || !selectedSection) return;

    setDeletingSection(true);
    setError(null);
    setSaveHint(null);

    try {
      await deleteSection(hallId, selectedSection.id);
      await loadData(hallId);
      setSelectedSectionId(null);
      setSaveHint("Sekcja usunięta.");
    } catch (err) {
      setError(toApiError(err, "Nie udało się usunąć sekcji."));
    } finally {
      setDeletingSection(false);
    }
  };

  const handleUpdateRoad = (roadId: string, patch: Partial<TransportPath>) => {
    pushHistorySnapshot();
    updateRoad(roadId, patch);
  };

  const handleRoadVertexDragStart = (
    _roadId: string,
    _vertexIndex: number
  ) => {
    pushHistorySnapshot();
  };

  const handleUpdateRoadVertex = (
    roadId: string,
    vertexIndex: number,
    x: number,
    y: number
  ) => {
    const nextX = snapValue(x);
    const nextY = snapValue(y);

    updateRoad(roadId, {
      points: roads
        .find((road) => road.id === roadId)
        ?.points.map((value, index) => {
          const pointIndex = Math.floor(index / 2);
          if (pointIndex !== vertexIndex) return value;
          return index % 2 === 0 ? nextX : nextY;
        }),
    });
  };

  const handleSectionVertexDragStart = () => {
    pushHistorySnapshot();
  };

  const handleUpdateSectionVertex = (
    vertexIndex: number,
    x: number,
    y: number
  ) => {
    const nextX = snapValue(x);
    const nextY = snapValue(y);

    setSectionDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        boundary: {
          ...current.boundary,
          points: current.boundary.points.map((value, index) => {
            const pointIndex = Math.floor(index / 2);
            if (pointIndex !== vertexIndex) return value;
            return index % 2 === 0 ? nextX : nextY;
          }),
        },
      };
    });
  };

  const handleDeleteRoad = () => {
    if (!selectedRoadId) return;

    pushHistorySnapshot();
    deleteRoad(selectedRoadId);
    setSelectedRoadId(null);
  };

  const canUndoLastPoint =
    (mode === "boundary" && boundary.points.length >= 2) ||
    (mode === "draw-section" &&
      (sectionDraft?.boundary.points.length ?? 0) >= 2) ||
    (mode === "draw-road" && (roadDraft?.points.length ?? 0) >= 2);

  const canFinishCurrentShape =
    (mode === "draw-section" &&
      (sectionDraft?.boundary.points.length ?? 0) >= 6 &&
      !sectionDraft?.boundary.closed) ||
    (mode === "draw-road" && (roadDraft?.points.length ?? 0) >= 4);

  if (!hallId) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950 p-3">
        <div className="rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-900/80 p-10 text-center shadow-[0_24px_60px_-32px_rgba(2,6,23,0.95)]">
          <h2 className="text-xl font-semibold text-slate-100">Wybierz halę do edycji layoutu</h2>
          <p className="mt-3 text-sm text-slate-400">
            Otwórz edytor z listy hal albo z poziomu szczegółów maszyny.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/halls"
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Przejdź do hal
            </Link>
            <Link
              to="/machines"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
            >
              Przejdź do maszyn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusTone = error
    ? "rose"
    : recoverableDraft
      ? "sky"
      : saveHint
        ? "emerald"
        : validationErrors.length > 0
          ? "amber"
          : "slate";
  const statusMessage =
    error?.message ??
    (recoverableDraft
      ? `Czeka lokalna wersja robocza z ${new Date(
          recoverableDraft.savedAtUtc
        ).toLocaleString("pl-PL")}.`
      : saveHint ??
        (validationIssues.length > 0
          ? `Walidacja: ${validationErrors.length} błędów, ${validationWarnings.length} ostrzeżeń.`
          : "Layout spójny. Brak błędów walidacji."));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950">
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2 md:gap-3 md:p-3">
        <LeftPanel
          hall={hall}
          sections={sections}
          selectedSection={selectedSection}
          machineCatalog={machineCatalogItems}
          roads={roads}
          placedMachinesCount={placedMachines.length}
          selectedSectionId={selectedSectionId}
          selectedRoadId={selectedRoadId}
          getSectionMachinesCount={getSectionMachinesCount}
          sectionStatsById={sectionStatsById}
          hallPresentationStats={hallPresentationStats}
          mode={mode}
          pendingMachineId={pendingMachineId}
          selectedAssetId={selectedAssetId}
          roadDraft={roadDraft}
          dirtyCount={dirtyCount}
          saving={saving}
          loading={loading}
          canUndo={historyState.canUndo}
          canRedo={historyState.canRedo}
          focusMode={focusMode}
          attentionMode={attentionMode}
          showLabels={showLabels}
          showLegend={showLegend}
          showOverview={showOverview}
          diagnosticsOpen={diagnosticsOpen}
          statusTone={statusTone}
          statusMessage={statusMessage}
          validationIssues={validationIssues}
          validationErrorsCount={validationErrors.length}
          validationWarningsCount={validationWarnings.length}
          recoverableDraft={Boolean(recoverableDraft)}
          rightPanelCollapsed={rightPanelCollapsed}
          controls={
            <SnappingControls
              snapping={snapping}
              layoutScale={layoutScale}
              onSnapToGridChange={handleSnapToGridChange}
              onGridSizeChange={handleGridSizeChange}
              onMetersPerGridCellChange={handleScaleChange}
            />
          }
          canUndoLastPoint={canUndoLastPoint}
          canFinishCurrentShape={canFinishCurrentShape}
          onReload={() => void handleReload()}
          onSave={() => void handleSave()}
          onUndo={handleUndoChange}
          onRedo={handleRedoChange}
          onToggleRightPanel={() => setRightPanelCollapsed((current) => !current)}
          onToggleFocusMode={() => setFocusMode((current) => !current)}
          onToggleAttentionMode={() => setAttentionMode((current) => !current)}
          onToggleLabels={() => setShowLabels((current) => !current)}
          onToggleLegend={() => setShowLegend((current) => !current)}
          onToggleOverview={() => setShowOverview((current) => !current)}
          onToggleDiagnostics={() => setDiagnosticsOpen((current) => !current)}
          onRestoreDraft={handleRestoreDraft}
          onDiscardRecoveredDraft={handleDiscardRecoveredDraft}
          onSelectMachine={(assetId) => handleSelectMachine(assetId)}
          onPickMachine={handlePickMachine}
          onStartBoundaryRedraw={handleStartBoundaryRedraw}
          onStartSectionDraw={handleStartSectionDraw}
          onStartRoadDraw={handleStartRoadDraw}
          onSelectSection={handleSelectSection}
          onSelectRoad={handleSelectRoad}
          onUndoLastPoint={handleUndoLastPoint}
          onFinishCurrentShape={
            mode === "draw-section"
              ? handleCloseSection
              : mode === "draw-road"
                ? handleFinishRoad
                : undefined
          }
          onCancelSectionDraw={handleCancelSectionDraft}
          onCancelRoadDraw={handleCancelRoadDraw}
          onCancelMachinePlacement={() => {
            setPendingMachineId(null);
            setMode("select");
          }}
        />

        <div className="min-w-0 min-h-0 flex-1">
          <div
            ref={containerRef}
            className="h-full min-h-0 overflow-hidden rounded-[1.25rem] border border-slate-800 bg-slate-950 shadow-[0_24px_60px_-32px_rgba(2,6,23,0.95)]"
          >
            {!loading ? (
              <HallCanvas
                width={Math.max(size.width, 320)}
                height={Math.max(size.height, 320)}
                mode={mode}
                sections={visibleSections}
                roads={roads}
                machines={placedMachines}
                selectedAssetId={selectedAssetId}
                selectedSectionId={selectedSectionId}
                selectedRoadId={selectedRoadId}
                pendingMachineId={pendingMachineId}
                pendingMachineLabel={pendingMachineLabel}
                hallName={hall?.name}
                hallCode={hall?.code}
                sectionStatsById={sectionStatsById}
                hallPresentationStats={hallPresentationStats}
                incidentPreviewByAssetId={incidentPreviewByAssetId}
                draftRoadPoints={roadDraft?.points ?? []}
                draftRoadWidth={roadDraft?.width}
                draftRoadName={roadDraft?.name}
                pendingMachinePreviewWidth={pendingMachinePreview?.width}
                pendingMachinePreviewHeight={pendingMachinePreview?.height}
                draftSectionBoundary={sectionDraft?.boundary.points ?? []}
                isDraftSectionClosed={sectionDraft?.boundary.closed ?? false}
                draftSectionName={sectionDraft?.name}
                invalidMachineIds={invalidMachineIds}
                invalidSectionIds={invalidSectionIds}
                invalidRoadIds={invalidRoadIds}
                focusMode={focusMode}
                attentionMode={attentionMode}
                showLabels={showLabels}
                showLegend={showLegend}
                showOverview={showOverview}
                onSelectAsset={handleSelectMachine}
                onSelectSection={handleSelectSection}
                onSelectRoad={handleSelectRoad}
                onPlaceMachine={handlePlaceMachine}
                onMachineMoveStart={handleMachineMoveStart}
                onMoveMachine={handleMoveMachine}
                onAddSectionPoint={handleAddSectionPoint}
                onSectionDraftVertexDragStart={handleSectionVertexDragStart}
                onUpdateSectionDraftVertex={handleUpdateSectionVertex}
                onAddRoadPoint={handleAddRoadPoint}
                onRoadVertexDragStart={handleRoadVertexDragStart}
                onUpdateRoadVertex={handleUpdateRoadVertex}
                onFinishRoad={handleFinishRoad}
                onCloseSection={handleCloseSection}
              />
            ) : (
              <div className="flex h-full min-h-0 items-center justify-center text-sm text-slate-400">
                Ładowanie layoutu hali...
              </div>
            )}
          </div>
        </div>

        {!rightPanelCollapsed ? (
          <RightPanel
            hall={hall}
            sections={sections}
            selectedRoad={selectedRoad}
            selectedRoadLengthLabel={selectedRoadLengthLabel}
            draftRoad={roadDraft}
            draftRoadLengthLabel={draftRoadLengthLabel}
            selectedMachine={selectedMachine}
            selectedSection={selectedSection}
            sectionDraft={sectionDraft}
            savingSection={savingSection}
            deletingSection={deletingSection}
            onUpdateMachine={updateMachine}
            onRemoveMachineFromHall={handleRemoveMachineFromHall}
            onUpdateRoad={handleUpdateRoad}
            onDeleteRoad={handleDeleteRoad}
            onChangeRoadDraft={handleChangeRoadDraft}
            onChangeSectionDraft={handleChangeSectionDraft}
            onResetSectionDraftBoundary={handleResetSectionDraftBoundary}
            onResetRoadDraft={handleResetRoadDraft}
            onFinishRoad={handleFinishRoad}
            onCancelRoadDraft={handleCancelRoadDraw}
            onSaveSection={() => void handleSaveSection()}
            onCancelSectionDraft={handleCancelSectionDraft}
            onStartEditSection={handleStartEditSection}
            onDeleteSection={() => void handleDeleteSection()}
          />
        ) : null}
      </div>
    </div>
  );
}
