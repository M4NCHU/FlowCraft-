import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiPost, toApiError } from "../../../shared/api/httpClient";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { getHallDetails, updateHall } from "../../halls/api/hallsApi";
import type {
  HallDetailsResponse,
  HallSectionResponse,
} from "../../halls/api/contracts";
import { assetsApi } from "../../machines/api/assetsApi";
import {
  AssetType,
  type AssetDetailsDto,
  type AssetPlacementDto,
  type PlaceAssetRequest,
} from "../../machines/api/contracts";
import type {
  LayoutEditorMode,
  LayoutMachineItem,
  LayoutSectionOverlay,
} from "../model/editorTypes";
import type { HallBoundary, HallOutlineDtoV2 } from "../model/layoutTypes";
import { useEditorState } from "../model/useEditorState";
import { HallCanvas } from "./HallCanvas";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { SnappingControls } from "./SnappingControls";
import { Toolbar } from "./Toolbar";
import type { MachinePaletteItem } from "./components/MachinePalette";

type ParsedOutline = {
  boundary: HallBoundary;
  scale?: HallOutlineDtoV2["scale"];
};

function parseBoundary(value: unknown): HallBoundary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    "points" in value &&
    Array.isArray((value as { points?: unknown }).points)
  ) {
    const points = (value as { points: unknown[] }).points
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));

    return {
      points,
      closed: Boolean((value as { closed?: boolean }).closed),
    };
  }

  return null;
}

function parseOutlineJson(outlineJson: string | null | undefined): ParsedOutline {
  const raw = (outlineJson ?? "").trim();
  if (!raw) {
    return { boundary: { points: [], closed: false } };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      const points = parsed
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));
      return {
        boundary: {
          points,
          closed: points.length >= 6,
        },
      };
    }

    const directBoundary = parseBoundary(parsed);
    if (directBoundary) {
      return { boundary: directBoundary };
    }

    if (parsed && typeof parsed === "object" && "boundary" in parsed) {
      const boundary = parseBoundary((parsed as { boundary?: unknown }).boundary);
      const scaleCandidate =
        (parsed as { scale?: { metersPerGridCell?: unknown } }).scale
          ?.metersPerGridCell;

      return {
        boundary: boundary ?? { points: [], closed: false },
        scale:
          typeof scaleCandidate === "number" && Number.isFinite(scaleCandidate)
            ? { metersPerGridCell: Math.max(0.01, scaleCandidate) }
            : undefined,
      };
    }
  } catch {
    return { boundary: { points: [], closed: false } };
  }

  return { boundary: { points: [], closed: false } };
}

function buildOutlineJson(boundary: HallBoundary, metersPerGridCell: number) {
  return JSON.stringify({
    boundary,
    scale: { metersPerGridCell },
  });
}

function extractCurrentPlacement(asset: AssetDetailsDto) {
  return (
    [...asset.placements]
      .filter((placement) => placement.isCurrent)
      .sort(
        (left, right) =>
          Date.parse(right.placedAtUtc) - Date.parse(left.placedAtUtc)
      )[0] ?? null
  );
}

