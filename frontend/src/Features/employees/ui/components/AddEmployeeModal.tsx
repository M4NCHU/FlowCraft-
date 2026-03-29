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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">Dodaj pracownika</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={employeeNumberId} className="text-sm text-slate-600">
                Numer pracownika <span className="text-rose-600">*</span>
              </label>
              <input
                id={employeeNumberId}
                value={employeeNumber}
                onChange={(event) => setEmployeeNumber(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. EMP-001"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={phoneId} className="text-sm text-slate-600">
                Telefon
              </label>
              <input
                id={phoneId}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. 600700800"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={firstNameId} className="text-sm text-slate-600">
                Imie <span className="text-rose-600">*</span>
              </label>
              <input
                id={firstNameId}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. Jan"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={lastNameId} className="text-sm text-slate-600">
                Nazwisko <span className="text-rose-600">*</span>
              </label>
              <input
                id={lastNameId}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. Kowalski"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={jobTitleId} className="text-sm text-slate-600">
                Stanowisko
              </label>
              <input
                id={jobTitleId}
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. Technik utrzymania ruchu"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor={departmentFieldId}
                className="text-sm text-slate-600"
              >
                Dział
              </label>
              <select
                id={departmentFieldId}
                value={selectedDepartmentId}
                onChange={(event) => setSelectedDepartmentId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="">Bez przypisania</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
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
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
