import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import { departmentsApi } from "../../../departments/api/departmentsApi";
import type { DepartmentDto } from "../../../departments/api/contracts";
import { employeesApi } from "../../api/employeesApi";
import type { EmployeeDto } from "../../api/contracts";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (employee: EmployeeDto) => void;
};

const inputClassName =
  "rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";

const labelClassName = "text-xs font-semibold uppercase tracking-[0.14em] text-slate-400";

export function AddEmployeeModal({ open, onClose, onCreated }: Props) {
  const employeeNumberId = useId();
  const firstNameId = useId();
  const lastNameId = useId();
  const jobTitleId = useId();
  const phoneId = useId();
  const departmentFieldId = useId();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [phone, setPhone] = useState("");
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setEmployeeNumber("");
    setFirstName("");
    setLastName("");
    setJobTitle("");
    setSelectedDepartmentId("");
    setPhone("");
    setDepartments([]);
    setError("");
    setSaving(false);

    void departmentsApi
      .list({ includeInactive: false })
      .then((data) => setDepartments(data ?? []))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          return;
        }

        setError("Nie udało się pobrać listy działów.");
      });
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!employeeNumber.trim()) {
      setError("Numer pracownika jest wymagany.");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("Imie i nazwisko sa wymagane.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await employeesApi.create({
        employeeNumber: employeeNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        departmentId: selectedDepartmentId || null,
        jobTitle: jobTitle.trim() || null,
        phone: phone.trim() || null,
        hireDateUtc: null,
        userId: null,
        notes: null,
      });

      onCreated(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się zapisać pracownika.");
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
      <div className="w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                Zespol
              </div>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-white">
                Dodaj pracownika
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Szybki formularz do dodania osoby do zespolu z przypisaniem do
                dzialu i podstawowych danych kontaktowych.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Zakres
              </div>
              <div className="mt-2">Numer, dane, stanowisko i dzial.</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  Tozsamosc pracownika
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Pola wymagane do utworzenia profilu w systemie.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={employeeNumberId} className={labelClassName}>
                    Numer pracownika <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id={employeeNumberId}
                    value={employeeNumber}
                    onChange={(event) => setEmployeeNumber(event.target.value)}
                    className={inputClassName}
                    placeholder="np. EMP-001"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={phoneId} className={labelClassName}>
                    Telefon
                  </label>
                  <input
                    id={phoneId}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={inputClassName}
                    placeholder="np. 600700800"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={firstNameId} className={labelClassName}>
                    Imie <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id={firstNameId}
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className={inputClassName}
                    placeholder="np. Jan"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={lastNameId} className={labelClassName}>
                    Nazwisko <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id={lastNameId}
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className={inputClassName}
                    placeholder="np. Kowalski"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  Osadzenie w organizacji
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Dane, ktore pozniej pomagaja filtrowac pracownikow i
                  przypisywac ich do procesu.
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={jobTitleId} className={labelClassName}>
                  Stanowisko
                </label>
                <input
                  id={jobTitleId}
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  className={inputClassName}
                  placeholder="np. Technik utrzymania ruchu"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={departmentFieldId} className={labelClassName}>
                  Dzial
                </label>
                <select
                  id={departmentFieldId}
                  value={selectedDepartmentId}
                  onChange={(event) => setSelectedDepartmentId(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Bez przypisania</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                Po zapisaniu mozemy od razu przejsc do nadania uprawnien
                maszynowych dla tej osoby.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
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
              className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-4 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
            >
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
