import React, { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { Link } from "react-router-dom";
import {
  FailureSeverity,
  FailureStatus,
  type FailureReportDto,
} from "../../incidents/api/contracts";
import { AssetStatus } from "../../machines/api/contracts";
import type {
  LayoutEditorMode,
  LayoutMachineItem,
  LayoutSectionOverlay,
  LayoutSectionPresentationStats,
} from "../model/editorTypes";
import type { TransportPath } from "../model/layoutTypes";
import { useEditorState } from "../model/useEditorState";
import { GridOverlay } from "./GridOverlay";

interface HallCanvasProps {
  width: number;
  height: number;
  mode: LayoutEditorMode;
  sections: LayoutSectionOverlay[];
  roads: TransportPath[];
  machines: LayoutMachineItem[];
  selectedAssetId: string | null;
  selectedSectionId: string | null;
  selectedRoadId: string | null;
  pendingMachineId: string | null;
  pendingMachineLabel?: string;
  pendingMachinePreviewWidth?: number;
  pendingMachinePreviewHeight?: number;
  hallName?: string;
  hallCode?: string;
  sectionStatsById: Record<string, LayoutSectionPresentationStats>;
  hallPresentationStats: {
    totalMachines: number;
    activeIncidents: number;
    openWorkOrders: number;
    sectionsRequiringAttention: number;
    machinesWithRealFootprint: number;
  };
  incidentPreviewByAssetId: Record<string, FailureReportDto[]>;
  draftRoadPoints?: number[];
  draftRoadWidth?: number;
  draftRoadName?: string;
  draftSectionBoundary?: number[];
  isDraftSectionClosed?: boolean;
  draftSectionName?: string;
  invalidMachineIds?: string[];
  invalidSectionIds?: string[];
  invalidRoadIds?: string[];
  focusMode?: boolean;
  attentionMode?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  showOverview?: boolean;
  onSelectAsset: (assetId: string | null) => void;
  onSelectSection: (sectionId: string | null) => void;
  onSelectRoad: (roadId: string | null) => void;
  onPlaceMachine: (assetId: string, x: number, y: number) => void;
  onMachineMoveStart?: (assetId: string) => void;
  onMoveMachine: (assetId: string, x: number, y: number) => void;
  onAddSectionPoint: (x: number, y: number) => void;
  onSectionDraftVertexDragStart?: (vertexIndex: number) => void;
  onUpdateSectionDraftVertex?: (
    vertexIndex: number,
    x: number,
    y: number
  ) => void;
  onAddRoadPoint: (x: number, y: number) => void;
  onRoadVertexDragStart?: (roadId: string, vertexIndex: number) => void;
  onUpdateRoadVertex?: (
    roadId: string,
    vertexIndex: number,
    x: number,
    y: number
  ) => void;
  onFinishRoad: () => void;
  onCloseSection: () => void;
}

interface Point {
  x: number;
  y: number;
}

const defaultSectionStats: LayoutSectionPresentationStats = {
  machineCount: 0,
  incidentsCount: 0,
  workOrdersCount: 0,
  attentionMachinesCount: 0,
  health: "idle",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function distMeters(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  metersPerPx: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy) * metersPerPx;
}

function segmentLabelPos(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    x: mx + (-dy / len) * 12,
    y: my + (dx / len) * 12,
  };
}

function polylineCenter(points: number[]) {
  if (points.length < 2) {
    return { x: 0, y: 0 };
  }

  let totalLength = 0;
  const segments: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    length: number;
  }> = [];

  for (let index = 2; index < points.length; index += 2) {
    const x1 = points[index - 2];
    const y1 = points[index - 1];
    const x2 = points[index];
    const y2 = points[index + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    segments.push({ x1, y1, x2, y2, length });
    totalLength += length;
  }

  if (totalLength <= 0) {
    return { x: points[0], y: points[1] };
  }

  let traversed = 0;
  const halfway = totalLength / 2;

  for (const segment of segments) {
    if (traversed + segment.length >= halfway) {
      const ratio = (halfway - traversed) / (segment.length || 1);
      return {
        x: segment.x1 + (segment.x2 - segment.x1) * ratio,
        y: segment.y1 + (segment.y2 - segment.y1) * ratio,
      };
    }

    traversed += segment.length;
  }

  return { x: points[points.length - 2], y: points[points.length - 1] };
}

