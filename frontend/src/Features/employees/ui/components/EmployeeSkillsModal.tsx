import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import type {
  AssetCategoryDto,
  AssetListItemDto,
} from "../../../machines/api/contracts";
import { AssetType } from "../../../machines/api/contracts";
import { employeesApi } from "../../api/employeesApi";
import {
  EmployeeSkillLevel,
  type EmployeeDto,
  type ReplaceEmployeeSkillsRequest,
  type UpsertEmployeeSkillRequest,
} from "../../api/contracts";

type Props = {
  open: boolean;
  employee: EmployeeDto | null;
  categories: AssetCategoryDto[];
  assets: AssetListItemDto[];
  onClose: () => void;
  onSaved: (
    employeeId: string,
    skills: ReplaceEmployeeSkillsRequest["skills"],
  ) => void;
};

const inputClassName =
  "rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";

const subtleCardClassName =
  "rounded-2xl border border-slate-800 bg-slate-950/60";

const skillLevelOptions = [
  { value: EmployeeSkillLevel.Beginner, label: "Poczatkujacy" },
  { value: EmployeeSkillLevel.Independent, label: "Samodzielny" },
  { value: EmployeeSkillLevel.Advanced, label: "Zaawansowany" },
  { value: EmployeeSkillLevel.Trainer, label: "Trener" },
];

type DraftSkill = UpsertEmployeeSkillRequest & {
  id: string;
};

