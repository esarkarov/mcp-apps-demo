# Spending insights — MCP Apps demo (banking)

A small MCP server that returns an interactive spending-insights view inside the conversation, for a retail-banking customer. Sample data only: one invented customer, invented merchants, nothing leaves the process and no dispute is sent anywhere. Built on the official `basic-server-react` starter from [ext-apps](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react).

Why this scenario: exploring financial data, spotting problems, and acting on them is a typical banking task. A text answer can list numbers; the widget lets the customer compare months, drill into a category, and act on a flagged payment in the same place.

## What the widget does

- **Overview:** income / spending / net / savings-rate tiles, a monthly income-vs-spending bar chart ("Show table" for an accessible table), spending by category, and a "What if I spent less?" calculator.
- **Worth a look:** the server flags a possible duplicate charge, a subscription price increase, and an unusually large payment. "Review" jumps to the affected transactions.
- **Transactions:** filter by category or merchant, open a payment, and dispute it (reason, optional comment, explicit confirm).
- **Disputes:** the customer's cases with reference, merchant, amount, reason, and opened date.
- **Failures:** a failed call shows a short message and a "Try again" button. If the host sends no tool result, the widget fetches the overview itself.

## Tools

| Tool                                               | Visible to                       | Purpose                                                                                                             |
| -------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `show-spending-insights`                           | model + UI                       | Opens the view (read-only). The text result is the fallback for hosts without MCP Apps and is what the model reads. |
| `show-disputes`                                    | model + UI                       | Opens the view on the Disputes tab (read-only).                                                                     |
| `get-overview`, `get-transactions`, `get-disputes` | app only (`visibility: ["app"]`) | Data for the widget.                                                                                                |
| `dispute-transaction`                              | app only                         | Opens a dispute case. Hidden from the model on purpose: a sensitive action needs a person to click.                 |

After a dispute the widget calls `updateModelContext`, because the model cannot see the iframe. Trade-off: hosts without MCP Apps can summarise the data but cannot dispute.

The widget is one self-contained file and its resource declares an empty CSP and no browser permissions, so it makes no network requests of its own.

## Run locally

Requires Node 20+.

```bash
npm install
npm run build
npm run serve              # http://localhost:3001/mcp (port via PORT)
```

Without `API_KEYS` or `ALLOWED_HOSTS` the server accepts only localhost requests, so a tunnel cannot reach it by accident.

Test host (official `basic-host`):

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host && npm install
SERVERS='["http://localhost:3001/mcp"]' npm start         # bash
$env:SERVERS='["http://localhost:3001/mcp"]'; npm start   # PowerShell
```

Open http://localhost:8080, pick tool `show-spending-insights`, input `{}`, Call Tool. In the ext-apps version we used (2.0.3), `npm start` in `basic-host` runs `bun --watch serve.ts`, so Bun is needed for the test host; the demo server itself needs only Node.

## Connect a host

Remote hosts need a public HTTPS URL. A free Cloudflare quick tunnel is enough for a demo. Every session:

1. Start the tunnel in one terminal and copy its host name: `npm run tunnel`. The host changes every time the tunnel restarts, so update the host's URL then.
2. Start the server in a second terminal, in the mode the host needs (table below). `npx cross-env` sets the variables the same way in bash, cmd and PowerShell.
3. Open `https://<tunnel-host>/mcp` in a browser. A JSON error from the MCP server means it is reachable; a Cloudflare 502 or a `403` means it is not.

The URL always ends in `/mcp`; the server answers on no other path.

| Mode | Command                                                             | Used for        |
| ---- | ------------------------------------------------------------------- | --------------- |
| Key  | `npx cross-env API_KEYS=<key> npm run serve`                        | Claude, VS Code |
| Open | `npx cross-env API_KEYS= ALLOWED_HOSTS=<tunnel-host> npm run serve` | ChatGPT, Gemini |

Generate a key (at least 16 characters) with `npm run keygen` and use the same key on the server and in the host. Give `ALLOWED_HOSTS` the host name only, without `https://` and without `/mcp`. The server prints its mode at startup. Close the tunnel and stop the server when you finish.

