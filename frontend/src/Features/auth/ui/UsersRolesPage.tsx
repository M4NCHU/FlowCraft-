import { PageHeader } from "../../../shared/ui/PageHeader";
import { useAuth } from "../model/AuthProvider";

type DemoUser = {
  id: string;
  name: string;
  email: string;
  department: string;
  status: "Aktywny" | "Oczekuje" | "Offline";
  roles: string[];
  lastActivity: string;
};

type DemoRole = {
  id: string;
  name: string;
  description: string;
  members: number;
  scope: string[];
};

type DemoActivity = {
  id: string;
  title: string;
  details: string;
  time: string;
};

const demoUsers: DemoUser[] = [
  {
    id: "USR-001",
    name: "Anna Kowalska",
    email: "anna.kowalska@flowcraft.local",
    department: "Operacje",
    status: "Aktywny",
    roles: ["Administrator", "Kierownik produkcji"],
    lastActivity: "Dzisiaj, 08:42",
  },
  {
    id: "USR-002",
    name: "Piotr Nowak",
    email: "piotr.nowak@flowcraft.local",
    department: "Utrzymanie ruchu",
    status: "Aktywny",
    roles: ["Technik UR", "Raportowanie"],
    lastActivity: "Dzisiaj, 07:58",
  },
  {
    id: "USR-003",
    name: "Marta Zielinska",
    email: "marta.zielinska@flowcraft.local",
    department: "Lean Management",
    status: "Oczekuje",
    roles: ["Lean Leader"],
    lastActivity: "Zaproszenie wyslane 25.04",
  },
  {
    id: "USR-004",
    name: "Jakub Wisniewski",
    email: "jakub.wisniewski@flowcraft.local",
    department: "Magazyn",
    status: "Offline",
    roles: ["Magazyn", "Odczyt KPI"],
    lastActivity: "Wczoraj, 16:21",
  },
];

const demoRoles: DemoRole[] = [
  {
    id: "ROL-ADM",
    name: "Administrator",
    description: "Pelny dostep do konfiguracji, uzytkownikow i danych systemowych.",
    members: 3,
    scope: ["Ustawienia", "Uzytkownicy", "Integracje"],
  },
  {
    id: "ROL-MGR",
    name: "Kierownik produkcji",
    description: "Nadzor nad realizacja zlecen, raportami i planem obciazen.",
    members: 5,
    scope: ["Zlecenia", "Raporty", "Dashboard"],
  },
  {
    id: "ROL-UR",
    name: "Technik UR",
    description: "Obsluga awarii, przegladow oraz historii serwisowej maszyn.",
    members: 8,
    scope: ["Awarie", "Przeglady", "Maszyny"],
  },
  {
    id: "ROL-LEAN",
    name: "Lean Leader",
    description: "Zarzadzanie pomyslami usprawnien i analiza przeplywu.",
    members: 2,
    scope: ["Lean", "Analiza przeplywu", "Raporty"],
  },
];

const demoActivity: DemoActivity[] = [
  {
    id: "ACT-001",
    title: "Dodano uzytkownika Marta Zielinska",
    details: "Rola startowa: Lean Leader",
    time: "10 min temu",
  },
  {
    id: "ACT-002",
    title: "Zmieniono uprawnienia roli Technik UR",
    details: "Dodano dostep do historii przegladow",
    time: "Dzisiaj, 08:15",
  },
  {
    id: "ACT-003",
    title: "Wyslano ponowne zaproszenie",
    details: "anna.serwis@flowcraft.local",
    time: "Wczoraj, 14:32",
  },
];

const summaryCards = [
  {
    label: "Aktywni uzytkownicy",
    value: "18",
    note: "+3 wzgledem poprzedniego tygodnia",
  },
  {
    label: "Role systemowe",
    value: "6",
    note: "4 operacyjne, 2 administracyjne",
  },
  {
    label: "Otwarte zaproszenia",
    value: "2",
    note: "1 dla Lean, 1 dla magazynu",
  },
  {
    label: "Logowania dzis",
    value: "27",
    note: "Najwiekszy ruch miedzy 7:00 a 9:00",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStatusClasses(status: DemoUser["status"]) {
  if (status === "Aktywny") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Oczekuje") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

export function UsersRolesPage() {
  const { user } = useAuth();

  const highlightedUser = user
    ? `${user.name || "Biezacy uzytkownik"} - ${user.userId}`
    : "Widok demonstracyjny bez aktywnej sesji backendowej";

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Uzytkownicy i role"
        eyebrow="Administracja"
        description="Kontekst dostepow, rol i odpowiedzialnosci. Widok prezentuje jak powinno wygladac zarzadzanie uprawnieniami oraz jakie informacje administracyjne sa tutaj najwazniejsze."
        extra={
          <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            Tryb demonstracyjny
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Panel uprawnien
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Reprezentacyjny widok zarzadzania dostepem dla screenow i demo
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Ekran pokazuje przykladowych uzytkownikow, role i ostatnie
              operacje administracyjne bez zaleznosci od odpowiedzi API.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-medium text-slate-900">Aktywny kontekst</div>
            <div className="mt-1">{highlightedUser}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow"
          >
            <div className="text-sm text-slate-500">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-900">
              {card.value}
            </div>
            <div className="mt-2 text-xs text-slate-500">{card.note}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Uzytkownicy
                </h3>
                <p className="text-sm text-slate-500">
                  Przykladowa lista osob z przypisanymi rolami i statusem.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Dodaj uzytkownika
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {demoUsers.map((demoUser) => (
                <div
                  key={demoUser.id}
                  className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {getInitials(demoUser.name)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {demoUser.name}
                          </div>
                          <div
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              demoUser.status
                            )}`}
                          >
                            {demoUser.status}
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {demoUser.email}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{demoUser.id}</span>
                          <span>{demoUser.department}</span>
                          <span>Ostatnia aktywnosc: {demoUser.lastActivity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="max-w-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Role
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {demoUser.roles.map((role) => (
                          <span
                            key={`${demoUser.id}-${role}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Ostatnie zmiany
                </h3>
                <p className="text-sm text-slate-500">
                  Historia przykladowych operacji administracyjnych.
                </p>
              </div>
              <div className="text-xs font-medium text-slate-400">
                Audit trail
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {demoActivity.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="mt-1 h-3 w-3 rounded-full bg-sky-500" />
                  <div className="flex-1 rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-400">{item.time}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.details}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Role</h3>
              <p className="text-sm text-slate-500">
                Zestaw przykladowych rol z zakresem odpowiedzialnosci.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {demoRoles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {role.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {role.id}
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {role.members} osob
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {role.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {role.scope.map((scope) => (
                      <span
                        key={`${role.id}-${scope}`}
                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Szybkie akcje
              </h3>
              <p className="text-sm text-slate-500">
                Zaslepki formularzy do prezentacji przeplywu administracyjnego.
              </p>
            </div>

            <div className="mt-5 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Utworz nowa role
                </div>
                <div className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                  Koordynator jakosci
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Zapisz role
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Przypisz role uzytkownikowi
                </div>
                <div className="mt-3 space-y-3">
                  <div className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                    USR-003 - Marta Zielinska
                  </div>
                  <div className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                    Lean Leader
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Przypisz role
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
