import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../model/AuthProvider";
import { ApiError } from "../../../../shared/api/httpClient";
import { authApi } from "../../api/authApi";
import type { LoginRequest } from "../../api/contracts";

interface LoginFormState {
  login: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, refreshAuth } = useAuth();
  const [form, setForm] = useState<LoginFormState>({ login: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "checking") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-200">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <div className="text-sm">Sprawdzanie sesji?</div>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    const redirectTo =
      (location.state as any)?.from &&
      typeof (location.state as any).from === "string"
        ? (location.state as any).from
        : "/";
    return <Navigate to={redirectTo} replace />;
  }

  const handleChange =
    (field: keyof LoginFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.login.trim() || !form.password) {
      setError("Podaj login i haslo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: LoginRequest = {
        userNameOrEmail: form.login,
        password: form.password,
      };

      // rzuci ApiError jesli status != 2xx
      await authApi.login(payload);

      await refreshAuth();

      const from =
        (location.state as any)?.from &&
        typeof (location.state as any).from === "string"
          ? (location.state as any).from
          : "/";
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        let message =
          err.status === 401
            ? "Nieprawidlowy login lub haslo."
            : "Nie udało się zalogowac.";

        const data = err.data as any;
        if (
          data &&
          typeof data === "object" &&
          typeof (data as any).message === "string"
        ) {
          message = (data as any).message;
        }

        setError(message);
      } else {
        setError("Nie udało się polaczyc z serwerem. Spr?buj ponownie.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* LEWY PANEL ? hero, tylko na duzych ekranach */}
        <section className="hidden lg:flex lg:w-7/12 flex-col justify-between p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-xs font-semibold text-slate-950">
                FC
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold tracking-tight">
                  FlowCraft
                </span>
                <span className="text-xs text-slate-400">
                  Layout optimization for production halls
                </span>
              </div>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight mb-4">
              Zaloguj się, aby pracowac z ukladami hal
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              Zarzadzaj projektami, tw?rz layouty gniazd produkcyjnych, analizuj
              przeplyw materialu i przygotowuj warianty optymalizacyjne.
              Wszystko w jednym miejscu.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 text-xs text-slate-400 max-w-xl">
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                Projekty
              </div>
              <div className="text-sm font-semibold text-slate-100">
                Centralne repo layout?w
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                Optymalizacja
              </div>
              <div className="text-sm font-semibold text-slate-100">
                Por?wnanie wariant?w przeplywu
              </div>
            </div>
          </div>
        </section>

        {/* PRAWY PANEL ? formularz logowania */}
        <section className="flex w-full lg:w-5/12 items-center justify-center bg-slate-950/95 backdrop-blur-sm px-4 md:px-10 lg:px-12 py-10 lg:py-16">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/85 p-6 md:p-8 shadow-2xl shadow-emerald-500/15">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-50 mb-2">
              Logowanie
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Uzyj konta FlowCraft (rola Admin / Planner / Viewer).
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="login"
                  className="block text-xs font-medium text-slate-300"
                >
                  Login lub e-mail
                </label>
                <input
                  id="login"
                  type="text"
                  autoComplete="username"
                  value={form.login}
                  onChange={handleChange("login")}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="np. admin lub admin@flowcraft.local"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-300"
                >
                  Haslo
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange("password")}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="????????"
                />
              </div>

              {error && (
                <div
                  className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Logowanie..." : "Zaloguj się"}
              </button>
            </form>

            <div className="mt-6 text-[11px] text-slate-500">
              <div>Domyslny uzytkownik (seed z backenda):</div>
              <div className="mt-1 font-mono text-[11px]">
                login: <span className="text-slate-200">admin</span>
                <br />
                haslo: <span className="text-slate-200">Admin123!</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