function formatMeters(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value)} m`;
}

function polygonCenter(points: number[]) {
  if (points.length < 2) {
    return { x: 0, y: 0 };
  }

  let minX = points[0];
  let maxX = points[0];
  let minY = points[1];
  let maxY = points[1];

  for (let index = 0; index + 1 < points.length; index += 2) {
    minX = Math.min(minX, points[index]);
    maxX = Math.max(maxX, points[index]);
    minY = Math.min(minY, points[index + 1]);
    maxY = Math.max(maxY, points[index + 1]);
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

function polygonBounds(points: number[]) {
  if (points.length < 2) return null;

  let minX = points[0];
  let maxX = points[0];
  let minY = points[1];
  let maxY = points[1];

  for (let index = 0; index + 1 < points.length; index += 2) {
    minX = Math.min(minX, points[index]);
    maxX = Math.max(maxX, points[index]);
    minY = Math.min(minY, points[index + 1]);
    maxY = Math.max(maxY, points[index + 1]);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function mergeBounds(
  bounds: Array<
    | {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        width: number;
        height: number;
      }
    | null
    | undefined
  >
) {
  const validBounds = bounds.filter(Boolean);
  if (validBounds.length === 0) return null;

  const minX = Math.min(...validBounds.map((item) => item!.minX));
  const minY = Math.min(...validBounds.map((item) => item!.minY));
  const maxX = Math.max(...validBounds.map((item) => item!.maxX));
  const maxY = Math.max(...validBounds.map((item) => item!.maxY));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function rotatedMachineBounds(machine: LayoutMachineItem) {
  const angle = (machine.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    { x: 0, y: 0 },
    { x: machine.width, y: 0 },
    { x: machine.width, y: machine.height },
    { x: 0, y: machine.height },
  ].map((point) => ({
    x: machine.x + point.x * cos - point.y * sin,
    y: machine.y + point.x * sin + point.y * cos,
  }));

  return polygonBounds(corners.flatMap((point) => [point.x, point.y]));
}

function machineFill(status: AssetStatus, selected: boolean) {
  if (selected) return "#0f172a";

  switch (status) {
    case AssetStatus.Available:
      return "#22c55e";
    case AssetStatus.InUse:
      return "#0ea5e9";
    case AssetStatus.InMaintenance:
      return "#f59e0b";
    case AssetStatus.Broken:
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}

function estimateTextWidth(label: string, fontSize: number) {
  return Math.max(label.length * fontSize * 0.58, fontSize * 1.8);
}

function sectionStatusLabel(stats: LayoutSectionPresentationStats) {
  if (stats.incidentsCount > 0 || stats.workOrdersCount > 0) {
    const segments: string[] = [];
    if (stats.incidentsCount > 0) {
      segments.push(`! ${stats.incidentsCount}`);
    }
    if (stats.workOrdersCount > 0) {
      segments.push(`UR ${stats.workOrdersCount}`);
    }
    return segments.join(" | ");
  }

  if (stats.machineCount > 0) {
    return "OK";
  }

  return "Pusta";
}

function sectionStatusColors(stats: LayoutSectionPresentationStats) {
  switch (stats.health) {
    case "critical":
      return { fill: "#ffe4e6", stroke: "#fb7185", text: "#9f1239" };
    case "warning":
      return { fill: "#fef3c7", stroke: "#f59e0b", text: "#92400e" };
    case "ok":
      return { fill: "#dcfce7", stroke: "#4ade80", text: "#166534" };
    default:
      return { fill: "#e2e8f0", stroke: "#cbd5e1", text: "#475569" };
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function failureSeverityLabel(value: FailureSeverity) {
  if (value === FailureSeverity.Critical) return "Krytyczna";
  if (value === FailureSeverity.High) return "Wysoka";
  if (value === FailureSeverity.Medium) return "Srednia";
  return "Niska";
}

function failureSeverityClasses(value: FailureSeverity) {
  if (value === FailureSeverity.Critical) {
    return "border-rose-800 bg-rose-950/70 text-rose-100";
  }

  if (value === FailureSeverity.High) {
    return "border-amber-800 bg-amber-950/70 text-amber-100";
  }

  if (value === FailureSeverity.Medium) {
    return "border-sky-800 bg-sky-950/70 text-sky-100";
  }

  return "border-slate-700 bg-slate-900 text-slate-200";
}

function failureStatusLabel(value: FailureStatus) {
  if (value === FailureStatus.Open) return "Nowa";
  if (value === FailureStatus.Triaged) return "Oceniona";
  if (value === FailureStatus.InProgress) return "W trakcie";
  if (value === FailureStatus.Resolved) return "Rozwiazana";
  return "Zamknieta";
}

export const HallCanvas: React.FC<HallCanvasProps> = ({
  width,
  height,
  mode,
  sections,
  roads,
  machines,
  selectedAssetId,
  selectedSectionId,
  selectedRoadId,
  pendingMachineId,
  pendingMachineLabel,
  pendingMachinePreviewWidth,
  pendingMachinePreviewHeight,
  hallName,
  hallCode,
  sectionStatsById,
  hallPresentationStats,
  incidentPreviewByAssetId,
  draftRoadPoints = [],
  draftRoadWidth,
  draftRoadName,
  draftSectionBoundary = [],
  isDraftSectionClosed = false,
  draftSectionName,
  invalidMachineIds = [],
  invalidSectionIds = [],
  invalidRoadIds = [],
  focusMode = false,
  attentionMode = false,
  showLabels = true,
  showLegend = true,
  showOverview = true,
  onSelectAsset,
  onSelectSection,
  onSelectRoad,
  onPlaceMachine,
  onMachineMoveStart,
  onMoveMachine,
  onAddSectionPoint,
  onSectionDraftVertexDragStart,
  onUpdateSectionDraftVertex,
  onAddRoadPoint,
  onRoadVertexDragStart,
  onUpdateRoadVertex,
  onFinishRoad,
  onCloseSection,
}) => {
  const {
    boundary,
    boundaryRequired,
    snapping,
    layoutScale,
    addBoundaryPoint,
    closeBoundary,
  } = useEditorState();

  const stageRef = useRef<any>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [viewScale, setViewScale] = useState(1);
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const invalidMachineIdSet = useMemo(
    () => new Set(invalidMachineIds),
    [invalidMachineIds]
  );
  const invalidSectionIdSet = useMemo(
    () => new Set(invalidSectionIds),
    [invalidSectionIds]
  );
  const invalidRoadIdSet = useMemo(() => new Set(invalidRoadIds), [invalidRoadIds]);

  useEffect(() => {
    setViewScale(1);
    setPos({ x: 0, y: 0 });
  }, [width, height]);

  useEffect(() => {
    if (!previewAssetId) return;

    const incidents = incidentPreviewByAssetId[previewAssetId] ?? [];
    if (incidents.length === 0) {
      setPreviewAssetId(null);
    }
  }, [incidentPreviewByAssetId, previewAssetId]);

  useEffect(() => {
    if (!selectedSectionId || selectedAssetId) return;

    const section = sections.find((item) => item.id === selectedSectionId);
    if (!section) return;

    const bounds = polygonBounds(section.boundary.points);
    if (!bounds) return;

    const padding = 80;
    const availableWidth = Math.max(width - padding * 2, 160);
    const availableHeight = Math.max(height - padding * 2, 160);
    const nextScale = clamp(
      Math.min(
        availableWidth / Math.max(bounds.width, 1),
        availableHeight / Math.max(bounds.height, 1)
      ),
      0.6,
      4
    );

    setViewScale(nextScale);
    setPos({
      x: width / 2 - (bounds.minX + bounds.width / 2) * nextScale,
      y: height / 2 - (bounds.minY + bounds.height / 2) * nextScale,
    });
  }, [height, sections, selectedAssetId, selectedSectionId, width]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setIsSpaceDown(true);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setIsSpaceDown(false);
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const gridSize = snapping.gridSize || 40;
  const metersPerPx = layoutScale.metersPerGridCell / gridSize;
  const uiFont = clamp(12 / viewScale, 8, 14);
  const compactThreshold = 18 / viewScale;
  const machineLabelFont = clamp(11 / viewScale, 7, 12);
  const alertFont = clamp(10 / viewScale, 7, 11);
  const pendingPreviewSize = useMemo(
    () => ({
      width: pendingMachinePreviewWidth ?? gridSize * 2,
      height: pendingMachinePreviewHeight ?? gridSize * 2,
    }),
    [gridSize, pendingMachinePreviewHeight, pendingMachinePreviewWidth]
  );
  const previewIncidents = previewAssetId
    ? incidentPreviewByAssetId[previewAssetId] ?? []
    : [];
  const roadPreviewWidth = Math.max(draftRoadWidth ?? gridSize / 3, 10);
  const draftRoadLabelPoint = useMemo(
    () => (draftRoadPoints.length >= 2 ? polylineCenter(draftRoadPoints) : null),
    [draftRoadPoints]
  );
  const previewMachine =
    previewAssetId !== null
      ? machines.find((machine) => machine.assetId === previewAssetId) ?? null
      : null;
  const selectedMachine =
    selectedAssetId !== null
      ? machines.find((machine) => machine.assetId === selectedAssetId) ?? null
      : null;
  const selectedSection =
    selectedSectionId !== null
      ? sections.find((section) => section.id === selectedSectionId) ?? null
      : null;
  const selectedRoad =
    selectedRoadId !== null
      ? roads.find((road) => road.id === selectedRoadId) ?? null
      : null;
  const selectedSectionFromMachine =
    selectedMachine?.sectionId !== null && selectedMachine?.sectionId !== undefined
      ? selectedMachine.sectionId
      : null;
  const focusSectionId = selectedSectionId ?? selectedSectionFromMachine;
  const hasSelectionFocus =
    selectedAssetId !== null || selectedSectionId !== null || selectedRoadId !== null;
  const showMeasurementLabels =
    showLabels || boundaryRequired || mode === "draw-section" || mode === "draw-road";
  const sectionNeedsAttention = (
    sectionId: string,
    stats: LayoutSectionPresentationStats
  ) =>
    invalidSectionIdSet.has(sectionId) ||
    stats.health === "warning" ||
    stats.health === "critical";
  const machineNeedsAttention = (machine: LayoutMachineItem) =>
    invalidMachineIdSet.has(machine.assetId) ||
    machine.openIncidentsCount > 0 ||
    machine.openWorkOrdersCount > 0 ||
    machine.status === AssetStatus.Broken;
  const roadNeedsAttention = (roadId: string) => invalidRoadIdSet.has(roadId);
  const sectionMatchesFocus = (sectionId: string) =>
    !hasSelectionFocus
      ? true
      : selectedRoadId !== null
        ? false
        : focusSectionId === sectionId;
  const machineMatchesFocus = (machine: LayoutMachineItem) =>
    !hasSelectionFocus
      ? true
      : selectedAssetId !== null
        ? machine.assetId === selectedAssetId
        : selectedSectionId !== null
          ? machine.sectionId === selectedSectionId
          : false;
  const roadMatchesFocus = (roadId: string) =>
    !hasSelectionFocus ? true : selectedRoadId === roadId;
  const computeLayerOpacity = (matchesFocus: boolean, needsAttention: boolean) => {
    const selectionHighlight = hasSelectionFocus && matchesFocus;

    if (attentionMode) {
      if (needsAttention || selectionHighlight) {
        return focusMode && hasSelectionFocus && !matchesFocus ? 0.35 : 1;
      }

      return 0.12;
    }

    if (focusMode && hasSelectionFocus && !matchesFocus) {
      return 0.18;
    }

    return 1;
  };
  const selectedRoadVertexPoints = useMemo(() => {
    if (!selectedRoad) return [];

    const points: Array<{ x: number; y: number; index: number }> = [];
    for (let index = 0; index + 1 < selectedRoad.points.length; index += 2) {
      points.push({
        x: selectedRoad.points[index],
        y: selectedRoad.points[index + 1],
        index: index / 2,
      });
    }

    return points;
  }, [selectedRoad]);
  const sectionDraftVertexPoints = useMemo(() => {
    const points: Array<{ x: number; y: number; index: number }> = [];
    for (let index = 0; index + 1 < draftSectionBoundary.length; index += 2) {
      points.push({
        x: draftSectionBoundary[index],
        y: draftSectionBoundary[index + 1],
        index: index / 2,
      });
    }

    return points;
  }, [draftSectionBoundary]);

  const toWorld = (stage: any) => {
    const currentPointer = stage.getPointerPosition();
    if (!currentPointer) return null;

    return {
      x: (currentPointer.x - pos.x) / viewScale,
      y: (currentPointer.y - pos.y) / viewScale,
    };
  };

  const boundarySegments = useMemo(() => {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let index = 0; index + 3 < boundary.points.length; index += 2) {
      segments.push({
        x1: boundary.points[index],
        y1: boundary.points[index + 1],
        x2: boundary.points[index + 2],
        y2: boundary.points[index + 3],
      });
    }

    if (boundary.closed && boundary.points.length >= 4) {
      segments.push({
        x1: boundary.points[boundary.points.length - 2],
        y1: boundary.points[boundary.points.length - 1],
        x2: boundary.points[0],
        y2: boundary.points[1],
      });
    }

    return segments;
  }, [boundary.closed, boundary.points]);

  const draftSectionSegments = useMemo(() => {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let index = 0; index + 3 < draftSectionBoundary.length; index += 2) {
      segments.push({
        x1: draftSectionBoundary[index],
        y1: draftSectionBoundary[index + 1],
        x2: draftSectionBoundary[index + 2],
        y2: draftSectionBoundary[index + 3],
      });
    }

    if (isDraftSectionClosed && draftSectionBoundary.length >= 4) {
      segments.push({
        x1: draftSectionBoundary[draftSectionBoundary.length - 2],
        y1: draftSectionBoundary[draftSectionBoundary.length - 1],
        x2: draftSectionBoundary[0],
        y2: draftSectionBoundary[1],
      });
    }

    return segments;
  }, [draftSectionBoundary, isDraftSectionClosed]);

  const handleWheel = (event: any) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    const oldScale = viewScale;
    const mousePoint = {
      x: (pointerPosition.x - pos.x) / oldScale,
      y: (pointerPosition.y - pos.y) / oldScale,
    };

    const nextScale = clamp(
      event.evt.deltaY > 0 ? oldScale / 1.1 : oldScale * 1.1,
      0.3,
      4
    );

    setViewScale(nextScale);
    setPos({
      x: pointerPosition.x - mousePoint.x * nextScale,
      y: pointerPosition.y - mousePoint.y * nextScale,
    });
  };

  const handleStageMouseMove = (event: any) => {
    const stage = event.target.getStage?.();
    if (!stage) return;
    setPointer(toWorld(stage));
  };

  const handleStageMouseDown = (event: any) => {
    const stage = event.target.getStage?.();
    if (!stage) return;

    const isMiddleClick = event.evt?.button === 1;
    if (isSpaceDown || isMiddleClick) {
      stage.draggable(true);
      stage.startDrag();
      return;
    }

    if (event.target !== stage) {
      return;
    }

    const world = toWorld(stage);
    if (!world) return;

    if (boundaryRequired && !boundary.closed) {
      addBoundaryPoint(world.x, world.y);
      return;
    }

    if (mode === "draw-section") {
      onAddSectionPoint(world.x, world.y);
      return;
    }

    if (mode === "draw-road") {
      onAddRoadPoint(world.x, world.y);
      return;
    }

    if (mode === "place-machine" && pendingMachineId) {
      onPlaceMachine(pendingMachineId, world.x, world.y);
      return;
    }

    setPreviewAssetId(null);
    onSelectAsset(null);
    onSelectSection(null);
    onSelectRoad(null);
  };

  const handleStageMouseUp = (event: any) => {
    const stage = event.target.getStage?.();
    if (!stage) return;
    if (stage.isDragging()) {
      stage.draggable(false);
      const stagePosition = stage.position();
      setPos({ x: stagePosition.x, y: stagePosition.y });
    }
  };

  const handleStageDragEnd = (event: any) => {
    const stage = event.target.getStage?.();
    if (!stage) return;
    const stagePosition = stage.position();
    setPos({ x: stagePosition.x, y: stagePosition.y });
  };

  const fitViewportToBounds = (
    bounds:
      | {
          minX: number;
          minY: number;
          maxX: number;
          maxY: number;
          width: number;
          height: number;
        }
      | null
      | undefined
  ) => {
    if (!bounds) return;

    const padding = 80;
    const availableWidth = Math.max(width - padding * 2, 160);
    const availableHeight = Math.max(height - padding * 2, 160);
    const nextScale = clamp(
      Math.min(
        availableWidth / Math.max(bounds.width, 1),
        availableHeight / Math.max(bounds.height, 1)
      ),
      0.3,
      4
    );

    setViewScale(nextScale);
    setPos({
      x: width / 2 - (bounds.minX + bounds.width / 2) * nextScale,
      y: height / 2 - (bounds.minY + bounds.height / 2) * nextScale,
    });
  };

  const handleFitHall = () => {
    const hallBounds = polygonBounds(boundary.points);
    const contentBounds = mergeBounds([
      hallBounds,
      ...sections.map((section) => polygonBounds(section.boundary.points)),
      ...roads.map((road) => polygonBounds(road.points)),
      ...machines.map(rotatedMachineBounds),
    ]);

    fitViewportToBounds(contentBounds);
  };

  const handleFitSelection = () => {
    if (selectedMachine) {
      fitViewportToBounds(rotatedMachineBounds(selectedMachine));
      return;
    }

    if (draftSectionBoundary.length >= 6) {
      fitViewportToBounds(polygonBounds(draftSectionBoundary));
      return;
    }

    if (selectedSection) {
      fitViewportToBounds(polygonBounds(selectedSection.boundary.points));
      return;
    }

    if (selectedRoad) {
      fitViewportToBounds(polygonBounds(selectedRoad.points));
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={viewScale}
        scaleY={viewScale}
        x={pos.x}
        y={pos.y}
        onWheel={handleWheel}
        onMouseMove={handleStageMouseMove}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onDragEnd={handleStageDragEnd}
        onDblClick={() => {
          if (boundaryRequired && !boundary.closed) {
            closeBoundary();
          } else if (mode === "draw-section" && !isDraftSectionClosed) {
            onCloseSection();
          } else if (mode === "draw-road" && draftRoadPoints.length >= 4) {
            onFinishRoad();
          }
        }}
        style={{
          background:
            "radial-gradient(circle at top right, rgba(14,165,233,0.06), transparent 26%), #f8fafc",
        }}
      >
        <GridOverlay
          width={width / viewScale}
          height={height / viewScale}
          gridSize={gridSize}
        />

        <Layer>
          {sections.map((section) => {
            const center = polygonCenter(section.boundary.points);
            const isSelected = section.id === selectedSectionId;
            const hasValidationIssue = invalidSectionIdSet.has(section.id);
            const stats = sectionStatsById[section.id] ?? defaultSectionStats;
            const matchesFocus = sectionMatchesFocus(section.id);
            const needsAttention = sectionNeedsAttention(section.id, stats);
            const layerOpacity = computeLayerOpacity(matchesFocus, needsAttention);
            const statusLabel = sectionStatusLabel(stats);
            const statusColors = sectionStatusColors(stats);
            const title =
              section.code && section.code.trim().length > 0
                ? `${section.name} (${section.code})`
                : section.name;
            const titleWidth = Math.max(
              estimateTextWidth(title, uiFont) + 24 / viewScale,
              110 / viewScale
            );
            const statusWidth = estimateTextWidth(statusLabel, uiFont - 1) + 20 / viewScale;

            return (
              <React.Fragment key={section.id}>
                <Line
                  points={section.boundary.points}
                  closed={section.boundary.closed}
                  fill={
                    isSelected
                      ? "rgba(14,165,233,0.2)"
                      : hasValidationIssue
                        ? "rgba(251,113,133,0.12)"
                      : stats.health === "critical"
                        ? "rgba(244,63,94,0.12)"
                        : stats.health === "warning"
                          ? "rgba(245,158,11,0.12)"
                          : "rgba(148,163,184,0.1)"
                  }
                  stroke={
                    isSelected
                      ? "#0284c7"
                      : hasValidationIssue
                        ? "#e11d48"
                      : stats.health === "critical"
                        ? "#fb7185"
                        : stats.health === "warning"
                          ? "#f59e0b"
                          : "#94a3b8"
                  }
                  strokeWidth={isSelected ? 2 : 1}
                  opacity={layerOpacity}
                  listening={mode === "select" || mode === "place-machine"}
                  onClick={(event) => {
                    event.cancelBubble = true;

                    if (mode === "place-machine" && pendingMachineId) {
                      const stage = event.target.getStage?.();
                      const world = stage ? toWorld(stage) : null;
                      if (world) {
                        onPlaceMachine(pendingMachineId, world.x, world.y);
                      }
                      return;
                    }

                    onSelectAsset(null);
                    onSelectRoad(null);
                    onSelectSection(section.id);
                  }}
                />

                {showLabels ? (
                  <>
                    <Rect
                      x={center.x - titleWidth / 2}
                      y={center.y - 30 / viewScale}
                      width={titleWidth}
                      height={18 / viewScale}
                      cornerRadius={8 / viewScale}
                      fill={isSelected ? "rgba(2,132,199,0.12)" : "rgba(255,255,255,0.88)"}
                      stroke={isSelected ? "#38bdf8" : "rgba(148,163,184,0.35)"}
                      strokeWidth={1 / viewScale}
                      opacity={layerOpacity}
                      listening={false}
                    />
                    <Text
                      x={center.x - titleWidth / 2 + 8 / viewScale}
                      y={center.y - 27 / viewScale}
                      width={titleWidth - 16 / viewScale}
                      align="center"
                      text={title}
                      fontSize={uiFont}
                      fontStyle="bold"
                      fill={isSelected ? "#0369a1" : "#334155"}
                      opacity={layerOpacity}
                      listening={false}
                    />

                    <Rect
                      x={center.x - statusWidth / 2}
                      y={center.y - 6 / viewScale}
                      width={statusWidth}
                      height={16 / viewScale}
                      cornerRadius={999 / viewScale}
                      fill={statusColors.fill}
                      stroke={statusColors.stroke}
                      strokeWidth={1 / viewScale}
                      opacity={layerOpacity}
                      listening={false}
                    />
                    <Text
                      x={center.x - statusWidth / 2}
                      y={center.y - 4 / viewScale}
                      width={statusWidth}
                      align="center"
                      text={statusLabel}
                      fontSize={Math.max(uiFont - 1, 7)}
                      fontStyle="bold"
                      fill={statusColors.text}
                      opacity={layerOpacity}
                      listening={false}
                    />
                  </>
                ) : null}
              </React.Fragment>
            );
          })}
        </Layer>

        <Layer listening={false}>
          {draftSectionBoundary.length >= 2 ? (
            <Line
              points={draftSectionBoundary}
              closed={isDraftSectionClosed}
              fill={isDraftSectionClosed ? "rgba(16,185,129,0.16)" : undefined}
              stroke="#059669"
              strokeWidth={2}
              dash={isDraftSectionClosed ? undefined : [8, 6]}
              lineJoin="round"
            />
          ) : null}

          {mode === "draw-section" &&
          !isDraftSectionClosed &&
          pointer &&
          draftSectionBoundary.length >= 2 ? (
            <Line
              points={[
                draftSectionBoundary[draftSectionBoundary.length - 2],
                draftSectionBoundary[draftSectionBoundary.length - 1],
                pointer.x,
                pointer.y,
              ]}
              stroke="#10b981"
              strokeWidth={2}
              dash={[6, 6]}
            />
          ) : null}
        </Layer>

        <Layer>
          {sectionDraftVertexPoints.map((point) => (
            <Circle
              key={`section-draft-vertex-${point.index}`}
              x={point.x}
              y={point.y}
              radius={Math.max(7 / viewScale, 4)}
              fill="#ffffff"
              stroke="#059669"
              strokeWidth={2 / viewScale}
              draggable={Boolean(onUpdateSectionDraftVertex)}
              onMouseDown={(event) => {
                event.cancelBubble = true;
              }}
              onDragStart={(event) => {
                event.cancelBubble = true;
                onSectionDraftVertexDragStart?.(point.index);
              }}
              onDragMove={(event) => {
                event.cancelBubble = true;
                const nextPosition = event.target.position();
                onUpdateSectionDraftVertex?.(
                  point.index,
                  nextPosition.x,
                  nextPosition.y
                );
              }}
              onDragEnd={(event) => {
                event.cancelBubble = true;
                const nextPosition = event.target.position();
                onUpdateSectionDraftVertex?.(
                  point.index,
                  nextPosition.x,
                  nextPosition.y
                );
              }}
            />
          ))}
        </Layer>

        <Layer listening={false}>
          {boundary.points.length >= 2 ? (
            <Line
              points={boundary.points}
              closed={boundary.closed}
              fill={boundary.closed ? "rgba(15,23,42,0.04)" : undefined}
              stroke="#0f172a"
              strokeWidth={2}
              lineJoin="round"
            />
          ) : null}

          {boundaryRequired && !boundary.closed && pointer && boundary.points.length >= 2 ? (
            <Line
              points={[
                boundary.points[boundary.points.length - 2],
                boundary.points[boundary.points.length - 1],
                pointer.x,
                pointer.y,
              ]}
              stroke="#64748b"
              strokeWidth={2}
              dash={[6, 6]}
            />
          ) : null}
        </Layer>

        {showMeasurementLabels ? (
          <Layer listening={false}>
            {draftSectionSegments.map((segment, index) => {
              const labelPos = segmentLabelPos(
                segment.x1,
                segment.y1,
                segment.x2,
                segment.y2
              );
              return (
                <Text
                  key={`draft-section-label-${index}`}
                  x={labelPos.x}
                  y={labelPos.y}
                  text={formatMeters(
                    distMeters(
                      segment.x1,
                      segment.y1,
                      segment.x2,
                      segment.y2,
                      metersPerPx
                    )
                  )}
                  fontSize={uiFont}
                  fill="#047857"
                />
              );
            })}

            {isDraftSectionClosed && draftSectionBoundary.length >= 6 ? (
              <Text
                x={polygonCenter(draftSectionBoundary).x - 60}
                y={polygonCenter(draftSectionBoundary).y - 10}
                width={120}
                align="center"
                text={draftSectionName ?? "Nowa sekcja"}
                fontSize={uiFont}
                fontStyle="bold"
                fill="#047857"
              />
            ) : null}
          </Layer>
        ) : null}

        {showMeasurementLabels ? (
          <Layer listening={false}>
            {boundarySegments.map((segment, index) => {
              const labelPos = segmentLabelPos(
                segment.x1,
                segment.y1,
                segment.x2,
                segment.y2
              );
              return (
                <Text
                  key={`boundary-label-${index}`}
                  x={labelPos.x}
                  y={labelPos.y}
                  text={formatMeters(
                    distMeters(
                      segment.x1,
                      segment.y1,
                      segment.x2,
                      segment.y2,
                      metersPerPx
                    )
                  )}
                  fontSize={uiFont}
                  fill="#cbd5e1"
                />
              );
            })}
          </Layer>
        ) : null}

        <Layer>
          {roads.map((road) => {
            const isSelected = road.id === selectedRoadId;
            const hasValidationIssue = invalidRoadIdSet.has(road.id);
            const matchesFocus = roadMatchesFocus(road.id);
            const needsAttention = roadNeedsAttention(road.id);
            const layerOpacity = computeLayerOpacity(matchesFocus, needsAttention);
            const labelPoint = polylineCenter(road.points);
            const roadStrokeWidth = Math.max(road.width / viewScale, 3 / viewScale);

            return (
              <React.Fragment key={road.id}>
                <Line
                  points={road.points}
                  stroke={
                    isSelected
                      ? "rgba(14,116,144,0.32)"
                      : hasValidationIssue
                        ? "rgba(190,24,93,0.18)"
                        : "rgba(51,65,85,0.18)"
                  }
                  strokeWidth={roadStrokeWidth + 10 / viewScale}
                  opacity={layerOpacity}
                  lineCap="round"
                  lineJoin="round"
                  listening={mode === "select"}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    setPreviewAssetId(null);
                    onSelectAsset(null);
                    onSelectSection(null);
                    onSelectRoad(road.id);
                  }}
                />
                <Line
                  points={road.points}
                  stroke={
                    isSelected
                      ? "#0f766e"
                      : hasValidationIssue
                        ? "#e11d48"
                        : "#475569"
                  }
                  strokeWidth={roadStrokeWidth}
                  dash={
                    isSelected
                      ? [10 / viewScale, 7 / viewScale]
                      : [7 / viewScale, 6 / viewScale]
                  }
                  opacity={layerOpacity}
                  lineCap="round"
                  lineJoin="round"
                  listening={mode === "select"}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    setPreviewAssetId(null);
                    onSelectAsset(null);
                    onSelectSection(null);
                    onSelectRoad(road.id);
                  }}
                />
                {showLabels ? (
                  <>
                    <Rect
                      x={labelPoint.x - 56 / viewScale}
                      y={labelPoint.y - 26 / viewScale}
                      width={112 / viewScale}
                      height={18 / viewScale}
                      cornerRadius={999 / viewScale}
                      fill="rgba(255,255,255,0.94)"
                      stroke={isSelected ? "rgba(15,118,110,0.32)" : "rgba(148,163,184,0.35)"}
                      strokeWidth={1 / viewScale}
                      opacity={layerOpacity}
                      listening={false}
                    />
                    <Text
                      x={labelPoint.x - 56 / viewScale}
                      y={labelPoint.y - 24 / viewScale}
                      width={112 / viewScale}
                      align="center"
                      text={road.name}
                      fontSize={Math.max(uiFont - 1, 7)}
                      fontStyle="bold"
                      fill={isSelected ? "#115e59" : "#334155"}
                      opacity={layerOpacity}
                      listening={false}
                    />
                  </>
                ) : null}
              </React.Fragment>
            );
          })}

          {selectedRoad &&
          mode === "select" &&
          !draftRoadPoints.length &&
          selectedRoadVertexPoints.map((point) => (
            <Circle
              key={`road-vertex-${selectedRoad.id}-${point.index}`}
              x={point.x}
              y={point.y}
              radius={Math.max(7 / viewScale, 4)}
              fill="#ffffff"
              stroke="#0f766e"
              strokeWidth={2 / viewScale}
              draggable={Boolean(onUpdateRoadVertex)}
              onMouseDown={(event) => {
                event.cancelBubble = true;
              }}
              onDragStart={(event) => {
                event.cancelBubble = true;
                onRoadVertexDragStart?.(selectedRoad.id, point.index);
              }}
              onDragMove={(event) => {
                event.cancelBubble = true;
                const nextPosition = event.target.position();
                onUpdateRoadVertex?.(
                  selectedRoad.id,
                  point.index,
                  nextPosition.x,
                  nextPosition.y
                );
              }}
              onDragEnd={(event) => {
                event.cancelBubble = true;
                const nextPosition = event.target.position();
                onUpdateRoadVertex?.(
                  selectedRoad.id,
                  point.index,
                  nextPosition.x,
                  nextPosition.y
                );
              }}
            />
          ))}

          {draftRoadPoints.length >= 4 ? (
            <>
              <Line
                points={draftRoadPoints}
                stroke="rgba(16,185,129,0.22)"
                strokeWidth={roadPreviewWidth + 10 / viewScale}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
              <Line
                points={draftRoadPoints}
                stroke="#10b981"
                strokeWidth={roadPreviewWidth}
                dash={[10 / viewScale, 7 / viewScale]}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            </>
          ) : null}

          {mode === "draw-road" && pointer && draftRoadPoints.length >= 2 ? (
            <Line
              points={[
                draftRoadPoints[draftRoadPoints.length - 2],
                draftRoadPoints[draftRoadPoints.length - 1],
                pointer.x,
                pointer.y,
              ]}
              stroke="#10b981"
              strokeWidth={roadPreviewWidth}
              dash={[8 / viewScale, 7 / viewScale]}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          ) : null}

          {showLabels && draftRoadLabelPoint ? (
            <>
              <Rect
                x={draftRoadLabelPoint.x - 56 / viewScale}
                y={draftRoadLabelPoint.y - 26 / viewScale}
                width={112 / viewScale}
                height={18 / viewScale}
                cornerRadius={999 / viewScale}
                fill="rgba(255,255,255,0.94)"
                stroke="rgba(16,185,129,0.32)"
                strokeWidth={1 / viewScale}
                listening={false}
              />
              <Text
                x={draftRoadLabelPoint.x - 56 / viewScale}
                y={draftRoadLabelPoint.y - 24 / viewScale}
                width={112 / viewScale}
                align="center"
                text={draftRoadName ?? "Nowa droga"}
                fontSize={Math.max(uiFont - 1, 7)}
                fontStyle="bold"
                fill="#047857"
                listening={false}
              />
            </>
          ) : null}
        </Layer>

        <Layer>
          {machines.map((machine) => {
            const isSelected = machine.assetId === selectedAssetId;
            const hasValidationIssue = invalidMachineIdSet.has(machine.assetId);
            const matchesFocus = machineMatchesFocus(machine);
            const needsAttention = machineNeedsAttention(machine);
            const layerOpacity = computeLayerOpacity(matchesFocus, needsAttention);
            const isCompact =
              machine.width < compactThreshold || machine.height < compactThreshold;
            const visualWidth = isCompact
              ? Math.max(machine.width, compactThreshold)
              : machine.width;
            const visualHeight = isCompact
              ? Math.max(machine.height, compactThreshold)
              : machine.height;
            const offsetX = (machine.width - visualWidth) / 2;
            const offsetY = (machine.height - visualHeight) / 2;
            const markerRadius = Math.max(visualWidth, visualHeight) / 2;
            const shortCode = machine.code.slice(0, 3).toUpperCase();
            const incidentLabel =
              machine.openIncidentsCount > 0 ? `! ${machine.openIncidentsCount}` : null;
            const workOrderLabel =
              machine.openWorkOrdersCount > 0
                ? `UR ${machine.openWorkOrdersCount}`
                : null;
            const machineLabelWidth = Math.max(
              visualWidth - 12 / viewScale,
              46 / viewScale
            );

            return (
              <Group
                key={machine.assetId}
                x={machine.x}
                y={machine.y}
                rotation={machine.rotationDeg}
                listening={mode === "select"}
                draggable={
                  !isSpaceDown &&
                  !(boundaryRequired && !boundary.closed) &&
                  mode === "select"
                }
                opacity={layerOpacity}
                onClick={(event) => {
                  event.cancelBubble = true;
                  setPreviewAssetId(null);
                  onSelectRoad(null);
                  onSelectSection(machine.sectionId ?? null);
                  onSelectAsset(machine.assetId);
                }}
                onDragStart={() => {
                  onMachineMoveStart?.(machine.assetId);
                  onSelectAsset(machine.assetId);
                }}
                onDragEnd={(event) => {
                  const point = event.target.position();
                  onMoveMachine(machine.assetId, point.x, point.y);
                }}
              >
                {isCompact ? (
                  <>
                    <Circle
                      x={offsetX + visualWidth / 2}
                      y={offsetY + visualHeight / 2}
                      radius={markerRadius}
                      fill={machineFill(machine.status, isSelected)}
                      stroke={
                        isSelected
                          ? "#020617"
                          : hasValidationIssue
                            ? "#e11d48"
                            : "rgba(15,23,42,0.2)"
                      }
                      strokeWidth={isSelected ? 2 / viewScale : 1 / viewScale}
                      opacity={0.95}
                    />
                    {showLabels ? (
                      <Text
                        x={offsetX}
                        y={offsetY + visualHeight / 2 - machineLabelFont / 2}
                        width={visualWidth}
                        align="center"
                        text={shortCode}
                        fontSize={machineLabelFont}
                        fill="#ffffff"
                        fontStyle="bold"
                        listening={false}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <Rect
                      x={offsetX}
                      y={offsetY}
                      width={visualWidth}
                      height={visualHeight}
                      cornerRadius={6}
                      fill={machineFill(machine.status, isSelected)}
                      stroke={
                        isSelected
                          ? "#020617"
                          : hasValidationIssue
                            ? "#e11d48"
                            : "rgba(15,23,42,0.15)"
                      }
                      strokeWidth={isSelected ? 2 / viewScale : 1 / viewScale}
                      opacity={0.92}
                    />
                    {showLabels ? (
                      <Text
                        x={offsetX + 6 / viewScale}
                        y={offsetY + 6 / viewScale}
                        width={machineLabelWidth}
                        text={`${machine.code}\n${machine.name}`}
                        fontSize={machineLabelFont}
                        fill="#ffffff"
                        fontStyle="bold"
                        listening={false}
                      />
                    ) : null}
                  </>
                )}

                {incidentLabel ? (
                  <StatusPill
                    x={offsetX + visualWidth - (estimateTextWidth(incidentLabel, alertFont) + 18 / viewScale)}
                    y={offsetY - 10 / viewScale}
                    label={incidentLabel}
                    fill="#ffe4e6"
                    stroke="#fb7185"
                    textColor="#9f1239"
                    fontSize={alertFont}
                    viewScale={viewScale}
                    onClick={() => {
                      setPreviewAssetId(machine.assetId);
                      onSelectSection(machine.sectionId ?? null);
                      onSelectAsset(machine.assetId);
                    }}
                  />
                ) : null}

                {workOrderLabel ? (
                  <StatusPill
                    x={offsetX + visualWidth - (estimateTextWidth(workOrderLabel, alertFont) + 18 / viewScale)}
                    y={
                      offsetY -
                      (incidentLabel ? 28 / viewScale : 10 / viewScale)
                    }
                    label={workOrderLabel}
                    fill="#fef3c7"
                    stroke="#f59e0b"
                    textColor="#92400e"
                    fontSize={alertFont}
                    viewScale={viewScale}
                  />
                ) : null}
              </Group>
            );
          })}

          {mode === "place-machine" && pendingMachineId && pointer ? (
            (() => {
              const isCompactPreview =
                pendingPreviewSize.width < compactThreshold ||
                pendingPreviewSize.height < compactThreshold;
              const previewWidth = isCompactPreview
                ? Math.max(pendingPreviewSize.width, compactThreshold)
                : pendingPreviewSize.width;
              const previewHeight = isCompactPreview
                ? Math.max(pendingPreviewSize.height, compactThreshold)
                : pendingPreviewSize.height;
              const previewOffsetX = (pendingPreviewSize.width - previewWidth) / 2;
              const previewOffsetY = (pendingPreviewSize.height - previewHeight) / 2;

              return isCompactPreview ? (
                <Circle
                  x={pointer.x + previewOffsetX + previewWidth / 2}
                  y={pointer.y + previewOffsetY + previewHeight / 2}
                  radius={Math.max(previewWidth, previewHeight) / 2}
                  fill="rgba(15,23,42,0.22)"
                  stroke="#0f172a"
                  dash={[6 / viewScale, 4 / viewScale]}
                  strokeWidth={1 / viewScale}
                  listening={false}
                />
              ) : (
                <Rect
                  x={pointer.x}
                  y={pointer.y}
                  width={pendingPreviewSize.width}
                  height={pendingPreviewSize.height}
                  fill="rgba(15,23,42,0.18)"
                  stroke="#0f172a"
                  dash={[6, 4]}
                  cornerRadius={6}
                  listening={false}
                />
              );
            })()
          ) : null}

          {mode === "place-machine" && pendingMachineId && pointer ? (
            <Text
              x={pointer.x + 4}
              y={pointer.y - 18}
              text={pendingMachineLabel ?? "Kliknij, aby umiescic maszyne"}
              fontSize={uiFont}
              fill="#e2e8f0"
              listening={false}
            />
          ) : null}
        </Layer>
      </Stage>

      {previewAssetId && previewIncidents.length > 0 ? (
        <div className="absolute bottom-3 left-3 z-10 w-[24rem] rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Szybki podglad awarii
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {previewMachine
                  ? `${previewMachine.name} (${previewMachine.code})`
                  : "Wybrana maszyna"}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {previewIncidents.length} aktywnych zgloszen na tej maszynie
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPreviewAssetId(null)}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Zamknij
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {previewIncidents.slice(0, 3).map((incident) => (
              <div
                key={incident.id}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-100">
                      {incident.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Zgloszono: {formatDateTime(incident.reportedAtUtc)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${failureSeverityClasses(incident.severity)}`}
                    >
                      {failureSeverityLabel(incident.severity)}
                    </span>
                    <span className="inline-flex rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-medium text-slate-200">
                      {failureStatusLabel(incident.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 line-clamp-3 text-sm text-slate-300">
                  {incident.description}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-400">
                    {incident.failureCauseCategoryName
                      ? `Przyczyna: ${incident.failureCauseCategoryName}`
                      : incident.causesDowntime
                        ? "Zdarzenie powoduje przestoj"
                        : "Brak przypisanej przyczyny"}
                  </div>
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-800"
                  >
                    Szczegoly awarii
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {previewIncidents.length > 3 ? (
            <div className="mt-3 text-xs text-slate-400">
              Pokazano 3 najnowsze awarie. Pozostale znajdziesz w szczegolach maszyny lub na liscie awarii.
            </div>
          ) : null}
        </div>
      ) : null}

      {showOverview ? (
        <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-2xl border border-slate-700 bg-slate-950/92 px-4 py-3 shadow-lg backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Widok hali
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-100">
            {hallName
              ? `${hallName}${hallCode ? ` (${hallCode})` : ""}`
              : "Aktualny layout"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <OverlayMetric
              label="Maszyny"
              value={hallPresentationStats.totalMachines}
              tone="slate"
            />
            <OverlayMetric
              label="Awarie"
              value={hallPresentationStats.activeIncidents}
              tone={hallPresentationStats.activeIncidents > 0 ? "rose" : "emerald"}
            />
            <OverlayMetric
              label="UR"
              value={hallPresentationStats.openWorkOrders}
              tone={hallPresentationStats.openWorkOrders > 0 ? "amber" : "emerald"}
            />
            <OverlayMetric
              label="1:1"
              value={`${hallPresentationStats.machinesWithRealFootprint}/${hallPresentationStats.totalMachines || 0}`}
              tone="sky"
            />
          </div>
        </div>
      ) : null}

      {showLegend ? (
        <div className="pointer-events-none absolute bottom-3 right-3 w-72 rounded-2xl border border-slate-700 bg-slate-950/92 px-4 py-3 shadow-lg backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Legenda
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <LegendRow color="#22c55e" label="Maszyna gotowa do pracy" />
            <LegendRow color="#0ea5e9" label="Maszyna aktualnie w uzyciu" />
            <LegendRow color="#f59e0b" label="Maszyna w utrzymaniu ruchu" />
            <LegendRow color="#ef4444" label="Maszyna z awaria lub statusem broken" />
            <LegendBadgeRow
              tone="rose"
              label="! - kliknij, aby zobaczyc szybki podglad awarii"
            />
            <LegendBadgeRow
              tone="amber"
              label="UR - aktywne zlecenia serwisowe i utrzymaniowe"
            />
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-[11px] text-slate-300 shadow-sm backdrop-blur">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            className="rounded-md border border-slate-700 px-2 py-1 transition hover:bg-slate-800"
            onClick={() => setViewScale((value) => clamp(value * 1.1, 0.3, 4))}
          >
            +
          </button>
          <button
            className="rounded-md border border-slate-700 px-2 py-1 transition hover:bg-slate-800"
            onClick={() => setViewScale((value) => clamp(value / 1.1, 0.3, 4))}
          >
            -
          </button>
          <button
            className="rounded-md border border-slate-700 px-2 py-1 transition hover:bg-slate-800"
            onClick={handleFitHall}
          >
            Hala
          </button>
          <button
            className="rounded-md border border-slate-700 px-2 py-1 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleFitSelection}
            disabled={
              !selectedMachine &&
              !selectedSection &&
              !selectedRoad &&
              draftSectionBoundary.length < 6
            }
          >
            Zaznacz
          </button>
          <button
            className="rounded-md border border-slate-700 px-2 py-1 transition hover:bg-slate-800"
            onClick={() => {
              setViewScale(1);
              setPos({ x: 0, y: 0 });
            }}
          >
            Reset
          </button>
        </div>
        <div className="ml-2 flex flex-wrap items-center gap-2 text-slate-400">
          <span>Zoom: {Math.round(viewScale * 100)}%</span>
          <span>Pan: spacja + przeciagnij</span>
          {focusMode ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-700">
              Fokus
            </span>
          ) : null}
          {attentionMode ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
              Uwaga
            </span>
          ) : null}
        </div>
      </div>

      {boundaryRequired && !boundary.closed ? (
        <div className="absolute left-3 top-4 rounded-xl border border-amber-900/70 bg-amber-950/75 px-3 py-2 text-[11px] text-amber-100 shadow-sm backdrop-blur">
          Klikaj kolejne punkty obrysu hali. Dwuklik zamyka poligon.
        </div>
      ) : null}

      {mode === "draw-section" ? (
        <div className="absolute bottom-3 left-3 rounded-xl border border-emerald-900/70 bg-emerald-950/75 px-3 py-2 text-[11px] text-emerald-100 shadow-sm backdrop-blur">
          Rysowanie sekcji: klikaj kolejne punkty, a dwuklik zamknie obrys. Wierzcholki mozesz potem przeciagnac.
        </div>
      ) : null}

      {mode === "draw-road" ? (
        <div className="absolute bottom-3 left-3 rounded-xl border border-sky-900/70 bg-sky-950/75 px-3 py-2 text-[11px] text-sky-100 shadow-sm backdrop-blur">
          Rysowanie drogi: klikaj kolejne punkty, a dwuklik kończy polilinię.
        </div>
      ) : null}
    </div>
  );
};