function createDraft(categoryId: string, assetId?: string | null): DraftSkill {
  return {
    id: crypto.randomUUID(),
    assetCategoryId: categoryId,
    assetId: assetId ?? null,
    skillLevel: EmployeeSkillLevel.Independent,
    canOperate: true,
    canMaintain: false,
    canApproveMaintenance: false,
    notes: "",
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function categoryMatches(category: AssetCategoryDto, search: string) {
  if (!search) return true;

  const haystack = [category.name, category.code, category.description ?? ""]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function permissionScopeSummary(skill: UpsertEmployeeSkillRequest) {
  const scopes = [
    skill.canOperate ? "obsluga" : null,
    skill.canMaintain ? "utrzymanie ruchu" : null,
    skill.canApproveMaintenance ? "akceptacja przegladow" : null,
  ].filter(Boolean);

  return scopes.length > 0
    ? scopes.join(" / ")
    : "brak zakresu operacyjnego";
}

export function EmployeeSkillsModal({
  open,
  employee,
  categories,
  assets,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<DraftSkill[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !employee) return;

    setRows(
      employee.skills.map((skill) => ({
        id: skill.id,
        assetCategoryId: skill.assetCategoryId,
        assetId: skill.assetId ?? null,
        skillLevel: skill.skillLevel,
        canOperate: skill.canOperate,
        canMaintain: skill.canMaintain,
        canApproveMaintenance: skill.canApproveMaintenance,
        notes: skill.notes ?? "",
      })),
    );
    setSaving(false);
    setError("");
    setSearch("");
  }, [employee, open]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category] as const)),
    [categories],
  );

  const usedCategoryIds = useMemo(
    () =>
      new Set(
        rows
          .filter((row) => !row.assetId)
          .map((row) => row.assetCategoryId)
          .filter(Boolean),
      ),
    [rows],
  );

  const usedAssetIds = useMemo(
    () => new Set(rows.map((row) => row.assetId).filter(Boolean)),
    [rows],
  );

  const normalizedSearch = search.trim().toLowerCase();

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          !usedCategoryIds.has(category.id) &&
          categoryMatches(category, normalizedSearch),
      ),
    [categories, normalizedSearch, usedCategoryIds],
  );

  const availableAssets = useMemo(
    () =>
      assets.filter((asset) => {
        if (!asset.categoryId) return false;
        if (asset.type !== AssetType.Machine) return false;
        if (!asset.isActive) return false;
        if (usedAssetIds.has(asset.id)) return false;

        const haystack = [asset.name, asset.code, asset.category ?? ""]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      }),
    [assets, normalizedSearch, usedAssetIds],
  );

  if (!open || !employee) return null;

  const updateRow = (id: string, patch: Partial<DraftSkill>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, ...patch };

        if (!next.canMaintain && next.canApproveMaintenance) {
          next.canApproveMaintenance = false;
        }

        return next;
      }),
    );
  };

  const addCategory = (categoryId: string) => {
    if (!categoryId || usedCategoryIds.has(categoryId)) {
      return;
    }

    setRows((prev) => [...prev, createDraft(categoryId)]);
  };

  const addAsset = (asset: AssetListItemDto) => {
    if (!asset.categoryId || usedAssetIds.has(asset.id)) {
      return;
    }

    setRows((prev) => [...prev, createDraft(asset.categoryId!, asset.id)]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const invalidRow = rows.find(
      (row) =>
        !row.canOperate &&
        !row.canMaintain &&
        !row.canApproveMaintenance,
    );

    if (invalidRow) {
      const categoryName =
        categoryById.get(invalidRow.assetCategoryId)?.name ?? "wybrane uprawnienie";
      setError(
        `Wybierz przynajmniej jeden zakres dla pozycji: ${categoryName}.`,
      );
      return;
    }

    const sanitizedSkills = rows.map<UpsertEmployeeSkillRequest>((row) => ({
      assetCategoryId: row.assetCategoryId,
      skillLevel: row.skillLevel,
      canOperate: row.canOperate,
      canMaintain: row.canMaintain,
      canApproveMaintenance: row.canApproveMaintenance,
      notes: normalizeOptionalText(row.notes ?? ""),
    }));

    setSaving(true);
    setError("");

    try {
      await employeesApi.replaceSkills(employee.id, { skills: sanitizedSkills });
      onSaved(employee.id, sanitizedSkills);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udalo sie zapisac uprawnien.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                Uprawnienia maszynowe
              </div>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-white">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Dodawaj uprawnienia tylko z listy kategorii maszyn i ustawiaj
                od razu ich zakres: obsluga, UR albo akceptacja.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <div className="font-medium text-white">
                {rows.length} przypisanych pozycji
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Kazda kategoria moze wystapic tylko raz.
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {error ? (
            <div className="mx-6 mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="flex min-h-0 flex-col border-b border-slate-800 lg:border-b-0 lg:border-r">
              <div className="border-b border-slate-800 px-6 py-4">
                <div className="text-sm font-semibold text-white">
                  Dostepne uprawnienia
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Wyszukaj kategorie lub konkretne maszyny i dodaj je jednym
                  kliknieciem.
                </p>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Szukaj po nazwie, kodzie lub opisie..."
                  className={`mt-3 w-full ${inputClassName}`}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                <div className="space-y-4">
                  <div className={subtleCardClassName}>
                    <div className="border-b border-slate-800 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Kategorie
                      </div>
                    </div>
                    <div className="space-y-2 p-3">
                      {availableCategories.length > 0 ? (
                        availableCategories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => addCategory(category.id)}
                            className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition hover:border-cyan-400/25 hover:bg-slate-900"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="line-clamp-1 text-sm font-semibold text-white">
                                  {category.name}
                                </div>
                                <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                                  {category.code}
                                </span>
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                                {category.description?.trim() ||
                                  "Kategoria bez dodatkowego opisu."}
                              </div>
                            </div>

                            <span className="shrink-0 rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                              Dodaj
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-500">
                          Brak kategorii pasujacych do wyszukiwania.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={subtleCardClassName}>
                    <div className="border-b border-slate-800 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Konkretne maszyny
                      </div>
                    </div>
                    <div className="space-y-2 p-3">
                      {availableAssets.length > 0 ? (
                        availableAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => addAsset(asset)}
                            className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition hover:border-emerald-400/25 hover:bg-slate-900"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="line-clamp-1 text-sm font-semibold text-white">
                                  {asset.name}
                                </div>
                                <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                                  {asset.code}
                                </span>
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                                {asset.category ?? "Maszyna bez kategorii"}
                              </div>
                            </div>

                            <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                              Maszyna
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-500">
                          Brak maszyn pasujacych do wyszukiwania albo wszystkie
                          sa juz przypisane.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-col">
              <div className="border-b border-slate-800 px-6 py-4">
                <div className="text-sm font-semibold text-white">
                  Przypisane uprawnienia
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Kazda pozycja opisuje, do czego pracownik jest dopuszczony w
                  danej kategorii.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                {rows.length > 0 ? (
                  <div className="space-y-3">
                    {rows.map((row) => {
                      const category = categoryById.get(row.assetCategoryId);
                      const asset = row.assetId
                        ? assets.find((entry) => entry.id === row.assetId)
                        : null;

                      return (
                        <div
                          key={row.id}
                          className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="line-clamp-1 text-sm font-semibold text-white">
                                  {asset?.name ?? category?.name ?? "Nieznana pozycja"}
                                </div>
                                {(asset?.code || category?.code) ? (
                                  <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                                    {asset?.code ?? category?.code}
                                  </span>
                                ) : null}
                                {row.assetId ? (
                                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2 py-0.5 text-[11px] font-medium text-emerald-100">
                                    Maszyna
                                  </span>
                                ) : (
                                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2 py-0.5 text-[11px] font-medium text-cyan-100">
                                    Kategoria
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {row.assetId
                                  ? `${category?.name ?? "Bez kategorii"} / ${permissionScopeSummary(row)}`
                                  : permissionScopeSummary(row)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-400/[0.08] hover:text-rose-100"
                            >
                              Usun
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 xl:grid-cols-[220px_1fr]">
                            <label className="flex flex-col gap-1">
                              <span className="text-sm text-slate-400">
                                Poziom
                              </span>
                              <select
                                value={row.skillLevel}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    skillLevel: Number(
                                      event.target.value,
                                    ) as EmployeeSkillLevel,
                                  })
                                }
                                className={inputClassName}
                              >
                                {skillLevelOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="flex flex-col gap-1">
                              <span className="text-sm text-slate-400">
                                Notatka
                              </span>
                              <input
                                value={row.notes ?? ""}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    notes: event.target.value,
                                  })
                                }
                                className={inputClassName}
                                placeholder="np. po szkoleniu stanowiskowym albo z ograniczeniem do zmiany B"
                              />
                            </label>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <PermissionToggle
                              active={row.canOperate}
                              label="Obsluga"
                              onClick={() =>
                                updateRow(row.id, {
                                  canOperate: !row.canOperate,
                                })
                              }
                            />
                            <PermissionToggle
                              active={row.canMaintain}
                              label="Utrzymanie ruchu"
                              onClick={() =>
                                updateRow(row.id, {
                                  canMaintain: !row.canMaintain,
                                  canApproveMaintenance:
                                    row.canMaintain && row.canApproveMaintenance
                                      ? false
                                      : row.canApproveMaintenance,
                                })
                              }
                            />
                            <PermissionToggle
                              active={row.canApproveMaintenance}
                              label="Akceptacja przegladow"
                              onClick={() =>
                                updateRow(row.id, {
                                  canMaintain: true,
                                  canApproveMaintenance:
                                    !row.canApproveMaintenance,
                                })
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-8 text-sm text-slate-500">
                    Pracownik nie ma jeszcze zadnych uprawnien. Dodaj pierwsza
                    pozycje z listy po lewej stronie.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
            <div className={`${subtleCardClassName} px-4 py-3 text-xs text-slate-400`}>
              Uprawnienia wybierasz tylko z listy kategorii maszyn dostepnych w
              systemie, wiec formularz zawsze pozostaje spojny z reszta danych.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
              >
                {saving ? "Zapisywanie..." : "Zapisz uprawnienia"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-2 text-sm font-medium transition",
        active
          ? "border-cyan-400/30 bg-cyan-400/[0.12] text-cyan-100"
          : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:bg-slate-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
