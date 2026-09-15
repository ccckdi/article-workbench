import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth";
import {
  ArticleEditor,
  ArticleListPage,
  Login,
  NotFound,
  PublicArticle,
  PublicFeed,
  PublicLayout,
  WorkspaceLayout,
} from "./pages";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicFeed /> },
      { path: "articles/:id", element: <PublicArticle /> },
    ],
  },
  {
    path: "/workspace",
    element: <WorkspaceLayout />,
    children: [
      { index: true, element: <ArticleListPage /> },
      { path: "new", element: <ArticleEditor /> },
      { path: "articles/:id", element: <ArticleEditor /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