### Claude (custom connector)

Needs a paid Claude plan. Use key mode.

1. Settings → Connectors → Add custom connector.
2. Name `Spending Insights Demo`, URL `https://<tunnel-host>/mcp`.
3. Authentication: choose **No sign-in** (the dialog may preselect "Sign in now").
4. **Add header**: name `Authorization`, value `Bearer <your key>`. Leave the transport on Streamable HTTP and choose **Add**.
5. Ask, for example: "How has my spending looked over the last six months? Anything unusual?"

### VS Code (GitHub Copilot)

Use key mode. `.vscode/mcp.json` (or **MCP: Open User Configuration**):

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "demo-key",
      "description": "Demo API key",
      "password": true
    }
  ],
  "servers": {
    "spending-insights": {
      "type": "http",
      "url": "https://<tunnel-host>/mcp",
      "headers": { "Authorization": "Bearer ${input:demo-key}" }
    }
  }
}
```

For a local run without a key, use `"url": "http://localhost:3001/mcp"` and no `headers`.

1. Command Palette → **MCP: List Servers** → select the server → **Start Server**, and enter the key when asked.
2. In Copilot Chat, use **Agent** mode and tick the server's tools in the tools picker.
3. Ask with the tool named: "Use the show-spending-insights tool to show my spending over the last six months."

Open a folder other than this repository as the workspace. With this repository open, the Copilot agent read `server.ts` and offered to run its code instead of calling the tool (see findings).

### ChatGPT (custom MCP server)

ChatGPT's web app can add a custom MCP server (not available on mobile). Its authentication choices are OAuth, no authentication, or both; it has no option for a static key or header, so for a short test the server runs in open mode, restricted to the tunnel host.

1. Start the server in open mode.
2. In ChatGPT open Plugins and add a custom MCP server (OpenAI's guide: plus button, then **Add custom MCP server**). Name `Spending Insights Demo`, connection **Server URL** `https://<tunnel-host>/mcp`, authentication **No authentication**, tick "I understand and want to continue", **Create as a plugin**. The dialog also has a **Tunnel** connection option, which we did not try.
3. In a new chat type `@`, select the plugin, and ask the demo question.
4. After a server change, OpenAI's guide says to open the connection on the Plugins page, choose **Refresh**, and start a new chat (not exercised here).

Anyone who has the tunnel URL can call the server while it runs. Use it only for a short test with this sample data. Steps follow OpenAI's [connect guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

### Gemini (custom connector)

1. Start the server in open mode.
2. In Gemini open Customize → Connectors and add a custom MCP server. Enter `https://<tunnel-host>/mcp` and leave Client ID and Client secret empty.
3. In a chat, mention the connector and ask the demo question. Gemini asks permission before calling the tool.

In our test Gemini called the tool but did not request the widget (see findings).

## Configuration, security and data

