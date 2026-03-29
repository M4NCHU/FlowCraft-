// Features/layout-editor/ui/SnappingControls.tsx
import React from "react";
import { useEditorState } from "../model/useEditorState";

export const SnappingControls: React.FC = () => {
  const {
    snapping,
    setSnapToGrid,
    setGridSize,
    layoutScale,
    setMetersPerGridCell,
  } = useEditorState();

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700">
      <label className="inline-flex items-center gap-1">
        <input
          type="checkbox"
          className="h-3 w-3 rounded border-slate-300"
          checked={snapping.snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
        />
        <span>Przyciagaj do siatki</span>
      </label>

      <div className="flex items-center gap-2">
        <span>Rozmiar siatki</span>
        <select
          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px]"
          value={snapping.gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
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
          onChange={(e) => setMetersPerGridCell(Number(e.target.value))}
          className="w-20 rounded border border-slate-300 px-2 py-1 text-[11px]"
        />
        <span>m / kratke</span>
      </div>
    </div>
  );
};
