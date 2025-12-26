import React from "react";
import { useEditorState } from "../model/useEditorState";

interface ToolbarProps {
  onSave?: () => void;
  onClear?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onSave, onClear }) => {
  const { clearAll } = useEditorState();

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      clearAll();
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-xs font-medium text-slate-700">
        Tryb edycji layoutu
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          onClick={handleClear}
        >
          Wyczyść
        </button>
        <button
          className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
          onClick={onSave}
        >
          Zapisz layout
        </button>
      </div>
    </div>
  );
};
