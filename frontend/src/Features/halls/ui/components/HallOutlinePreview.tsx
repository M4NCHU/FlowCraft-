import { useId, useMemo } from "react";
import { getHallGeometrySummary } from "../../lib/hallGeometry";

interface HallOutlinePreviewProps {
  outlineJson?: string | null;
  areaSqMeters?: number;
  className?: string;
}

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

function polygonBounds(points: number[]): Bounds | null {
  if (points.length < 2) return null;

  let minX = points[0];
  let maxX = points[0];
  let minY = points[1];
  let maxY = points[1];

  for (let index = 0; index + 1 < points.length; index += 2) {
    minX = Math.min(minX, points[index]);
    maxX = Math.max(maxX, points[index]);
    minY = Math.min(minY, points[index + 1]);
    maxY = Math.max(maxY, points[index + 1]);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function HallOutlinePreview({
  outlineJson,
  areaSqMeters = 0,
  className,
}: HallOutlinePreviewProps) {
  const patternId = useId().replace(/:/g, "");
  const geometry = useMemo(
    () => getHallGeometrySummary(outlineJson, areaSqMeters),
    [areaSqMeters, outlineJson]
  );

  const polygon = useMemo(() => {
    const bounds = polygonBounds(geometry.points);
    if (!geometry.hasOutline || !bounds) return null;

    const viewWidth = 160;
    const viewHeight = 96;
    const padding = 10;
    const usableWidth = viewWidth - padding * 2;
    const usableHeight = viewHeight - padding * 2;
    const scale = Math.min(
      usableWidth / Math.max(bounds.width, 1),
      usableHeight / Math.max(bounds.height, 1)
    );
    const offsetX = (viewWidth - bounds.width * scale) / 2;
    const offsetY = (viewHeight - bounds.height * scale) / 2;

    return geometry.points.reduce<string[]>((acc, value, index) => {
      if (index % 2 !== 0) return acc;

      const nextX = offsetX + (value - bounds.minX) * scale;
      const nextY = offsetY + (geometry.points[index + 1] - bounds.minY) * scale;
      acc.push(`${nextX},${nextY}`);
      return acc;
    }, []);
  }, [geometry.hasOutline, geometry.points]);

  return (
    <div
      className={
        className ??
        "overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]"
      }
    >
      <svg viewBox="0 0 160 96" className="h-full w-full">
        <defs>
          <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="160" height="96" fill={`url(#${patternId})`} />
        <rect x="6" y="6" width="148" height="84" rx="14" fill="rgba(15,23,42,0.5)" stroke="rgba(148,163,184,0.16)" />

        {polygon ? (
          <>
            <polygon
              points={polygon.join(" ")}
              fill="rgba(34,211,238,0.2)"
              stroke="rgba(103,232,249,0.92)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <polygon
              points={polygon.join(" ")}
              fill="none"
              stroke="rgba(244,114,182,0.22)"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <text
            x="80"
            y="50"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(148,163,184,0.9)"
          >
            Brak narysowanego obrysu
          </text>
        )}
      </svg>
    </div>
  );
}
