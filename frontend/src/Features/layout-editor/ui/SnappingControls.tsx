import React from "react";
import { useEditorState } from "../model/useEditorState";

interface SnappingControlsProps {
  snapping?: {
    snapToGrid: boolean;
    gridSize: number;
  };
  layoutScale?: {
    metersPerGridCell: number;
  };
  onSnapToGridChange?: (value: boolean) => void;
  onGridSizeChange?: (value: number) => void;
  onMetersPerGridCellChange?: (value: number) => void;
}

export const SnappingControls: React.FC<SnappingControlsProps> = ({
  snapping: controlledSnapping,
  layoutScale: controlledLayoutScale,
  onSnapToGridChange,
  onGridSizeChange,
  onMetersPerGridCellChange,
}) => {
  const store = useEditorState();
  const snapping = controlledSnapping ?? store.snapping;
  const layoutScale = controlledLayoutScale ?? store.layoutScale;
  const setSnapToGrid = onSnapToGridChange ?? store.setSnapToGrid;
  const setGridSize = onGridSizeChange ?? store.setGridSize;
  const setMetersPerGridCell =
    onMetersPerGridCellChange ?? store.setMetersPerGridCell;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-300">
      <label className="inline-flex items-center gap-1">
        <input
          type="checkbox"
          className="h-3 w-3 rounded border-slate-600"
          checked={snapping.snapToGrid}
          onChange={(event) => setSnapToGrid(event.target.checked)}
        />
        <span>Przyciągaj do siatki</span>
      </label>

      <div className="flex items-center gap-2">
        <span>Rozmiar siatki</span>
        <select
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
          value={snapping.gridSize}
          onChange={(event) => setGridSize(Number(event.target.value))}
        >
          <option value={20}>20 px</option>
          <option value={40}>40 px</option>
          <option value={60}>60 px</option>
          <option value={80}>80 px</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span>Skala</span>
        <input
          type="number"
          min={0.01}
          step={0.1}
          value={layoutScale.metersPerGridCell}
          onChange={(event) => setMetersPerGridCell(Number(event.target.value))}
          className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
        />
        <span>m / kratkę</span>
      </div>
    </div>
  );
};
