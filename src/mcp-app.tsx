import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import {
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import { Dashboard } from "./components/Dashboard";
import {
  CONNECT_TIMEOUT_MS,
  FIRST_RESULT_WAIT_MS,
  PERIOD_OPTIONS,
} from "./constants";
import { createApi } from "./lib/api";
import { errorMessage } from "./lib/errors";
import type { Overview } from "./types";
import { Notice } from "./components/Notice";

function Root() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [connectTimedOut, setConnectTimedOut] = useState(false);
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

  useEffect(() => {
    if (app) return;
    const timer = setTimeout(
      () => setConnectTimedOut(true),
      CONNECT_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [app]);

  useEffect(() => {
    if (!app) return;
    const onCancelled = () => setCancelled(true);
    app.addEventListener("toolcancelled", onCancelled);
    return () => app.removeEventListener("toolcancelled", onCancelled);
  }, [app]);

  useEffect(() => {
    if (!app || overview) return;
    let current = true;
    const timer = setTimeout(
      async () => {
        try {
          const data = await createApi(app).getOverview(PERIOD_OPTIONS[1]);
          if (current) setOverview((prev) => prev ?? data);
        } catch (e) {
          if (current) setLoadError(errorMessage(e));
        }
      },
      attempt === 0 ? FIRST_RESULT_WAIT_MS : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [app, overview, attempt]);

  useEffect(() => {
    if (hostContext?.theme) applyDocumentTheme(hostContext.theme);
    if (hostContext?.styles?.variables)
      applyHostStyleVariables(hostContext.styles.variables);
    if (hostContext?.styles?.css?.fonts)
      applyHostFonts(hostContext.styles.css.fonts);
  }, [hostContext]);

  if (error)
    return (
      <main className="app">
        <Notice kind="error">{`Could not start the view: ${error.message}`}</Notice>
      </main>
    );
  if (!app || !overview)
    return (
      <main className="app">
        {!app && connectTimedOut ? (
          <Notice kind="error">
            Could not connect to the host. Ask the assistant to show it again.
          </Notice>
        ) : cancelled ? (
          <Notice>The request was cancelled.</Notice>
        ) : loadError ? (
          <Notice
            kind="error"
            onRetry={() => {
              setLoadError(null);
              setAttempt((n) => n + 1);
            }}
          >
            {loadError}
          </Notice>
        ) : (
          <Notice>Loading your accounts…</Notice>
        )}
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
