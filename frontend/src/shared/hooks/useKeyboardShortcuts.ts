import { useEffect } from "react";

type ShortcutMap = Record<string, () => void>;

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = [
        event.ctrlKey ? "ctrl" : null,
        event.shiftKey ? "shift" : null,
        event.altKey ? "alt" : null,
        event.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join("+");

      const handler = shortcuts[key];
      if (!handler) {
        return;
      }

      event.preventDefault();
      handler();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, shortcuts]);
}