function pointInPolygon(point: { x: number; y: number }, polygon: number[]) {
  let inside = false;

  for (
    let left = 0, right = polygon.length - 2;
    left < polygon.length;
    right = left, left += 2
  ) {
    const xi = polygon[left];
    const yi = polygon[left + 1];
    const xj = polygon[right];
    const yj = polygon[right + 1];

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function inferSectionId(
  machine: Pick<LayoutMachineItem, "x" | "y" | "width" | "height">,
  sections: LayoutSectionOverlay[]
) {
  const center = {
    x: machine.x + machine.width / 2,
    y: machine.y + machine.height / 2,
  };

  return (
    sections.find((section) => pointInPolygon(center, section.boundary.points))?.id ??
    null
  );
}

function mapSection(section: HallSectionResponse): LayoutSectionOverlay | null {
  const parsed = parseOutlineJson(section.outlineJson);
  if (parsed.boundary.points.length < 6) return null;

  return {
    id: section.id,
    name: section.name,
    code: section.code,
    description: section.description,
    areaSqMeters: section.areaSqMeters,
    boundary: parsed.boundary,
  };
}

function toMachineItem(
  asset: AssetDetailsDto,
  hallId: string,
  sections: LayoutSectionOverlay[],
  gridSize: number
): LayoutMachineItem | null {
  const currentPlacement = extractCurrentPlacement(asset);
  if (!currentPlacement || currentPlacement.hallId !== hallId) {
    return null;
  }

  const width = Number(currentPlacement.width) || gridSize * 2;
  const height = Number(currentPlacement.height) || gridSize * 2;

  return {
    assetId: asset.id,
    name: asset.name,
    code: asset.code,
    status: asset.status,
    category: asset.category,
    hallId: currentPlacement.hallId,
    sectionId:
      currentPlacement.sectionId ??
      inferSectionId(
        {
          x: Number(currentPlacement.x),
          y: Number(currentPlacement.y),
          width,
          height,
        },
        sections
      ),
    x: Number(currentPlacement.x),
    y: Number(currentPlacement.y),
    width,
    height,
    rotationDeg: Number(currentPlacement.rotationDeg) || 0,
    placementId: currentPlacement.id,
    placementNotes: currentPlacement.notes ?? null,
    isDirty: false,
    openIncidentsCount: asset.failureReportsCount,
    openWorkOrdersCount: asset.workOrdersCount,
  };
}

function computePolygonAreaSqMeters(
  boundary: HallBoundary,
  metersPerPx: number
) {
  if (!boundary.closed || boundary.points.length < 6) return 0;

  let area = 0;
  for (let index = 0; index < boundary.points.length; index += 2) {
    const nextIndex = (index + 2) % boundary.points.length;
    area +=
      boundary.points[index] * boundary.points[nextIndex + 1] -
      boundary.points[nextIndex] * boundary.points[index + 1];
  }

  return Math.abs(area / 2) * metersPerPx * metersPerPx;
}

export function LayoutEditorScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hall, setHall] = useState<HallDetailsResponse | null>(null);
  const [machineCatalog, setMachineCatalog] = useState<AssetDetailsDto[]>([]);
  const [placedMachines, setPlacedMachines] = useState<LayoutMachineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [pendingMachineId, setPendingMachineId] = useState<string | null>(null);
  const [mode, setMode] = useState<LayoutEditorMode>("select");
  const [searchParams, setSearchParams] = useSearchParams();
  const hallId = searchParams.get("hallId");
  const focusedMachineId = searchParams.get("machineId");

  const {
    boundary,
    boundaryRequired,
    snapping,
    layoutScale,
    clearAll,
    clearBoundary,
    hydrate,
    setBoundaryRequired,
  } = useEditorState();

  const [savedOutlineSignature, setSavedOutlineSignature] = useState("");

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const sections = useMemo(
    () => (hall?.sections ?? []).map(mapSection).filter(Boolean) as LayoutSectionOverlay[],
    [hall?.sections]
  );

  const outlineSignature = useMemo(
    () => JSON.stringify(boundary) + `|${layoutScale.metersPerGridCell}`,
    [boundary, layoutScale.metersPerGridCell]
  );

  const machineCatalogItems = useMemo<MachinePaletteItem[]>(() => {
    const placedIds = new Set(placedMachines.map((machine) => machine.assetId));
    return machineCatalog
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, "pl"))
      .map((machine) => ({
        id: machine.id,
        name: machine.name,
        code: machine.code,
        category: machine.category,
        status: machine.status,
        isPlacedOnCurrentHall: placedIds.has(machine.id),
      }));
  }, [machineCatalog, placedMachines]);

  const selectedMachine = useMemo(
    () => placedMachines.find((machine) => machine.assetId === selectedAssetId) ?? null,
    [placedMachines, selectedAssetId]
  );
  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId]
  );
  const pendingMachineLabel = useMemo(() => {
    const machine = machineCatalog.find((item) => item.id === pendingMachineId);
    if (!machine) return undefined;
    return `${machine.name} (${machine.code})`;
  }, [machineCatalog, pendingMachineId]);

  const dirtyCount =
    placedMachines.filter((machine) => machine.isDirty).length +
    (outlineSignature !== savedOutlineSignature ? 1 : 0);

  const loadData = async (targetHallId: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setSaveHint(null);

    try {
      const hallDetails = await getHallDetails(targetHallId, signal);
      const machineSummaries = await assetsApi.list({ signal });
      const machineCandidates = (machineSummaries ?? []).filter(
        (machine) => machine.type === AssetType.Machine && machine.isActive
      );
      const machineDetailsResults = await Promise.allSettled(
        machineCandidates.map((machine) => assetsApi.getById(machine.id, signal))
      );
      const resolvedMachines = machineDetailsResults
        .filter((result): result is PromiseFulfilledResult<AssetDetailsDto> => result.status === "fulfilled")
        .map((result) => result.value);

      if (signal?.aborted) return;

      const parsedOutline = parseOutlineJson(hallDetails.outlineJson);
      const scale = parsedOutline.scale ?? layoutScale;

      hydrate({
        elements: [],
        roads: [],
        boundary: parsedOutline.boundary,
        layoutScale: scale,
      });

      setHall(hallDetails);
      setMachineCatalog(resolvedMachines);
      setPlacedMachines(
        resolvedMachines
          .map((machine) =>
            toMachineItem(machine, hallDetails.id, hallDetails.sections.map(mapSection).filter(Boolean) as LayoutSectionOverlay[], snapping.gridSize || 40)
          )
          .filter(Boolean) as LayoutMachineItem[]
      );
      setSavedOutlineSignature(
        JSON.stringify(parsedOutline.boundary) + `|${scale.metersPerGridCell}`
      );
      setSelectedAssetId(null);
      setSelectedSectionId(null);
      setPendingMachineId(null);
      setMode("select");
    } catch (err) {
      if (!signal?.aborted) {
        setError(toApiError(err, "Nie udało się pobrać danych layoutu."));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (hallId) return;
    if (!focusedMachineId) {
      setLoading(false);
      setHall(null);
      setMachineCatalog([]);
      setPlacedMachines([]);
      clearAll();
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const machine = await assetsApi.getById(focusedMachineId);
        if (cancelled) return;

        const currentPlacement = extractCurrentPlacement(machine);
        if (currentPlacement?.hallId) {
          const next = new URLSearchParams(searchParams);
          next.set("hallId", currentPlacement.hallId);
          next.set("machineId", machine.id);
          setSearchParams(next, { replace: true });
          return;
        }

        setMachineCatalog([machine]);
        setSaveHint(
          "Wybrana maszyna nie ma jeszcze rozmieszczenia. Wybierz halę i umieść ją na planie."
        );
      } catch (err) {
        if (!cancelled) {
          setError(toApiError(err, "Nie udało się otworzyć wskazanej maszyny w layoutcie."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearAll, focusedMachineId, hallId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hallId) return;

    const controller = new AbortController();
    void loadData(hallId, controller.signal);

    return () => controller.abort();
  }, [hallId]);

  useEffect(() => {
    if (!focusedMachineId) return;

    const placedMachine = placedMachines.find(
      (machine) => machine.assetId === focusedMachineId
    );

    if (placedMachine) {
      setSelectedAssetId(placedMachine.assetId);
      setSelectedSectionId(placedMachine.sectionId ?? null);
      setPendingMachineId(null);
      setMode("select");
      return;
    }

    if (machineCatalog.some((machine) => machine.id === focusedMachineId)) {
      setPendingMachineId(focusedMachineId);
      setSelectedAssetId(null);
      setMode("place-machine");
    }
  }, [focusedMachineId, machineCatalog, placedMachines]);

  useEffect(() => {
    if (mode === "boundary" && boundary.closed) {
      setMode("select");
    }
  }, [boundary.closed, mode]);

  const handleSelectMachine = (assetId: string | null) => {
    setSelectedAssetId(assetId);
    const machine = placedMachines.find((item) => item.assetId === assetId);
    setSelectedSectionId(machine?.sectionId ?? null);
    if (assetId) {
      setPendingMachineId(null);
      setMode("select");
    }
  };

  const handleSelectMachineFromPalette = (assetId: string) => {
    const machine = placedMachines.find((item) => item.assetId === assetId);
    if (machine) {
      setSelectedAssetId(assetId);
      setSelectedSectionId(machine.sectionId ?? null);
      setPendingMachineId(null);
      setMode("select");
      return;
    }

    setPendingMachineId(assetId);
    setSelectedAssetId(null);
    setMode("place-machine");
  };

  const handlePickMachine = (assetId: string) => {
    setPendingMachineId(assetId);
    setSelectedAssetId(null);
    setMode("place-machine");
  };

  const updateMachine = (
    assetId: string,
    patch: Partial<LayoutMachineItem>
  ) => {
    setPlacedMachines((current) =>
      current.map((machine) => {
        if (machine.assetId !== assetId) return machine;

        const nextMachine = {
          ...machine,
          ...patch,
        };

        if (patch.sectionId === undefined) {
          nextMachine.sectionId = inferSectionId(nextMachine, sections);
        }

        return {
          ...nextMachine,
          isDirty: true,
        };
      })
    );
  };

  const handlePlaceMachine = (assetId: string, x: number, y: number) => {
    if (!hallId) return;

    const gridSize = snapping.gridSize || 40;
    const snap = (value: number) =>
      snapping.snapToGrid ? Math.round(value / gridSize) * gridSize : value;

    const asset = machineCatalog.find((machine) => machine.id === assetId);
    if (!asset) return;

    const existing = placedMachines.find((machine) => machine.assetId === assetId);
    const currentPlacement = extractCurrentPlacement(asset);
    const width =
      existing?.width ?? (Number(currentPlacement?.width) || gridSize * 2);
    const height =
      existing?.height ?? (Number(currentPlacement?.height) || gridSize * 2);
    const nextMachine: LayoutMachineItem = {
      assetId: asset.id,
      name: asset.name,
      code: asset.code,
      status: asset.status,
      category: asset.category,
      hallId,
      sectionId:
        selectedSectionId ??
        inferSectionId(
          { x: snap(x), y: snap(y), width, height },
          sections
        ),
      x: snap(x),
      y: snap(y),
      width,
      height,
      rotationDeg: existing?.rotationDeg ?? (Number(currentPlacement?.rotationDeg) || 0),
      placementId: existing?.placementId ?? currentPlacement?.id ?? null,
      placementNotes: existing?.placementNotes ?? currentPlacement?.notes ?? null,
      isDirty: true,
      openIncidentsCount: asset.failureReportsCount,
      openWorkOrdersCount: asset.workOrdersCount,
    };

    setPlacedMachines((current) => {
      const filtered = current.filter((machine) => machine.assetId !== assetId);
      return [...filtered, nextMachine].sort((left, right) => left.name.localeCompare(right.name, "pl"));
    });
    setSelectedAssetId(assetId);
    setSelectedSectionId(nextMachine.sectionId ?? null);
    setPendingMachineId(null);
    setMode("select");
  };

  const handleMoveMachine = (assetId: string, x: number, y: number) => {
    updateMachine(assetId, { x, y });
  };

  const handleReload = () => {
    if (!hallId) return;
    void loadData(hallId);
  };

  const handleSave = async () => {
    if (!hallId || !hall) return;

    if (!boundary.closed || boundary.points.length < 6) {
      setBoundaryRequired(true);
      setMode("boundary");
      setError(new ApiError(400, "Najpierw domknij obrys hali.", null));
      return;
    }

    setSaving(true);
    setError(null);
    setSaveHint(null);

    try {
      const areaSqMeters = computePolygonAreaSqMeters(
        boundary,
        layoutScale.metersPerGridCell / (snapping.gridSize || 40)
      );

      await updateHall(hallId, {
        name: hall.name,
        code: hall.code,
        description: hall.description ?? null,
        outlineJson: buildOutlineJson(boundary, layoutScale.metersPerGridCell),
        areaSqMeters: areaSqMeters || hall.areaSqMeters,
      });

      const dirtyPlacements = placedMachines.filter((machine) => machine.isDirty);
      await Promise.all(
        dirtyPlacements.map((machine) =>
          apiPost<AssetPlacementDto, PlaceAssetRequest>(
            `/api/assets/${machine.assetId}/placement`,
            {
              hallId,
              sectionId: machine.sectionId ?? null,
              x: machine.x,
              y: machine.y,
              width: machine.width,
              height: machine.height,
              rotationDeg: machine.rotationDeg,
              notes: machine.placementNotes ?? null,
            },
            {
              withAuth: true,
              notifyOnSuccess: false,
              notifyOnError: true,
            }
          )
        )
      );

      setSaveHint(
        dirtyPlacements.length > 0
          ? `Zapisano halę i ${dirtyPlacements.length} rozmieszczeń maszyn.`
          : "Zapisano aktualny obrys hali."
      );
      await loadData(hallId);
    } catch (err) {
      setError(toApiError(err, "Nie udało się zapisać zmian layoutu."));
    } finally {
      setSaving(false);
    }
  };

  const handleStartBoundaryRedraw = () => {
    clearBoundary();
    setBoundaryRequired(true);
    setSelectedAssetId(null);
    setSelectedSectionId(null);
    setPendingMachineId(null);
    setMode("boundary");
  };

  if (!hallId && !loading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Edytor layoutu"
          extra={
            <Link
              to="/halls"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Przejdź do hal
            </Link>
          }
        />

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">
            Wybierz halę do edycji layoutu
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Edytor pracuje na realnym obrysie hali, sekcjach oraz rozmieszczeniach maszyn zapisanych w backendzie.
          </p>
          {saveHint ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {saveHint}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <Toolbar
        hallName={hall?.name}
        hallCode={hall?.code}
        dirtyCount={dirtyCount}
        saving={saving}
        loading={loading}
        onReload={handleReload}
        onSave={() => void handleSave()}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageHeader
            title="Edytor layoutu hali"
            extra={
              <div className="flex flex-wrap items-center gap-2">
                {hallId ? (
                  <Link
                    to={`/halls`}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Lista hal
                  </Link>
                ) : null}
                {selectedMachine ? (
                  <Link
                    to={`/machines/${selectedMachine.assetId}`}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Szczegóły maszyny
                  </Link>
                ) : null}
              </div>
            }
          />
          <p className="text-sm text-slate-500">
            Layout korzysta z rzeczywistych danych hali, sekcji oraz aktualnych rozmieszczeń maszyn.
          </p>
          {hall ? (
            <p className="mt-1 text-xs text-slate-500">
              {hall.name} ({hall.code}) • {sections.length} sekcji • {placedMachines.length} maszyn na planie
            </p>
          ) : null}
        </div>
        <SnappingControls />
      </div>

      {saveHint ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {saveHint}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error.message}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <LeftPanel
          hall={hall}
          sections={sections}
          machineCatalog={machineCatalogItems}
          placedMachinesCount={placedMachines.length}
          getSectionMachinesCount={(sectionId) =>
            placedMachines.filter((machine) => machine.sectionId === sectionId).length
          }
          mode={mode}
          pendingMachineId={pendingMachineId}
          selectedAssetId={selectedAssetId}
          onSelectMachine={handleSelectMachineFromPalette}
          onPickMachine={handlePickMachine}
          onStartBoundaryRedraw={handleStartBoundaryRedraw}
          onCancelMachinePlacement={() => {
            setPendingMachineId(null);
            setMode("select");
          }}
        />

        <div
          ref={containerRef}
          className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {size.width > 0 && size.height > 0 ? (
            <HallCanvas
              width={size.width}
              height={size.height}
              mode={mode}
              sections={sections}
              machines={placedMachines}
              selectedAssetId={selectedAssetId}
              selectedSectionId={selectedSectionId}
              pendingMachineId={pendingMachineId}
              pendingMachineLabel={pendingMachineLabel}
              onSelectAsset={handleSelectMachine}
              onSelectSection={setSelectedSectionId}
              onPlaceMachine={handlePlaceMachine}
              onMoveMachine={handleMoveMachine}
            />
          ) : null}
        </div>

        <RightPanel
          hall={hall}
          sections={sections}
          selectedMachine={selectedMachine}
          selectedSection={selectedSection}
          onUpdateMachine={updateMachine}
        />
      </div>
    </div>
  );
}
