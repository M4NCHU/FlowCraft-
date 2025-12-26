import React, { useLayoutEffect, useRef, useState } from "react";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { SnappingControls } from "./SnappingControls";
import { HallCanvas } from "./HallCanvas";
import { useEditorState } from "../model/useEditorState";

export const LayoutEditorPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { activeTool, setActiveTool } = useEditorState();

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Edytor layoutu
          </h1>
          <p className="text-xs text-slate-500">
            Wizualna edycja układu hali na siatce z przyciąganiem i
            właściwościami elementów.
          </p>
        </div>
        <SnappingControls />
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <LeftPanel activeTool={activeTool} onToolChange={setActiveTool} />

        <div
          ref={containerRef}
          className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          {width > 0 && height > 0 && (
            <HallCanvas width={width} height={height} />
          )}
        </div>

        <RightPanel />
      </div>
    </div>
  );
};
