import React from "react";

export const DashboardPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Przeglad projektów, uklad?w hali i ostatnich uruchomien
            optymalizacji.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Nowy projekt
          </button>
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
            Import danych
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Aktywne projekty
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">4</p>
          <p className="mt-1 text-xs text-emerald-600">+1 w tym tygodniu</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Ostatnie optymalizacje
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">7</p>
          <p className="mt-1 text-xs text-slate-500">3 zakonczone sukcesem</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Średnia poprawa kosztu
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">18%</p>
          <p className="mt-1 text-xs text-slate-500">
            wzgledem layout?w wejsciowych
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Os czasu optymalizacji
              </h2>
              <p className="text-xs text-slate-500">
                Ostatnie uruchomienia algorytmów SLP / CORELAP / CRAFT.
              </p>
            </div>
            <select className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">
              <option>Ostatnie 7 dni</option>
              <option>Ostatnie 30 dni</option>
              <option>Caly okres</option>
            </select>
          </div>

          <div className="mt-4 flex h-52 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
            Wykres placeholder ? tutaj wejdzie chart z przebiegiem wartosci
            funkcji celu w kolejnych iteracjach.
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Ostatnie projekty
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="truncate text-slate-800">
                Hala montażu A ? wariant 3
              </span>
              <span className="text-xs text-slate-400">2 godz. temu</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="truncate text-slate-800">
                Linia pakowania ? optymalizacja przejsc
              </span>
              <span className="text-xs text-slate-400">wczoraj</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="truncate text-slate-800">
                Hala magazynowa ? nowy layout
              </span>
              <span className="text-xs text-slate-400">3 dni temu</span>
            </li>
          </ul>
          <button className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Przejdź do listy projektów
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Ostatnie zmiany w layoutach
          </h2>
          <table className="mt-3 w-full table-fixed text-left text-xs text-slate-700">
            <thead>
              <tr className="text-slate-500">
                <th className="w-1/3 py-1">Projekt</th>
                <th className="w-1/3 py-1">Layout</th>
                <th className="w-1/3 py-1 text-right">Modyfikacja</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-t border-slate-100">
                <td className="py-1 pr-2">Hala montażu A</td>
                <td className="py-1 pr-2">Wariant 3</td>
                <td className="py-1 text-right text-slate-500">
                  Zmiana pozycji stanowisk 4?6
                </td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-1 pr-2">Linia pakowania</td>
                <td className="py-1 pr-2">Optymalizacja 2</td>
                <td className="py-1 text-right text-slate-500">
                  Aktualizacja przeplyw?w
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Przygotowane scenariusze
          </h2>
          <ul className="mt-3 space-y-2 text-xs">
            <li className="flex flex-col rounded-lg border border-slate-100 bg-slate-50 p-2">
              <span className="font-medium text-slate-800">
                Minimalizacja odleglosci transportu
              </span>
              <span className="text-slate-500">
                Wagi przeplyw?w wysokie, ograniczenia na minimalne odleglosci
                miedzy gniazdami.
              </span>
            </li>
            <li className="flex flex-col rounded-lg border border-slate-100 bg-slate-50 p-2">
              <span className="font-medium text-slate-800">
                Maksymalna elastycznosc layoutu
              </span>
              <span className="text-slate-500">
                Priorytet dla mozliwosci rozbudowy i rearanzacji stanowisk.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
};
