import React, { useState } from "react";
import { Stage, Layer, Rect, Line } from "react-konva";
import { useEditorState } from "../model/useEditorState";
import { GridOverlay } from "./GridOverlay";

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
    selectedElementId,
    snapping,
    activeTool,
    addElementAt,
    addRoadSegment,
    moveElement,
    selectElement,
  } = useEditorState();

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
    } else {
      addElementAt(pos.x, pos.y);
    }
  };

  const handleStageMouseMove = (evt: any) => {
    const stage = evt.target.getStage?.();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) {
      setPointer(null);
      return;
    }
    setPointer({ x: pos.x, y: pos.y });
  };

  return (
    <Stage
      width={width}
      height={height}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      style={{ backgroundColor: "#F9FAFB" }}
    >
      <GridOverlay width={width} height={height} gridSize={snapping.gridSize} />

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

      {/* Prostokątne elementy layoutu */}
      <Layer>
        {elements.map((el) => (
          <Rect
            key={el.id}
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            rotation={el.rotation}
            cornerRadius={4}
            fill={
              el.id === selectedElementId
                ? "rgba(15,23,42,0.85)"
                : "rgba(148,163,184,0.9)"
            }
            stroke={el.id === selectedElementId ? "#0F172A" : "#94A3B8"}
            strokeWidth={el.id === selectedElementId ? 2 : 1}
            draggable
            onClick={(e) => {
              e.cancelBubble = true;
              selectElement(el.id);
            }}
            onDragStart={(e) => {
              selectElement(el.id);
            }}
            onDragEnd={(e) => {
              const pos = e.target.position();
              moveElement(el.id, pos.x, pos.y);
            }}
          />
        ))}
      </Layer>
    </Stage>
  );
};
