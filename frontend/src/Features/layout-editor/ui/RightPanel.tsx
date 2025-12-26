import React from "react";
import { useEditorState } from "../model/useEditorState";

export const RightPanel: React.FC = () => {
  const { elements, selectedElementId, updateElement } = useEditorState();
  const selected = elements.find((e) => e.id === selectedElementId);

  if (!selected) {
    return (
      <aside className="hidden w-72 flex-shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-3 lg:flex">
        <p className="text-xs text-slate-500">
          Zaznacz element na hali, aby edytować jego właściwości.
        </p>
      </aside>
    );
  }

  return (
    <aside className="hidden w-72 flex-shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-3 lg:flex">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Właściwości
      </h2>

      <div className="mt-3 flex flex-col gap-2 text-xs text-slate-700">
        <label className="flex flex-col gap-1">
          <span>Nazwa</span>
          <input
            className="rounded border border-slate-300 px-2 py-1 text-xs"
            value={selected.name}
            onChange={(e) =>
              updateElement(selected.id, { name: e.target.value })
            }
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span>X [px]</span>
            <input
              type="number"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              value={selected.x}
              onChange={(e) =>
                updateElement(selected.id, { x: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Y [px]</span>
            <input
              type="number"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              value={selected.y}
              onChange={(e) =>
                updateElement(selected.id, { y: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span>Szerokość [px]</span>
            <input
              type="number"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              value={selected.width}
              onChange={(e) =>
                updateElement(selected.id, { width: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Wysokość [px]</span>
            <input
              type="number"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              value={selected.height}
              onChange={(e) =>
                updateElement(selected.id, { height: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span>Rotacja [°]</span>
          <input
            type="number"
            className="rounded border border-slate-300 px-2 py-1 text-xs"
            value={selected.rotation}
            onChange={(e) =>
              updateElement(selected.id, { rotation: Number(e.target.value) })
            }
          />
        </label>
      </div>
    </aside>
  );
};
