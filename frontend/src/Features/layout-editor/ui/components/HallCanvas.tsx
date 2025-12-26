import React, { useState } from "react";
import { Stage, Layer, Rect, Line, Group, Text } from "react-konva";
import { GridOverlay } from "../GridOverlay";
import { useEditorState } from "../../model/useEditorState";
import { useMachinesStore } from "../../../../entities/machines/model/useMachinesStore";

interface HallCanvasProps {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

export const HallCanvas: React.FC<HallCanvasProps> = ({ width, height }) => {
  const {
    elements,
    roads,
    boundary,
    selectedElementId,
    snapping,
    activeTool,
    addElementAt,
    addRoadSegment,
    addBoundaryPoint,
    closeBoundary,
    moveElement,
    selectElement,
    setOpenMachineDetails,
  } = useEditorState();

  const machines = useMachinesStore((s) => s.machines);

  const [roadStart, setRoadStart] = useState<Point | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);

  const handleStageMouseDown = (evt: any) => {
    const stage = evt.target.getStage?.();
    if (!stage) return;

    const clickedOnEmpty = evt.target === stage;
    if (!clickedOnEmpty) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // kliknięcie w puste tło usuwa zaznaczenie
    selectElement(null);

    if (activeTool === "road") {
      if (!roadStart) {
        setRoadStart({ x: pos.x, y: pos.y });
      } else {
        addRoadSegment(roadStart.x, roadStart.y, pos.x, pos.y);
        setRoadStart(null);
      }
      return;
    }

    if (activeTool === "boundary") {
      addBoundaryPoint(pos.x, pos.y);
      return;
    }

    // domyślnie dodaj prostokątny element / maszynę
    addElementAt(pos.x, pos.y);
  };

  const handleStageMouseMove = (evt: any) => {
    const stage = evt.target.getStage?.();
    if (!stage) {
      setPointer(null);
      return;
    }
    const pos = stage.getPointerPosition();
    setPointer(pos ? { x: pos.x, y: pos.y } : null);
  };

  const handleStageDblClick = () => {
    if (activeTool === "boundary") closeBoundary();
  };

  return (
    <Stage
      width={width}
      height={height}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onDblClick={handleStageDblClick}
      style={{ backgroundColor: "#F9FAFB" }}
    >
      <GridOverlay width={width} height={height} gridSize={snapping.gridSize} />

      {/* Obrys hali */}
      <Layer listening={false}>
        {boundary.points.length >= 2 && (
          <Line
            points={boundary.points}
            closed={boundary.closed}
            fill={boundary.closed ? "rgba(59,130,246,0.06)" : undefined}
            stroke="#334155"
            strokeWidth={2}
            lineJoin="round"
          />
        )}

        {/* Podgląd aktualnego segmentu obrysu */}
        {activeTool === "boundary" &&
          !boundary.closed &&
          pointer &&
          boundary.points.length >= 2 && (
            <Line
              points={[
                boundary.points[boundary.points.length - 2],
                boundary.points[boundary.points.length - 1],
                pointer.x,
                pointer.y,
              ]}
              stroke="#94A3B8"
              strokeWidth={2}
              dash={[6, 6]}
            />
          )}
      </Layer>

      {/* Drogi transportowe */}
      <Layer listening={false}>
        {roads.map((road) => (
          <Line
            key={road.id}
            points={road.points}
            stroke="#2563EB"
            strokeWidth={road.width}
            lineCap="round"
            lineJoin="round"
          />
        ))}

        {/* podgląd rysowanej aktualnie drogi */}
        {activeTool === "road" && roadStart && pointer && (
          <Line
            points={[roadStart.x, roadStart.y, pointer.x, pointer.y]}
            stroke="#93C5FD"
            strokeWidth={snapping.gridSize / 4}
            lineCap="round"
            lineJoin="round"
            dash={[4, 4]}
          />
        )}
      </Layer>

      {/* Elementy layoutu */}
      <Layer>
        {elements.map((el) => {
          const isSelected = el.id === selectedElementId;

          // rendering maszyny jako ikony (Group)
          if (el.type === "machine") {
            const m = machines.find((x) => x.id === el.machineId);
            const label = m?.name ?? "Maszyna";
            const size = Math.min(el.width, el.height);
            const iconR = Math.max(8, Math.floor(size * 0.35));

            return (
              <Group
                key={el.id}
                x={el.x}
                y={el.y}
                rotation={el.rotation}
                draggable
                onClick={(e) => {
                  e.cancelBubble = true;
                  selectElement(el.id);
                  setOpenMachineDetails(el.machineId ?? null);
                }}
                onDragStart={() => selectElement(el.id)}
                onDragEnd={(e) => {
                  const pos = e.target.position();
                  moveElement(el.id, pos.x, pos.y);
                }}
              >
                <Rect
                  width={el.width}
                  height={el.height}
                  cornerRadius={6}
                  fill={
                    isSelected ? "rgba(30,41,59,0.85)" : "rgba(148,163,184,0.9)"
                  }
                  stroke={isSelected ? "#0F172A" : "#94A3B8"}
                  strokeWidth={isSelected ? 2 : 1}
                />
                {/* prosta „ikona” koło z zębatką – tu symboliczne koło */}
                <Line
                  points={[
                    el.width / 2 - iconR,
                    el.height / 2,
                    el.width / 2 + iconR,
                    el.height / 2,
                  ]}
                  stroke="white"
                  strokeWidth={2}
                />
                <Text
                  text={label}
                  x={6}
                  y={6}
                  width={el.width - 12}
                  ellipsis
                  fill="white"
                  fontSize={12}
                  align="left"
                />
              </Group>
            );
          }

          // inne typy prostokątne
          return (
            <Rect
              key={el.id}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              rotation={el.rotation}
              cornerRadius={4}
              fill={
                isSelected ? "rgba(15,23,42,0.85)" : "rgba(148,163,184,0.9)"
              }
              stroke={isSelected ? "#0F172A" : "#94A3B8"}
              strokeWidth={isSelected ? 2 : 1}
              draggable
              onClick={(e) => {
                e.cancelBubble = true;
                selectElement(el.id);
              }}
              onDragStart={() => selectElement(el.id)}
              onDragEnd={(e) => {
                const pos = e.target.position();
                moveElement(el.id, pos.x, pos.y);
              }}
            />
          );
        })}
      </Layer>
    </Stage>
  );
};
