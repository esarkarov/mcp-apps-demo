import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import type { Overview } from "./types";
import { Dashboard } from "./components/Dashboard";

function Root() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hostContext, setHostContext] = useState<
    McpUiHostContext | undefined
  >();

  const { app, error } = useApp({
    appInfo: { name: "Spending Insights", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (a) => {
      a.ontoolresult = async (result) => {
        const data = result.structuredContent as Partial<Overview> | undefined;
        if (data?.byMonth) setOverview(data as Overview);
      };
      a.onhostcontextchanged = (changes) =>
        setHostContext((prev) => ({ ...prev, ...changes }));
      a.onerror = console.error;
    },
  });

  useEffect(() => {
    if (app) setHostContext(app.getHostContext());
  }, [app]);

  if (error)
    return (
      <main className="app">
        <p role="alert">Error: {error.message}</p>
      </main>
    );
  if (!app || !overview)
    return (
      <main className="app">
        <p className="muted">Loading your accounts…</p>
      </main>
    );

  const inset = hostContext?.safeAreaInsets;
  return (
    <main
      className="app"
      style={{
        paddingTop: inset?.top,
        paddingRight: inset?.right,
        paddingBottom: inset?.bottom,
        paddingLeft: inset?.left,
      }}
    >
      <Dashboard app={app} initial={overview} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
