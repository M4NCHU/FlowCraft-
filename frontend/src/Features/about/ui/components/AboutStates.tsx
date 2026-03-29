type LoadingStateProps = {
  message?: string;
};

export function AboutLoadingState({
  message = "Pobieram aktualne informacje o firmie.",
}: LoadingStateProps) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <div className="space-y-1">
          <div className="text-base font-medium text-slate-900">
            Ładowanie danych firmy
          </div>
          <p className="text-sm text-slate-500">{message}</p>
        </div>
      </div>
    </div>
  );
}

type ErrorStateProps = {
  error: string;
  onRetry: () => Promise<void>;
};

export function AboutErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 shadow-sm">
      <div className="max-w-2xl space-y-4">
        <div className="inline-flex rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
          Problem z ladowaniem
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-rose-900">
            Nie udało się pobrać danych firmy
          </h2>
          <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
        >
          Sprobuj ponownie
        </button>
      </div>
    </div>
  );
}
