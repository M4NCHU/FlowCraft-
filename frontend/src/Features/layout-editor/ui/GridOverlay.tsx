import React from "react";
import { Layer, Line } from "react-konva";

interface GridOverlayProps {
  width: number;
  height: number;
  gridSize: number;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  width,
  height,
  gridSize,
}) => {
  const vertical: React.ReactElement[] = [];
  const horizontal: React.ReactElement[] = [];

  for (let x = 0; x <= width; x += gridSize) {
    vertical.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke="#E5E7EB"
        strokeWidth={1}
      />
    );
  }

  for (let y = 0; y <= height; y += gridSize) {
    horizontal.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke="#E5E7EB"
        strokeWidth={1}
      />
    );
  }

  return (
    <Layer listening={false}>
      {vertical}
      {horizontal}
    </Layer>
  );
};
