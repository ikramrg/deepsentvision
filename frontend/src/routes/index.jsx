import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import MainLayout from "../components/layout/MainLayout";
import DashboardPage from "../pages/DashboardPage";
import FeedPage from "../pages/FeedPage";
import NotificationsPage from "../pages/NotificationsPage";
import NLPPage from "../pages/NLPPage";
import VisionPage from "../pages/VisionPage";
import FusionPage from "../pages/FusionPage";
import MLOpsPage from "../pages/MLOpsPage";
import ModelsPage from "../pages/ModelsPage";
import DeploymentsPage from "../pages/DeploymentsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />
      },
      {
        path: "register",
        element: <RegisterPage />
      },
      {
        path: "forgot",
        element: <ForgotPasswordPage />
      },
      {
        path: "dashboard",
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />
          }
          ,
          {
            path: "feed",
            element: <FeedPage />
          },
          {
            path: "notifications",
            element: <NotificationsPage />
          },
          {
            path: "nlp",
            element: <NLPPage />
          },
          {
            path: "vision",
            element: <VisionPage />
          },
          {
            path: "fusion",
            element: <FusionPage />
          },
          {
            path: "mlops",
            element: <MLOpsPage />
          },
          {
            path: "models",
            element: <ModelsPage />
          },
          {
            path: "deployments",
            element: <DeploymentsPage />
          }
        ]
      }
    ]
  }
]);