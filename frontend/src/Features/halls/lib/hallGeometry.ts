type ParsedHallOutline = {
  points: number[];
  closed: boolean;
  metersPerPoint: number;
};

export type HallGeometrySummary = {
  areaSqMeters: number;
  widthMeters: number;
  heightMeters: number;
  hasOutline: boolean;
  points: number[];
};

function parseBoundary(value: unknown) {
  if (!value || typeof value !== "object") return null;
  if (!("points" in value) || !Array.isArray((value as { points?: unknown }).points)) {
    return null;
  }

  const points = (value as { points: unknown[] }).points
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

  return {
    points,
    closed: Boolean((value as { closed?: boolean }).closed),
  };
}

function extractOutline(outlineJson?: string | null): ParsedHallOutline {
  const raw = (outlineJson ?? "").trim();
  if (!raw) {
    return { points: [], closed: false, metersPerPoint: 1 / 40 };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    let points: number[] = [];
    let closed = false;
    let metersPerGridCell = 1;
    let gridSize = 40;

    if (Array.isArray(parsed)) {
      points = parsed
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));
      closed = points.length >= 6;
    } else {
      const directBoundary = parseBoundary(parsed);
      if (directBoundary) {
        points = directBoundary.points;
        closed = directBoundary.closed;
      } else if (parsed && typeof parsed === "object" && "boundary" in parsed) {
        const boundary = parseBoundary((parsed as { boundary?: unknown }).boundary);
        if (boundary) {
          points = boundary.points;
          closed = boundary.closed;
        }

        const scale = (parsed as {
          scale?: { metersPerGridCell?: unknown; gridSize?: unknown };
        }).scale;
        const nextMetersPerGridCell = Number(scale?.metersPerGridCell);
        const nextGridSize = Number(scale?.gridSize);

        if (Number.isFinite(nextMetersPerGridCell) && nextMetersPerGridCell > 0) {
          metersPerGridCell = nextMetersPerGridCell;
        }

        if (Number.isFinite(nextGridSize) && nextGridSize > 0) {
          gridSize = nextGridSize;
        }
      }
    }

    return {
      points,
      closed,
      metersPerPoint: metersPerGridCell / gridSize,
    };
  } catch {
    return { points: [], closed: false, metersPerPoint: 1 / 40 };
  }
}

function polygonBounds(points: number[]) {
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

function polygonArea(points: number[]) {
  if (points.length < 6) return 0;

  let area = 0;
  for (let index = 0; index < points.length; index += 2) {
    const nextIndex = (index + 2) % points.length;
    area += points[index] * points[nextIndex + 1] - points[nextIndex] * points[index + 1];
  }

  return Math.abs(area / 2);
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

export function getHallGeometrySummary(
  outlineJson?: string | null,
  fallbackAreaSqMeters = 0
): HallGeometrySummary {
  const outline = extractOutline(outlineJson);
  const bounds = polygonBounds(outline.points);
  const hasOutline = outline.closed && outline.points.length >= 6 && Boolean(bounds);

  if (!bounds || !hasOutline) {
    return {
      areaSqMeters: fallbackAreaSqMeters,
      widthMeters: 0,
      heightMeters: 0,
      hasOutline: false,
      points: outline.points,
    };
  }

  return {
    areaSqMeters: roundMetric(polygonArea(outline.points) * outline.metersPerPoint * outline.metersPerPoint),
    widthMeters: roundMetric(bounds.width * outline.metersPerPoint),
    heightMeters: roundMetric(bounds.height * outline.metersPerPoint),
    hasOutline: true,
    points: outline.points,
  };
}

export function formatAreaSqMeters(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value)) return "-";

  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits,
  }).format(value)} m²`;
}

export function formatMeters(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value <= 0) return "-";

  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits,
  }).format(value)} m`;
}

export function formatHallFootprint(summary: Pick<HallGeometrySummary, "widthMeters" | "heightMeters" | "hasOutline">) {
  if (!summary.hasOutline) return "Brak obrysu";
  return `${formatMeters(summary.widthMeters)} x ${formatMeters(summary.heightMeters)}`;
}
