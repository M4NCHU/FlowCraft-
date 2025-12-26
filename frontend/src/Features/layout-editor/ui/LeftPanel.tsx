import React from "react";
import { TOOL_DEFINITIONS, type ToolId } from "../model/tools";
import { useEditorState } from "../model/useEditorState";
import { MachinePalette } from "./components/MachinePalette";

interface LeftPanelProps {
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  activeTool,
  onToolChange,
}) => {
  const activeDefinition = TOOL_DEFINITIONS.find((t) => t.id === activeTool);
  const { setPendingMachine, pendingMachineId, clearBoundary, boundary } =
    useEditorState();

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Narzędzia
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          Insert
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {TOOL_DEFINITIONS.map((tool) => {
          const active = tool.id === activeTool;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToolChange(tool.id)}
              className={[
                "w-full rounded-md border px-3 py-2 text-left text-xs transition-colors",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{tool.label}</span>
                {tool.shortcut && (
                  <span
                    className={
                      active
                        ? "rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono"
                        : "rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600"
                    }
                  >
                    {tool.shortcut}
                  </span>
                )}
              </div>
              <p
                className={
                  active
                    ? "mt-1 text-[11px] text-slate-100"
                    : "mt-1 text-[11px] text-slate-500"
                }
              >
                {tool.description}
              </p>
            </button>
          );
        })}

        {activeTool === "machine" && (
          <div className="mt-3 rounded-md border border-slate-200 p-2">
            <MachinePalette onPick={setPendingMachine} />
            <div className="mt-2 text-[11px] text-slate-500">
              Wybrana:{" "}
              <span className="font-medium">
                {pendingMachineId ?? "— brak —"}
              </span>
            </div>
          </div>
        )}

        {activeTool === "boundary" && boundary.points.length > 0 && (
          <div className="mt-3 rounded-md border border-slate-200 p-2 text-[11px]">
            <div className="mb-1 font-medium">Obrys hali</div>
            <div className="text-slate-600">
              Punkty: {boundary.points.length / 2}{" "}
              {boundary.closed ? "(zamknięty)" : "(w trakcie)"}.
            </div>
            <button
              type="button"
              onClick={clearBoundary}
              className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
            >
              Wyczyść obrys
            </button>
            <div className="mt-1 text-slate-500">
              Podpowiedź: dwuklik na płótnie zamyka poligon.
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
        Aktualne narzędzie:{" "}
        <span className="font-medium text-slate-700">
          {activeDefinition?.label ?? "-"}
        </span>
      </div>
    </aside>
  );
};
