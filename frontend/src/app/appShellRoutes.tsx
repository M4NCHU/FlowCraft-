import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { OperationsInboxPage } from "../Features/activity/ui/OperationsInboxPage";
import { AboutPage } from "../Features/about/ui/AboutPage";
import { UsersRolesPage } from "../Features/auth/ui/UsersRolesPage";
import { DashboardScreen } from "../Features/dashboard/ui/DashboardScreen";
import { DepartmentsPage } from "../Features/departments/ui/DepartmentsPage";
import { EmployeesPage } from "../Features/employees/ui/EmployeesPage";
import { HallsScreen } from "../Features/halls/ui/HallsScreen";
import { IncidentDetailsPage } from "../Features/incidents/ui/IncidentDetailsPage";
import { IncidentsPage } from "../Features/incidents/ui/IncidentsPage";
import { InventoryPage } from "../Features/inventory/ui/InventoryPage";
import { LayoutEditorScreen } from "../Features/layout-editor/ui/LayoutEditorScreen";
import { LeanIdeasScreen } from "../Features/lean/ui/LeanIdeasScreen";
import { MachineCategoriesPage } from "../Features/machine-categories/ui/MachineCategoriesPage";
import { MachineDetailsScreen } from "../Features/machines/ui/MachineDetailsScreen";
import { MachinesScreen } from "../Features/machines/ui/MachinesScreen";
import { MaintenancePlansPage } from "../Features/maintenance/ui/MaintenancePlansPage";
import { ReportsPage } from "../Features/reports/ui/ReportsPage";
import { WorkOrderDetailsPage } from "../Features/work-orders/ui/WorkOrderDetailsPage";
import { WorkOrdersBoardPage } from "../Features/work-orders/ui/WorkOrdersBoardPage";

type NavSection =
  | "main"
  | "facilities"
  | "resources"
  | "operations"
  | "analytics"
  | "settings";

type NavMeta = {
  label: string;
  section: NavSection;
  description: string;
  end?: boolean;
};

export type AppShellRoute = {
  key: string;
  to: string;
  element: ReactNode;
  path?: string;
  index?: true;
  nav?: NavMeta;
};

export type AppSidebarSection = {
  key: NavSection;
  label?: string;
  items: Array<Pick<AppShellRoute, "key" | "to"> & NavMeta>;
};

function placeholderPage(label: string, description: string) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
          Modul w przygotowaniu
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{label}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
        >
          Wroc do dashboardu
        </Link>
        <Link
          to="/reports"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
        >
          Otworz raporty
        </Link>
      </div>
    </div>
  );
}

const navSectionLabels: Record<NavSection, string | undefined> = {
  main: undefined,
  facilities: "Hale",
  resources: "Zasoby",
  operations: "Dzialania",
  analytics: "Statystyki",
  settings: "Ustawienia",
};

