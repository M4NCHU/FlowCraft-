import type {
  LayoutMachineItem,
  LayoutSectionOverlay,
} from "../model/editorTypes";
import type { HallBoundary, TransportPath } from "../model/layoutTypes";

export type LayoutValidationSeverity = "error" | "warning";
export type LayoutValidationEntityKind =
  | "hall"
  | "section"
  | "road"
  | "machine";

export interface LayoutValidationIssue {
  id: string;
  severity: LayoutValidationSeverity;
  entityKind: LayoutValidationEntityKind;
  entityId?: string;
  title: string;
  message: string;
}

interface ValidateLayoutParams {
  boundary: HallBoundary;
  sections: LayoutSectionOverlay[];
  roads: TransportPath[];
  machines: LayoutMachineItem[];
}

interface Point {
  x: number;
  y: number;
}

const EPSILON = 1e-6;

export function validateLayout({
  boundary,
  sections,
  roads,
  machines,
}: ValidateLayoutParams): LayoutValidationIssue[] {
  const issues: LayoutValidationIssue[] = [];
  const hallPolygon = toPolygon(boundary.points);
  const hasHallBoundary = boundary.closed && hallPolygon.length >= 3;

  if (!hasHallBoundary) {
    issues.push({
      id: "hall-boundary-missing",
      severity: "error",
      entityKind: "hall",
      title: "Brak poprawnego obrysu hali",
      message: "Domknij obrys hali, zanim zapiszesz layout.",
    });
  }

  sections.forEach((section) => {
    const polygon = toPolygon(section.boundary.points);

    if (!section.boundary.closed || polygon.length < 3) {
      issues.push({
        id: `section-invalid-${section.id}`,
        severity: "error",
        entityKind: "section",
        entityId: section.id,
        title: `Sekcja ${section.name} ma niepoprawny obrys`,
        message: "Sekcja musi miec co najmniej 3 punkty i zamkniety poligon.",
      });
      return;
    }

    if (
      hasHallBoundary &&
      polygon.some((point) => !pointInPolygon(point, hallPolygon))
    ) {
      issues.push({
        id: `section-outside-${section.id}`,
        severity: "error",
        entityKind: "section",
        entityId: section.id,
        title: `Sekcja ${section.name} wychodzi poza hale`,
        message: "Wszystkie wierzcholki sekcji powinny pozostawac w obrysie hali.",
      });
    }
  });

  for (let index = 0; index < sections.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < sections.length; nextIndex += 1) {
      const left = sections[index];
      const right = sections[nextIndex];

      if (
        polygonsOverlap(
          toPolygon(left.boundary.points),
          toPolygon(right.boundary.points)
        )
      ) {
        issues.push({
          id: `section-overlap-${left.id}-${right.id}`,
          severity: "warning",
          entityKind: "section",
          entityId: left.id,
          title: `Sekcje ${left.name} i ${right.name} nachodza na siebie`,
          message: "Rozdziel sekcje, aby przypisania maszyn byly jednoznaczne.",
        });
      }
    }
  }

  roads.forEach((road) => {
    if (road.points.length < 4) {
      issues.push({
        id: `road-invalid-${road.id}`,
        severity: "error",
        entityKind: "road",
        entityId: road.id,
        title: `Droga ${road.name} ma za malo punktow`,
        message: "Droga transportowa musi skladac sie z co najmniej dwoch punktow.",
      });
      return;
    }

    if (
      hasHallBoundary &&
      toPolygon(road.points).some((point) => !pointInPolygon(point, hallPolygon))
    ) {
      issues.push({
        id: `road-outside-${road.id}`,
        severity: "warning",
        entityKind: "road",
        entityId: road.id,
        title: `Droga ${road.name} wychodzi poza hale`,
        message: "Warto utrzymac punkty drogi wewnatrz obrysu hali.",
      });
    }
  });

  const sectionById = new Map(sections.map((section) => [section.id, section]));

  machines.forEach((machine) => {
    const polygon = getMachinePolygon(machine);
    const center = getPolygonCenter(polygon);

    if (!machine.sectionId) {
      issues.push({
        id: `machine-no-section-${machine.assetId}`,
        severity: "error",
        entityKind: "machine",
        entityId: machine.assetId,
        title: `Maszyna ${machine.name} nie ma sekcji`,
        message: "Kazda maszyna musi byc przypisana do istniejacej sekcji.",
      });
    }

    if (
      hasHallBoundary &&
      polygon.some((point) => !pointInPolygon(point, hallPolygon))
    ) {
      issues.push({
        id: `machine-outside-hall-${machine.assetId}`,
        severity: "error",
        entityKind: "machine",
        entityId: machine.assetId,
        title: `Maszyna ${machine.name} wychodzi poza hale`,
        message: "Przesun maszyne tak, aby caly jej obrys miescil sie w granicach hali.",
      });
    }

    if (machine.sectionId) {
      const section = sectionById.get(machine.sectionId);
      if (!section) {
        issues.push({
          id: `machine-missing-section-${machine.assetId}`,
          severity: "error",
          entityKind: "machine",
          entityId: machine.assetId,
          title: `Maszyna ${machine.name} wskazuje nieistniejaca sekcje`,
          message: "Wybierz jedna z dostepnych sekcji przed zapisem.",
        });
      } else {
        const sectionPolygon = toPolygon(section.boundary.points);
        const outsideSection = polygon.some(
          (point) => !pointInPolygon(point, sectionPolygon)
        );

        if (outsideSection || !pointInPolygon(center, sectionPolygon)) {
          issues.push({
            id: `machine-outside-section-${machine.assetId}`,
            severity: "error",
            entityKind: "machine",
            entityId: machine.assetId,
            title: `Maszyna ${machine.name} nie miesci sie w sekcji ${section.name}`,
            message: "Gabaryt maszyny powinien pozostawac w granicach przypisanej sekcji.",
          });
        }
      }
    }

    roads.forEach((road) => {
      if (machineIntersectsRoadCorridor(polygon, center, road)) {
        issues.push({
          id: `machine-road-conflict-${machine.assetId}-${road.id}`,
          severity: "warning",
          entityKind: "machine",
          entityId: machine.assetId,
          title: `Maszyna ${machine.name} wchodzi na droge ${road.name}`,
          message: "Sprawdz, czy droga komunikacyjna pozostaje drozna.",
        });
      }
    });
  });

  for (let index = 0; index < machines.length; index += 1) {
    for (
      let nextIndex = index + 1;
      nextIndex < machines.length;
      nextIndex += 1
    ) {
      const left = machines[index];
      const right = machines[nextIndex];

      if (
        polygonsOverlap(getMachinePolygon(left), getMachinePolygon(right))
      ) {
        issues.push({
          id: `machine-overlap-${left.assetId}-${right.assetId}`,
          severity: "error",
          entityKind: "machine",
          entityId: left.assetId,
          title: `Maszyny ${left.name} i ${right.name} nachodza na siebie`,
          message: "Rozsun maszyny, aby ich obrysy sie nie przecinaly.",
        });
      }
    }
  }

  return issues;
}

