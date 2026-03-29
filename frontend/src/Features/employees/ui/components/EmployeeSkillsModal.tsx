import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import {
  EmployeeSkillLevel,
  type EmployeeDto,
  type ReplaceEmployeeSkillsRequest,
  type UpsertEmployeeSkillRequest,
} from "../../api/contracts";
import { employeesApi } from "../../api/employeesApi";
import type { AssetCategoryDto } from "../../../machines/api/contracts";

type Props = {
  open: boolean;
  employee: EmployeeDto | null;
  categories: AssetCategoryDto[];
  onClose: () => void;
  onSaved: (employeeId: string, skills: ReplaceEmployeeSkillsRequest["skills"]) => void;
};

const skillLevelOptions = [
  { value: EmployeeSkillLevel.Beginner, label: "Początkujący" },
  { value: EmployeeSkillLevel.Independent, label: "Samodzielny" },
  { value: EmployeeSkillLevel.Advanced, label: "Zaawansowany" },
  { value: EmployeeSkillLevel.Trainer, label: "Trener" },
];

type DraftSkill = UpsertEmployeeSkillRequest & {
  id: string;
};

function createDraft(): DraftSkill {
  return {
    id: crypto.randomUUID(),
    assetCategoryId: "",
    skillLevel: EmployeeSkillLevel.Beginner,
    canOperate: true,
    canMaintain: false,
    canApproveMaintenance: false,
    notes: "",
  };
}

export function EmployeeSkillsModal({
  open,
  employee,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<DraftSkill[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !employee) return;

    setRows(
      employee.skills.length > 0
        ? employee.skills.map((skill) => ({
            id: skill.id,
            assetCategoryId: skill.assetCategoryId,
            skillLevel: skill.skillLevel,
            canOperate: skill.canOperate,
            canMaintain: skill.canMaintain,
            canApproveMaintenance: skill.canApproveMaintenance,
            notes: skill.notes ?? "",
          }))
        : [createDraft()]
    );
    setSaving(false);
    setError("");
  }, [employee, open]);

  const usedCategoryIds = useMemo(
    () => new Set(rows.map((row) => row.assetCategoryId).filter(Boolean)),
    [rows]
  );

  if (!open || !employee) return null;

  const updateRow = (id: string, patch: Partial<DraftSkill>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createDraft()];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const sanitizedSkills = rows
      .filter((row) => row.assetCategoryId)
      .map<UpsertEmployeeSkillRequest>((row) => ({
        assetCategoryId: row.assetCategoryId,
        skillLevel: row.skillLevel,
        canOperate: row.canOperate,
        canMaintain: row.canMaintain,
        canApproveMaintenance: row.canApproveMaintenance,
        notes: row.notes?.trim() || null,
      }));

    const uniqueIds = new Set(sanitizedSkills.map((skill) => skill.assetCategoryId));
    if (uniqueIds.size !== sanitizedSkills.length) {
      setError("Każda kategoria może wystąpić tylko raz.");
      return;
    }

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
        setError("Nie udało się zapisać kompetencji.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Macierz kompetencji: {employee.firstName} {employee.lastName}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_1fr]">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600">Kategoria maszyny</span>
                    <select
                      value={row.assetCategoryId}
                      onChange={(event) =>
                        updateRow(row.id, { assetCategoryId: event.target.value })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Wybierz kategorię</option>
                      {categories.map((category) => {
                        const isUsedElsewhere =
                          usedCategoryIds.has(category.id) &&
                          category.id !== row.assetCategoryId;

                        return (
                          <option
                            key={category.id}
                            value={category.id}
                            disabled={isUsedElsewhere}
                          >
                            {category.name}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600">Poziom</span>
                    <select
                      value={row.skillLevel}
                      onChange={(event) =>
                        updateRow(row.id, {
                          skillLevel: Number(event.target.value) as EmployeeSkillLevel,
                        })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {skillLevelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600">Notatki</span>
                    <input
                      value={row.notes ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, { notes: event.target.value })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="np. po szkoleniu z TPM"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={row.canOperate}
                      onChange={(event) =>
                        updateRow(row.id, { canOperate: event.target.checked })
                      }
                    />
                    Obsługa
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={row.canMaintain}
                      onChange={(event) =>
                        updateRow(row.id, { canMaintain: event.target.checked })
                      }
                    />
                    Utrzymanie
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={row.canApproveMaintenance}
                      onChange={(event) =>
                        updateRow(row.id, {
                          canApproveMaintenance: event.target.checked,
                        })
                      }
                    />
                    Akceptacja przeglądu
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, createDraft()])}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dodaj kompetencję
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Zapisywanie..." : "Zapisz kompetencje"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