function StatusPill({
  x,
  y,
  label,
  fill,
  stroke,
  textColor,
  fontSize,
  viewScale,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  fill: string;
  stroke: string;
  textColor: string;
  fontSize: number;
  viewScale: number;
  onClick?: () => void;
}) {
  const width = estimateTextWidth(label, fontSize) + 18 / viewScale;
  const height = 16 / viewScale;
  const handleClick = (event: { cancelBubble?: boolean }) => {
    if (!onClick) return;
    event.cancelBubble = true;
    onClick();
  };

  return (
    <Group listening={Boolean(onClick)}>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        cornerRadius={999 / viewScale}
        fill={fill}
        stroke={stroke}
        strokeWidth={1 / viewScale}
        listening={Boolean(onClick)}
        onClick={handleClick}
      />
      <Text
        x={x}
        y={y + 2 / viewScale}
        width={width}
        align="center"
        text={label}
        fontSize={fontSize}
        fontStyle="bold"
        fill={textColor}
        listening={Boolean(onClick)}
        onClick={handleClick}
      />
    </Group>
  );
}

function OverlayMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "slate" | "emerald" | "amber" | "rose" | "sky";
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-700 bg-slate-900 text-slate-100",
    emerald: "border-emerald-900/70 bg-emerald-950/50 text-emerald-100",
    amber: "border-amber-900/70 bg-amber-950/50 text-amber-100",
    rose: "border-rose-900/70 bg-rose-950/50 text-rose-100",
    sky: "border-sky-900/70 bg-sky-950/50 text-sky-100",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses[tone]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function LegendRow({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex h-3 w-3 rounded-sm border border-slate-600"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

function LegendBadgeRow({
  tone,
  label,
}: {
  tone: "amber" | "rose";
  label: string;
}) {
  const className =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${className}`}
      >
        {tone === "rose" ? "!" : "UR"}
      </span>
      <span>{label}</span>
    </div>
  );
}
