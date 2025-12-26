import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layout/RootLayout";
import { DashboardPage } from "../Features/dashboard/ui/DashboardPage/DashboardPage";
import { LayoutEditorPage } from "../Features/layout-editor/ui/LayoutEditorPage";
import { MachinesPage } from "../Features/machines/ui/MachinesPage";
import { MachineDetailsPage } from "../Features/machines/ui/MachineDetailsPage";
import { WorkOrdersBoardPage } from "../Features/work-orders/ui/WorkOrdersBoardPage";
import { WorkOrderDetailsPage } from "../Features/work-orders/ui/WorkOrderDetailsPage";
import { IncidentsPage } from "../Features/incidents/ui/IncidentsPage";
import { EmployeesPage } from "../Features/employees/ui/EmployeesPage";
import { MaintenancePlansPage } from "../Features/maintenance/ui/MaintenancePlansPage";
import { IncidentDetailsPage } from "../Features/incidents/ui/IncidentDetailsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "projects", element: <div>Lista projektów (placeholder)</div> },
      { path: "layouts", element: <div>Layouty hali (placeholder)</div> },
      { path: "optimization", element: <div>Optymalizacja (placeholder)</div> },
      { path: "reports", element: <div>Raporty (placeholder)</div> },
      { path: "editor", element: <LayoutEditorPage /> },

      { path: "machines", element: <MachinesPage /> },
      { path: "machines/:id", element: <MachineDetailsPage /> },
      { path: "work-orders", element: <WorkOrdersBoardPage /> },
      { path: "work-orders/:id", element: <WorkOrderDetailsPage /> },
      { path: "incidents", element: <IncidentsPage /> },
      { path: "incidents/:id", element: <IncidentDetailsPage /> },

      { path: "maintenance", element: <MaintenancePlansPage /> },
      { path: "employees", element: <EmployeesPage /> },
    ],
  },
]);
