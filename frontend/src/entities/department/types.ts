import { createBrowserRouter } from "react-router-dom";
import { appShellRoutes } from "./appShellRoutes";
import { RootLayout } from "./layout/RootLayout";
import { LoginPage } from "../Features/auth/ui/LoginPage/LoginPage";
import { RequireAuth } from "../Features/auth/ui/LoginPage/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: appShellRoutes.map((route) =>
      route.index
        ? {
            index: true,
            element: route.element,
          }
        : {
            path: route.path,
            element: route.element,
          }
    ),
  },
]);