function toPolygon(points: number[]): Point[] {
  const polygon: Point[] = [];

  for (let index = 0; index + 1 < points.length; index += 2) {
    polygon.push({ x: points[index], y: points[index + 1] });
  }

  return polygon;
}

function getMachinePolygon(machine: LayoutMachineItem): Point[] {
  const angle = (machine.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    { x: 0, y: 0 },
    { x: machine.width, y: 0 },
    { x: machine.width, y: machine.height },
    { x: 0, y: machine.height },
  ].map((point) => ({
    x: machine.x + point.x * cos - point.y * sin,
    y: machine.y + point.x * sin + point.y * cos,
  }));
}

function getPolygonCenter(polygon: Point[]): Point {
  if (polygon.length === 0) {
    return { x: 0, y: 0 };
  }

  const sum = polygon.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / polygon.length,
    y: sum.y / polygon.length,
  };
}

function pointInPolygon(point: Point, polygon: Point[]) {
  if (polygon.length < 3) return false;

  let inside = false;

  for (
    let left = 0, right = polygon.length - 1;
    left < polygon.length;
    right = left, left += 1
  ) {
    const a = polygon[left];
    const b = polygon[right];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || EPSILON) + a.x;

    if (intersects) inside = !inside;
  }

  return inside;
}

