import type { ReactNode } from "react";
import { OperationsInboxPage } from "../Features/activity/ui/OperationsInboxPage";
import { AboutPage } from "../Features/about/ui/AboutPage";
import { UsersRolesPage } from "../Features/auth/ui/UsersRolesPage";
import { DashboardScreen } from "../Features/dashboard/ui/DashboardScreen";
import { DepartmentsPage } from "../Features/departments/ui/DepartmentsPage";
import { EmployeesPage } from "../Features/employees/ui/EmployeesPage";
import { HallsScreen } from "../Features/halls/ui/HallsScreen";
import { IncidentDetailsPage } from "../Features/incidents/ui/IncidentDetailsPage";
import { IncidentsPage } from "../Features/incidents/ui/IncidentsPage";
import { LayoutEditorScreen } from "../Features/layout-editor/ui/LayoutEditorScreen";
import { LeanIdeasScreen } from "../Features/lean/ui/LeanIdeasScreen";
import { MachineCategoriesPage } from "../Features/machine-categories/ui/MachineCategoriesPage";
import { MachineDetailsScreen } from "../Features/machines/ui/MachineDetailsScreen";
import { MachinesScreen } from "../Features/machines/ui/MachinesScreen";
import { MaintenancePlansPage } from "../Features/maintenance/ui/MaintenancePlansPage";
import { ProjectsScreen } from "../Features/projects/ui/ProjectsScreen";
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

function placeholderPage(label: string) {
  return <div>{label} (placeholder)</div>;
}

const navSectionLabels: Record<NavSection, string | undefined> = {
  main: undefined,
  facilities: "Hale",
  resources: "Zasoby",
  operations: "Działania",
  analytics: "Statystyki",
  settings: "Ustawienia",
};

export const appShellRoutes: AppShellRoute[] = [
  {
    key: "dashboard",
    to: "/",
    index: true,
    element: <DashboardScreen />,
    nav: { label: "Strona główna", section: "main", end: true },
  },
  {
    key: "about",
    to: "/about",
    path: "about",
    element: <AboutPage />,
    nav: { label: "O firmie", section: "main" },
  },
  {
    key: "projects",
    to: "/projects",
    path: "projects",
    element: <ProjectsScreen />,
    nav: { label: "Projekty", section: "main" },
  },
  {
    key: "halls",
    to: "/halls",
    path: "halls",
    element: <HallsScreen />,
    nav: { label: "Hale", section: "facilities" },
  },
  {
    key: "layouts",
    to: "/editor",
    path: "editor",
    element: <LayoutEditorScreen />,
    nav: { label: "Layouty", section: "facilities" },
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
    nav: { label: "Lean i kaizen", section: "operations" },
  },
  {
    key: "optimization",
    to: "/optimization",
    path: "optimization",
    element: <LeanIdeasScreen />,
  },
  {
    key: "simulation",
    to: "/simulation",
    path: "simulation",
    element: placeholderPage("Symulacja przepływu"),
  },
  {
    key: "machines",
    to: "/machines",
    path: "machines",
    element: <MachinesScreen />,
    nav: { label: "Maszyny", section: "resources" },
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
    nav: { label: "Kategorie maszyn", section: "resources" },
  },
  {
    key: "employees",
    to: "/employees",
    path: "employees",
    element: <EmployeesPage />,
    nav: { label: "Pracownicy", section: "resources" },
  },
  {
    key: "departments",
    to: "/departments",
    path: "departments",
    element: <DepartmentsPage />,
    nav: { label: "Działy", section: "resources" },
  },
  {
    key: "inventory",
    to: "/inventory",
    path: "inventory",
    element: placeholderPage("Materiały / Magazyn"),
  },
  {
    key: "work-orders",
    to: "/work-orders",
    path: "work-orders",
    element: <WorkOrdersBoardPage />,
    nav: { label: "Zlecenia serwisowe", section: "operations" },
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
    nav: { label: "Awarie i usterki", section: "operations" },
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
    nav: { label: "Przeglądy planowane", section: "operations" },
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
    element: placeholderPage("Raporty"),
  },
  {
    key: "activity",
    to: "/activity",
    path: "activity",
    element: <OperationsInboxPage />,
    nav: { label: "Do zrobienia dziś", section: "operations" },
  },
  {
    key: "users",
    to: "/users",
    path: "users",
    element: <UsersRolesPage />,
    nav: { label: "Użytkownicy i role", section: "settings" },
  },
  {
    key: "import-export",
    to: "/import-export",
    path: "import-export",
    element: placeholderPage("Import / Export"),
  },
  {
    key: "integrations",
    to: "/integrations",
    path: "integrations",
    element: placeholderPage("Integracje"),
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
        section: route.nav.section,
        end: route.nav.end,
      })),
  }))
  .filter((section) => section.items.length > 0);
