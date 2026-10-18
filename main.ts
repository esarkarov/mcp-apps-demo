import { createServer } from "./server.js";
import { createApiKeyVerifier, DEMO_USER, parseApiKeys } from "./auth.js";
import {
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
  requireBearerAuth,
} from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import type { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import cors from "cors";
import express from "express";
import type { ErrorRequestHandler, Request, Response } from "express";

const MAX_BODY = "64kb";

const csv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const rejectBadBody: ErrorRequestHandler = (err, _req, res, _next) => {
  const tooLarge = err?.type === "entity.too.large";
  res.status(tooLarge ? 413 : 400).json({
    jsonrpc: "2.0",
    error: {
      code: -32700,
      message: tooLarge ? "Request body too large" : "Invalid request body",
    },
    id: null,
  });
};

export async function startStreamableHTTPServer(
  createServer: (user: string) => McpServer,
): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const host = process.env.HOST ?? "127.0.0.1";
  const apiKeys = parseApiKeys(process.env.API_KEYS);
  const allowedHosts = csv(process.env.ALLOWED_HOSTS);
  const authRequired = apiKeys.size > 0;
  const verifier = createApiKeyVerifier(apiKeys);

  const app = express();
  app.disable("x-powered-by");
  app.use(cors());

  if (allowedHosts.length > 0) app.use(hostHeaderValidation(allowedHosts));
  else if (!authRequired) {
    app.use(localhostHostValidation());
    app.use(localhostOriginValidation());
  }

  if (authRequired) app.use("/mcp", requireBearerAuth({ verifier }));

  app.use(express.json({ limit: MAX_BODY }));
  app.use(rejectBadBody);

  app.all("/mcp", async (req: Request, res: Response) => {
    const tokenUser = req.auth?.extra?.user;
    const user = typeof tokenUser === "string" ? tokenUser : DEMO_USER;
    const calls = Array.isArray(req.body)
      ? req.body
      : req.body
        ? [req.body]
        : [];
    for (const call of calls)
      if (call?.method)
        console.log(
          `[mcp] ${user} ${call.method}${call.params?.name ? ` ${call.params.name}` : call.params?.uri ? ` ${call.params.uri}` : ""}`,
        );

    const server = createServer(user);
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, host, () => {
    console.log(`MCP server listening on http://${host}:${port}/mcp`);
    if (apiKeys.size > 0)
      console.log(
        `Auth: Bearer API key accepted. Users: ${[...new Set(apiKeys.values())].join(", ")}`,
      );
    if (!authRequired)
      console.log(
        "Auth: none. Only localhost Host headers are accepted; set API_KEYS to expose this server (for example through a tunnel).",
      );
  });
  httpServer.on("error", (err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export async function startStdioServer(
  createServer: () => McpServer,
): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdioServer(() => createServer(DEMO_USER));
  } else {
    await startStreamableHTTPServer(createServer);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
