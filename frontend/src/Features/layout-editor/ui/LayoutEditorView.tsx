import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { HallDetailsResponse } from "../../halls/api/contracts";
import { getHallDetails, updateHall } from "../../halls/api/hallsApi";
import type { HallBoundary } from "../model/layoutTypes";
import { useEditorState } from "../model/useEditorState";
import { HallCanvas } from "./HallCanvas";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { SnappingControls } from "./SnappingControls";
import { Toolbar } from "./Toolbar";

function parseBoundary(
  outlineJson: string | null | undefined
): HallBoundary | null {
  const raw = (outlineJson ?? "").trim();
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as unknown;

    if (
      value &&
      typeof value === "object" &&
      "points" in value &&
      Array.isArray((value as { points?: unknown }).points)
    ) {
      const parsed = value as { points: unknown[]; closed?: boolean };
      return {
        points: parsed.points
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item)),
        closed: !!parsed.closed,
      };
    }

    if (Array.isArray(value)) {
      const points = value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));

      return {
        points,
        closed: points.length >= 6,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function LayoutEditorView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hall, setHall] = useState<HallDetailsResponse | null>(null);

  const [params] = useSearchParams();
  const hallId = params.get("hallId");

  const {
    activeTool,
    setActiveTool,
    boundary,
    boundaryRequired,
    setBoundaryRequired,
    hydrate,
    clearAll,
  } = useEditorState();

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!hallId) {
        setHall(null);
        clearAll();
        setBoundaryRequired(true);
        setActiveTool("boundary");
        return;
      }

      const nextHall = await getHallDetails(hallId);
      if (cancelled) return;

      setHall(nextHall);

      const parsed = parseBoundary(nextHall.outlineJson);
      const isEmpty = !parsed || (parsed.points?.length ?? 0) < 6;

      hydrate({
        elements: [],
        roads: [],
        boundary: parsed ?? { points: [], closed: false },
      });

      if (isEmpty) {
        setBoundaryRequired(true);
        setActiveTool("boundary");
      } else {
        setBoundaryRequired(false);
      }
    };

    void load().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [clearAll, hallId, hydrate, setActiveTool, setBoundaryRequired]);

  const handleSave = async () => {
    if (!hallId || !hall) return;

    if (!boundary.closed || boundary.points.length < 6) {
      setBoundaryRequired(true);
      setActiveTool("boundary");
      return;
    }

    await updateHall(hallId, {
      name: hall.name,
      code: hall.code,
      description: hall.description ?? null,
      outlineJson: JSON.stringify(boundary),
      areaSqMeters: hall.areaSqMeters,
    });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <Toolbar onSave={handleSave} onClear={clearAll} />

      <div className="flex flex-shrink-0 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Edytor layoutu
          </h1>
          <p className="text-xs text-slate-500">
            Wizualna edycja układu hali na siatce z przyciąganiem i
            właściwościami elementów.
          </p>
          {boundaryRequired && !boundary.closed ? (
            <p className="mt-1 text-xs text-amber-700">
              Obrys hali jest wymagany przed dodawaniem elementów i zapisem.
            </p>
          ) : null}
        </div>
        <SnappingControls />
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <LeftPanel activeTool={activeTool} onToolChange={setActiveTool} />

        <div
          ref={containerRef}
          className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          {size.width > 0 && size.height > 0 ? (
            <HallCanvas width={size.width} height={size.height} />
          ) : null}
        </div>

        <RightPanel />
      </div>
    </div>
  );
}
