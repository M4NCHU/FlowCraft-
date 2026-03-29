import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Text } from "react-konva";
import { AssetStatus } from "../../machines/api/contracts";
import type {
  LayoutEditorMode,
  LayoutMachineItem,
  LayoutSectionOverlay,
} from "../model/editorTypes";
import { useEditorState } from "../model/useEditorState";
import { GridOverlay } from "./GridOverlay";

interface HallCanvasProps {
  width: number;
  height: number;
  mode: LayoutEditorMode;
  sections: LayoutSectionOverlay[];
  machines: LayoutMachineItem[];
  selectedAssetId: string | null;
  selectedSectionId: string | null;
  pendingMachineId: string | null;
  pendingMachineLabel?: string;
  onSelectAsset: (assetId: string | null) => void;
  onSelectSection: (sectionId: string | null) => void;
  onPlaceMachine: (assetId: string, x: number, y: number) => void;
  onMoveMachine: (assetId: string, x: number, y: number) => void;
}

interface Point {
  x: number;
  y: number;
}

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

export const HallCanvas: React.FC<HallCanvasProps> = ({
  width,
  height,
  mode,
  sections,
  machines,
  selectedAssetId,
  selectedSectionId,
  pendingMachineId,
  pendingMachineLabel,
  onSelectAsset,
  onSelectSection,
  onPlaceMachine,
  onMoveMachine,
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

  useEffect(() => {
    setViewScale(1);
    setPos({ x: 0, y: 0 });
  }, [width, height]);

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
  const pendingPreviewSize = useMemo(
    () => ({ width: gridSize * 2, height: gridSize * 2 }),
    [gridSize]
  );

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

    if (mode === "place-machine" && pendingMachineId) {
      onPlaceMachine(pendingMachineId, world.x, world.y);
      return;
    }

    onSelectAsset(null);
    onSelectSection(null);
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

  return (
    <div className="relative h-full w-full">
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
          }
        }}
        style={{ backgroundColor: "#f8fafc" }}
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

            return (
              <React.Fragment key={section.id}>
                <Line
                  points={section.boundary.points}
                  closed={section.boundary.closed}
                  fill={isSelected ? "rgba(14,165,233,0.18)" : "rgba(148,163,184,0.12)"}
                  stroke={isSelected ? "#0284c7" : "#94a3b8"}
                  strokeWidth={isSelected ? 2 : 1}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onSelectAsset(null);
                    onSelectSection(section.id);
                  }}
                />
                <Text
                  x={center.x - 50}
                  y={center.y - 10}
                  width={100}
                  align="center"
                  text={section.code ? `${section.name} (${section.code})` : section.name}
                  fontSize={uiFont}
                  fontStyle="bold"
                  fill={isSelected ? "#0369a1" : "#475569"}
                />
              </React.Fragment>
            );
          })}
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
                fill="#0f172a"
              />
            );
          })}
        </Layer>

        <Layer>
          {machines.map((machine) => {
            const isSelected = machine.assetId === selectedAssetId;
            return (
              <React.Fragment key={machine.assetId}>
                <Rect
                  x={machine.x}
                  y={machine.y}
                  width={machine.width}
                  height={machine.height}
                  rotation={machine.rotationDeg}
                  cornerRadius={6}
                  fill={machineFill(machine.status, isSelected)}
                  stroke={isSelected ? "#020617" : "rgba(15,23,42,0.15)"}
                  strokeWidth={isSelected ? 2 : 1}
                  opacity={0.92}
                  draggable={!isSpaceDown && !(boundaryRequired && !boundary.closed)}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onSelectSection(machine.sectionId ?? null);
                    onSelectAsset(machine.assetId);
                  }}
                  onDragStart={() => onSelectAsset(machine.assetId)}
                  onDragEnd={(event) => {
                    const point = event.target.position();
                    onMoveMachine(machine.assetId, point.x, point.y);
                  }}
                />
                <Text
                  x={machine.x + 6}
                  y={machine.y + 6}
                  width={Math.max(machine.width - 12, 40)}
                  text={`${machine.code}\n${machine.name}`}
                  fontSize={uiFont}
                  fill="#ffffff"
                  fontStyle="bold"
                />
              </React.Fragment>
            );
          })}

          {mode === "place-machine" && pendingMachineId && pointer ? (
            <Rect
              x={pointer.x}
              y={pointer.y}
              width={pendingPreviewSize.width}
              height={pendingPreviewSize.height}
              fill="rgba(15,23,42,0.18)"
              stroke="#0f172a"
              dash={[6, 4]}
              cornerRadius={6}
            />
          ) : null}

          {mode === "place-machine" && pendingMachineId && pointer ? (
            <Text
              x={pointer.x + 4}
              y={pointer.y - 18}
              text={pendingMachineLabel ?? "Kliknij, aby umieścić maszynę"}
              fontSize={uiFont}
              fill="#0f172a"
            />
          ) : null}
        </Layer>
      </Stage>

      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-sm">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
            onClick={() => setViewScale((value) => clamp(value * 1.1, 0.3, 4))}
          >
            +
          </button>
          <button
            className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
            onClick={() => setViewScale((value) => clamp(value / 1.1, 0.3, 4))}
          >
            -
          </button>
          <button
            className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
            onClick={() => {
              setViewScale(1);
              setPos({ x: 0, y: 0 });
            }}
          >
            Reset
          </button>
        </div>
        <div className="ml-2 text-slate-500">
          Zoom: {Math.round(viewScale * 100)}% • Pan: spacja + przeciągnij
        </div>
      </div>

      {boundaryRequired && !boundary.closed ? (
        <div className="absolute left-3 top-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
          Klikaj kolejne punkty obrysu hali. Dwuklik zamyka poligon.
        </div>
      ) : null}
    </div>
  );
};
