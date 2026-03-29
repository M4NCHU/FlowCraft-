import { useEffect, useState } from "react";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { rolesApi } from "../api/rolesApi";
import { useAuth } from "../model/AuthProvider";
import type { RoleDto } from "../api/rolesContracts";

export function UsersRolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleName, setAssignRoleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [allRoles, currentUserRoles] = await Promise.all([
        rolesApi.list(),
        user?.userId
          ? rolesApi.getUserRoles(user.userId)
          : Promise.resolve({ userId: "", roles: [] }),
      ]);

      setRoles(allRoles ?? []);
      setUserRoles(currentUserRoles.roles ?? []);
    } catch (err) {
      setError(toApiError(err, "Nie udało się pobrać ról."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.userId]);

  useEffect(() => {
    if (user?.userId && !assignUserId) {
      setAssignUserId(user.userId);
    }
  }, [assignUserId, user?.userId]);

  useEffect(() => {
    if (!assignRoleName && roles.length > 0) {
      setAssignRoleName(roles[0].name);
    }
  }, [assignRoleName, roles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await rolesApi.create({ name: newRoleName.trim() });
      setNewRoleName("");
      await loadData();
    } catch (err) {
      setError(toApiError(err, "Nie udało się utworzyc roli."));
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId.trim() || !assignRoleName) return;

    setAssigning(true);
    setError(null);
    try {
      await rolesApi.assign({
        userId: assignUserId.trim(),
        roleName: assignRoleName,
      });
      await loadData();
    } catch (err) {
      setError(toApiError(err, "Nie udało się przypisac roli."));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <PageHeader title="Użytkownicy i role" />

      {loading && (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow">
          Ładowanie rol...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error.message}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl bg-white p-5 shadow">
            <div className="mb-4 text-sm font-semibold text-slate-900">
              Dostępne role
            </div>
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="text-sm text-slate-900">{role.name}</span>
                  <span className="text-xs text-slate-500">{role.id}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-white p-5 shadow">
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Twoje role
              </div>
              <div className="mb-3 text-xs text-slate-500">
                ID uzytkownika: {user?.userId ?? "brak danych"}
              </div>
              <div className="flex flex-wrap gap-2">
                {userRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {role}
                  </span>
                ))}
                {userRoles.length === 0 && (
                  <div className="text-sm text-slate-500">Brak rol.</div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Dodaj role
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="np. Supervisor"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {creating ? "Tworzenie..." : "Utwórz rolę"}
                </button>
              </form>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Przypisz rolę
              </div>
              <form onSubmit={handleAssign} className="space-y-3">
                <input
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  placeholder="User ID"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={assignRoleName}
                  onChange={(e) => setAssignRoleName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {roles.length === 0 && <option value="">Brak rol</option>}
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={assigning || !assignUserId.trim() || !assignRoleName}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {assigning ? "Przypisywanie..." : "Przypisz rolę"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