function polygonsOverlap(left: Point[], right: Point[]) {
  if (left.length < 3 || right.length < 3) return false;

  for (const edge of getPolygonEdges(left)) {
    for (const otherEdge of getPolygonEdges(right)) {
      if (segmentsIntersect(edge[0], edge[1], otherEdge[0], otherEdge[1])) {
        return true;
      }
    }
  }

  return pointInPolygon(left[0], right) || pointInPolygon(right[0], left);
}

function getPolygonEdges(polygon: Point[]) {
  return polygon.map((point, index) => [
    point,
    polygon[(index + 1) % polygon.length],
  ]) as Array<[Point, Point]>;
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point) {
  const d1 = direction(b1, b2, a1);
  const d2 = direction(b1, b2, a2);
  const d3 = direction(a1, a2, b1);
  const d4 = direction(a1, a2, b2);

  if (
    ((d1 > EPSILON && d2 < -EPSILON) || (d1 < -EPSILON && d2 > EPSILON)) &&
    ((d3 > EPSILON && d4 < -EPSILON) || (d3 < -EPSILON && d4 > EPSILON))
  ) {
    return true;
  }

  return (
    (Math.abs(d1) <= EPSILON && onSegment(b1, b2, a1)) ||
    (Math.abs(d2) <= EPSILON && onSegment(b1, b2, a2)) ||
    (Math.abs(d3) <= EPSILON && onSegment(a1, a2, b1)) ||
    (Math.abs(d4) <= EPSILON && onSegment(a1, a2, b2))
  );
}

function direction(a: Point, b: Point, c: Point) {
  return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
}

function onSegment(a: Point, b: Point, c: Point) {
  return (
    c.x >= Math.min(a.x, b.x) - EPSILON &&
    c.x <= Math.max(a.x, b.x) + EPSILON &&
    c.y >= Math.min(a.y, b.y) - EPSILON &&
    c.y <= Math.max(a.y, b.y) + EPSILON
  );
}

function machineIntersectsRoadCorridor(
  machinePolygon: Point[],
  machineCenter: Point,
  road: TransportPath
) {
  const roadHalfWidth = Math.max(road.width / 2, 6);
  const roadPoints = toPolygon(road.points);

  if (roadPoints.length < 2) return false;

  if (
    pointToPolylineDistance(machineCenter, roadPoints) <= roadHalfWidth ||
    machinePolygon.some(
      (point) => pointToPolylineDistance(point, roadPoints) <= roadHalfWidth
    )
  ) {
    return true;
  }

  if (roadPoints.some((point) => pointInPolygon(point, machinePolygon))) {
    return true;
  }

  for (let index = 1; index < roadPoints.length; index += 1) {
    const roadStart = roadPoints[index - 1];
    const roadEnd = roadPoints[index];

    for (const [polyStart, polyEnd] of getPolygonEdges(machinePolygon)) {
      if (segmentsIntersect(roadStart, roadEnd, polyStart, polyEnd)) {
        return true;
      }
    }
  }

  return false;
}

function pointToPolylineDistance(point: Point, polyline: Point[]) {
  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < polyline.length; index += 1) {
    minDistance = Math.min(
      minDistance,
      pointToSegmentDistance(point, polyline[index - 1], polyline[index])
    );
  }

  return minDistance;
}

function pointToSegmentDistance(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
      (dx * dx + dy * dy),
    0,
    1
  );

  const projectedX = start.x + projection * dx;
  const projectedY = start.y + projection * dy;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
