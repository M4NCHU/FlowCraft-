import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layout/RootLayout";
import { DashboardPage } from "../Features/dashboard/ui/DashboardPage/DashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "projects",
        element: <div>Lista projektów (placeholder)</div>,
      },
      {
        path: "layouts",
        element: <div>Layouty hali (placeholder)</div>,
      },
      {
        path: "optimization",
        element: <div>Optymalizacja (placeholder)</div>,
      },
      {
        path: "reports",
        element: <div>Raporty (placeholder)</div>,
      },
    ],
  },
]);