| Variable        | Default              | Purpose                                                                                                       |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PORT`          | `3001`               | Listening port. `npm run tunnel` assumes 3001.                                                                |
| `HOST`          | `127.0.0.1`          | Bind address.                                                                                                 |
| `API_KEYS`      | unset                | Comma-separated `key` or `key:user` entries (keys of at least 16 characters). Turns on bearer authentication. |
| `ALLOWED_HOSTS` | unset                | Comma-separated host names accepted in the Host header.                                                       |
| `DISPUTES_FILE` | `data/disputes.json` | Where dispute cases are saved.                                                                                |

- **Access modes:** with no `API_KEYS` and no `ALLOWED_HOSTS`, only localhost Host and Origin values are accepted. With `API_KEYS`, `/mcp` requires `Authorization: Bearer <key>` (`401` otherwise); keys are compared by hash in constant time, and dispute cases are kept per user. With `ALLOWED_HOSTS` alone, requests for a listed host are accepted without authentication (others get `403`), so the server is open to anyone who knows the URL.
- **CORS:** the server sends `Access-Control-Allow-Origin: *` (the default `cors()` setting). The widget itself needs no CORS because it calls no external APIs.
- **Input limits:** request bodies up to 64 KB (`413` above that), transaction ids validated, comments up to 500 characters, filters up to 80, at most 20 ids per query.
- **Persistence:** dispute cases are saved to the JSON file and survive a restart. Single server process only. Delete the file to start fresh; `data/` is git-ignored.
- **Scope:** demo-grade protection with one shared key and no per-user identity. For real users, put an identity provider in front and keep the bearer-token check; the SDK's `requireBearerAuth` accepts any token verifier.

## Tested hosts and findings

| Host                      | Result                                                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `basic-host`              | Works.                                                                                                                                                               |
| Claude (custom connector) | Works with the API key header.                                                                                                                                       |
| VS Code Copilot           | Rendered in an earlier test, before the API key was added. Retest with the key header: connected and listed six tools, but the agent did not call them (unresolved). |
| ChatGPT                   | Renders on the first call; the dispute flow and the disputes list work. Only without authentication.                                                                 |
| Gemini                    | Connects without OAuth credentials and calls `show-spending-insights`; the widget is not requested or shown.                                                         |

- **A widget only renders when the model calls a tool linked to the view.** If the answer can come from earlier context, the model replies in text. This is why `show-disputes` exists.
- **Theme:** `prefers-color-scheme` inside the iframe follows the operating system, not the host, which made text and dropdowns unreadable in a dark VS Code on a light Windows theme. The widget now applies the host's theme variables.
- **ChatGPT authentication:** the custom-server dialog offers OAuth, no authentication, or both, with no static key or header, so the demo had to run open for the test. A real deployment would need OAuth.
- **ChatGPT answer layer:** after opening the view, the model also wrote its own formatted answer (cards, charts, recommendations) from the tool's data, so the view was not the only visual output. In Claude the answer was a short text.
- **Gemini:** the server log shows `tools/call` but no `resources/read`, so the `ui://` view was never requested. Gemini drew its own chart and sliders from the text result, and its figures did not agree with each other. Other Gemini surfaces were not checked.
- **VS Code first call:** one run failed with `[MCP App] Error loading app ... No MCP host initialized` and showed text; it worked later in a normal chat. A first-call race is a hypothesis, not confirmed. The widget can also be hidden inside a collapsed "Completed N steps" group.
- **VS Code retest:** with this repository open as the workspace, the agent read `server.ts` and proposed running its code instead of calling the tool, and once reported it could not find `show-spending-insights` after the server had listed its tools. Not resolved.

## Troubleshooting

- **`403` through the tunnel:** the server was started without `API_KEYS` or `ALLOWED_HOSTS`, or `ALLOWED_HOSTS` does not match the current tunnel host (it changes on every tunnel restart).
- **`401`:** `API_KEYS` is set but the request has no matching `Authorization: Bearer <key>` header. ChatGPT and Gemini cannot send one, so use open mode for them. VS Code asking for an OAuth client ID after a failed request is a sign of this; restart the server with the same key you give VS Code.
- **ChatGPT "The MCP server denied access":** the server is in key mode (`401`) or `ALLOWED_HOSTS` does not match the tunnel host (`403`).
- **`404` "Cannot GET /":** the URL is missing `/mcp`.
- **"Could not reach the server" in the widget:** the server or the tunnel is stopped. Restart it and choose **Try again**.
- **Text only, no view:** the model did not call a tool linked to the view. Ask again or name the tool.

## Demo script

1. "How has my spending looked over the last six months? Anything unusual?" The view opens with the chart and three flagged items.
2. Click **Review** on the Bistro Verde duplicate, open one payment, **Dispute this payment**, confirm.
3. Open **Disputes**: the case shows as Open.
4. In chat: "Show my disputes." The view opens on the Disputes tab.
5. Stop the server and click **Transactions**: a short error and **Try again**. Restart and click it.
6. Ask "Show my disputes" in a new chat: the case is still there.