export const appShellRoutes: AppShellRoute[] = [
  {
    key: "dashboard",
    to: "/",
    index: true,
    element: <DashboardScreen />,
    nav: {
      label: "Strona glowna",
      section: "main",
      description: "Najwazniejsze KPI, ryzyka i szybkie przejscia do dzisiejszych dzialan.",
      end: true,
    },
  },
  {
    key: "about",
    to: "/about",
    path: "about",
    element: <AboutPage />,
    nav: {
      label: "O firmie",
      section: "main",
      description: "Tozsamosc organizacji, dane referencyjne i ustawienia poziomu firmy.",
    },
  },
  {
    key: "halls",
    to: "/halls",
    path: "halls",
    element: <HallsScreen />,
    nav: {
      label: "Hale",
      section: "facilities",
      description: "Lista hal, ich skala i szybkie przejscie do layoutow oraz raportow.",
    },
  },
  {
    key: "layouts",
    to: "/editor",
    path: "editor",
    element: <LayoutEditorScreen />,
    nav: {
      label: "Layouty",
      section: "facilities",
      description: "Edytor ukladu hali z maszynami, sekcjami i walidacja planu.",
    },
  },
  {
    key: "layouts-legacy",
    to: "/layouts",
    path: "layouts",
    element: <LayoutEditorScreen />,
  },
  {
    key: "lean",
    to: "/lean",
    path: "lean",
    element: <LeanIdeasScreen />,
    nav: {
      label: "Lean i kaizen",
      section: "operations",
      description: "Backlog usprawnien, priorytety i mierzenie efektow wdrozen.",
    },
  },
  {
    key: "optimization",
    to: "/optimization",
    path: "optimization",
    element: placeholderPage(
      "Optymalizacja layoutu",
      "Ten modul bedzie prowadzil przez porownanie wariantow i uruchomienie algorytmow optymalizacji. Zamiast mylacego duplikatu innego widoku pokazujemy teraz jasny stan modulu."
    ),
  },
  {
    key: "simulation",
    to: "/simulation",
    path: "simulation",
    element: placeholderPage(
      "Symulacja przeplywu",
      "Tutaj docelowo bedzie mozna przetestowac przeplyw materialu i obciazenie procesow przed wdrozeniem zmian na hali."
    ),
  },
  {
    key: "machines",
    to: "/machines",
    path: "machines",
    element: <MachinesScreen />,
    nav: {
      label: "Maszyny",
      section: "resources",
      description: "Park maszynowy, statusy, przeglady oraz przejscie do szczegolow zasobu.",
    },
  },
  {
    key: "machine-details",
    to: "/machines/:id",
    path: "machines/:id",
    element: <MachineDetailsScreen />,
  },
  {
    key: "machine-categories",
    to: "/machine-categories",
    path: "machine-categories",
    element: <MachineCategoriesPage />,
    nav: {
      label: "Kategorie maszyn",
      section: "resources",
      description: "Slownik kategorii maszyn i parametrow wspolnych dla zasobow.",
    },
  },
  {
    key: "employees",
    to: "/employees",
    path: "employees",
    element: <EmployeesPage />,
    nav: {
      label: "Pracownicy",
      section: "resources",
      description: "Zespol, uprawnienia i przypisanie pracownikow do kategorii maszyn.",
    },
  },
  {
    key: "departments",
    to: "/departments",
    path: "departments",
    element: <DepartmentsPage />,
    nav: {
      label: "Dzialy",
      section: "resources",
      description: "Struktura organizacyjna wykorzystywana w raportach, lean i magazynie.",
    },
  },
  {
    key: "inventory",
    to: "/inventory",
    path: "inventory",
    element: <InventoryPage />,
    nav: {
      label: "Magazyn i materialy",
      section: "resources",
      description: "Stock, zaopatrzenie i powiazanie pozycji z maszynami oraz zleceniami.",
    },
  },
  {
    key: "work-orders",
    to: "/work-orders",
    path: "work-orders",
    element: <WorkOrdersBoardPage />,
    nav: {
      label: "Zlecenia serwisowe",
      section: "operations",
      description: "Plan pracy utrzymania ruchu od nowego zgloszenia po wykonanie.",
    },
  },
  {
    key: "work-order-details",
    to: "/work-orders/:id",
    path: "work-orders/:id",
    element: <WorkOrderDetailsPage />,
  },
  {
    key: "incidents",
    to: "/incidents",
    path: "incidents",
    element: <IncidentsPage />,
    nav: {
      label: "Awarie i usterki",
      section: "operations",
      description: "Rejestr awarii, przyczyny, przestoje i przejscia do dzialan naprawczych.",
    },
  },
  {
    key: "incident-details",
    to: "/incidents/:id",
    path: "incidents/:id",
    element: <IncidentDetailsPage />,
  },
  {
    key: "maintenance",
    to: "/maintenance",
    path: "maintenance",
    element: <MaintenancePlansPage />,
    nav: {
      label: "Przeglady planowane",
      section: "operations",
      description: "Kalendarz prewencji, plany licznikowe i kontrola terminow wykonania.",
    },
  },
  {
    key: "schedule",
    to: "/schedule",
    path: "schedule",
    element: <MaintenancePlansPage />,
  },
  {
    key: "reports",
    to: "/reports",
    path: "reports",
    element: <ReportsPage />,
    nav: {
      label: "Raporty operacyjne",
      section: "analytics",
      description: "Przekroj przez hale, serwis, uprawnienia i magazyn w jednym miejscu.",
    },
  },
  {
    key: "activity",
    to: "/activity",
    path: "activity",
    element: <OperationsInboxPage />,
    nav: {
      label: "Do zrobienia dzis",
      section: "operations",
      description: "Skondensowana lista tematow, ktore wymagaja reakcji jeszcze dzisiaj.",
    },
  },
  {
    key: "users",
    to: "/users",
    path: "users",
    element: <UsersRolesPage />,
    nav: {
      label: "Uzytkownicy i role",
      section: "settings",
      description: "Kontekst dostepow, rol i odpowiedzialnosci administracyjnych.",
    },
  },
  {
    key: "import-export",
    to: "/import-export",
    path: "import-export",
    element: placeholderPage(
      "Import i eksport danych",
      "Ten ekran bedzie obslugiwal wymiane danych z plikami i innymi systemami, z jasnym podzialem na import, walidacje i eksport wynikow."
    ),
  },
  {
    key: "integrations",
    to: "/integrations",
    path: "integrations",
    element: placeholderPage(
      "Integracje",
      "W tym miejscu pojawi sie konfiguracja integracji z systemami zewnetrznymi i monitorowanie ich stanu."
    ),
  },
];

export const appSidebarSections: AppSidebarSection[] = (
  Object.keys(navSectionLabels) as NavSection[]
)
  .map((sectionKey) => ({
    key: sectionKey,
    label: navSectionLabels[sectionKey],
    items: appShellRoutes
      .filter((route): route is AppShellRoute & { nav: NavMeta } => {
        return route.nav?.section === sectionKey;
      })
      .map((route) => ({
        key: route.key,
        to: route.to,
        label: route.nav.label,
        description: route.nav.description,
        section: route.nav.section,
        end: route.nav.end,
      })),
  }))
  .filter((section) => section.items.length > 0);
