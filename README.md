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

Without `ALLOWED_HOSTS` the server accepts only localhost requests, so a tunnel cannot reach it by accident.

Test host (official `basic-host`):

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host && npm install
SERVERS='["http://localhost:3001/mcp"]' npm start         # bash
$env:SERVERS='["http://localhost:3001/mcp"]'; npm start   # PowerShell
```

Open http://localhost:8080, pick tool `show-spending-insights`, input `{}`, Call Tool. In the ext-apps version we used (2.0.3), `npm start` in `basic-host` runs `bun --watch serve.ts`, so Bun is needed for the test host; the demo server itself needs only Node.

## Connect a host

Remote hosts need a public HTTPS URL. A free Cloudflare quick tunnel is enough for a demo. The demo has no authentication, so the same steps apply to every host. Every session:

1. Start the tunnel in one terminal and copy its host name: `npm run tunnel`. The host changes every time the tunnel restarts, so update the host's URL then.
2. Start the server in a second terminal, allowing only that host (host name only, without `https://` and without `/mcp`): `npx cross-env ALLOWED_HOSTS=<tunnel-host> npm run serve`. `npx cross-env` sets the variable the same way in bash, cmd and PowerShell.
3. Open `https://<tunnel-host>/mcp` in a browser. A JSON error from the MCP server means it is reachable; a Cloudflare 502 or a `403` means it is not.

The URL always ends in `/mcp`; the server answers on no other path. While the server runs, anyone who has the tunnel URL can call it. It serves sample data only; close the tunnel and stop the server when you finish.

### Claude (custom connector)

Needs a paid Claude plan.

1. Settings → Connectors → Add custom connector.
2. Name `Spending Insights Demo`, URL `https://<tunnel-host>/mcp`.
3. Authentication: choose **No sign-in** (the dialog may preselect "Sign in now"). Add no headers.
4. Choose **Add**, then ask, for example: "How has my spending looked over the last six months? Anything unusual?"

### VS Code (GitHub Copilot)

`.vscode/mcp.json` (or **MCP: Open User Configuration**):

```json
{
  "servers": {
    "spending-insights": {
      "type": "http",
      "url": "https://<tunnel-host>/mcp"
    }
  }
}
```

For a local run, use `"url": "http://localhost:3001/mcp"`.

1. Command Palette → **MCP: List Servers** → select the server → **Start Server**.
2. In Copilot Chat, use **Agent** mode and ask: "How has my spending looked over the last six months? Anything unusual?"

If the chat says the tool is not available, check the server's status and **Show Output** in **MCP: List Servers** first (see troubleshooting).

### ChatGPT (custom MCP server)

ChatGPT's web app can add a custom MCP server (not available on mobile). Its authentication choices are OAuth, no authentication, or both, with no option for a static key or header.

1. In ChatGPT open Plugins and add a custom MCP server (OpenAI's guide: plus button, then **Add custom MCP server**). Name `Spending Insights Demo`, connection **Server URL** `https://<tunnel-host>/mcp`, authentication **No authentication**, tick "I understand and want to continue", **Create as a plugin**. The dialog also has a **Tunnel** connection option, which we did not try.
2. In a new chat type `@`, select the plugin, and ask the demo question.
3. After a server change, OpenAI's guide says to open the connection on the Plugins page, choose **Refresh**, and start a new chat (not exercised here).

Steps follow OpenAI's [connect guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

### Gemini (custom connector)

1. In Gemini open Customize → Connectors and add a custom MCP server. Enter `https://<tunnel-host>/mcp` and leave Client ID and Client secret empty.
2. In a chat, mention the connector and ask the demo question. Gemini asks permission before calling the tool.

In our test Gemini called the tool but did not request the widget (see findings).

## Configuration, security and data

| Variable        | Default              | Purpose                                                 |
| --------------- | -------------------- | ------------------------------------------------------- |
| `PORT`          | `3001`               | Listening port. `npm run tunnel` assumes 3001.          |
| `HOST`          | `127.0.0.1`          | Bind address.                                           |
| `ALLOWED_HOSTS` | unset                | Comma-separated host names accepted in the Host header. |
| `DISPUTES_FILE` | `data/disputes.json` | Where dispute cases are saved.                          |

- **No authentication:** the demo has no sign-in and no API key. With no `ALLOWED_HOSTS`, only localhost Host and Origin values are accepted. With `ALLOWED_HOSTS`, requests for a listed host are accepted from anyone (others get `403`), so the server is open to anyone who knows the URL while a tunnel runs. A real deployment would need OAuth or an identity provider in front, which the demo does not include.
- **CORS:** the server sends `Access-Control-Allow-Origin: *` (the default `cors()` setting). The widget itself needs no CORS because it calls no external APIs.
- **Input limits:** request bodies up to 64 KB (`413` above that), transaction ids validated, comments up to 500 characters, filters up to 80, at most 20 ids per query.
- **Persistence:** dispute cases are saved to the JSON file, shared by everyone who reaches the server, and survive a restart. Single server process only. Delete the file to start fresh; `data/` is git-ignored.

## Tested hosts and findings

| Host                      | Result                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `basic-host`              | Works.                                                                                                                       |
| Claude (custom connector) | Works without authentication. Earlier tests used an API key header, since removed.                                           |
| VS Code Copilot           | Works: the view renders, and the dispute flow and the disputes list work. Earlier failures were setup errors (see findings). |
| ChatGPT                   | Renders on the first call; the dispute flow and the disputes list work. Requires no authentication.                          |
| Gemini                    | Connects without OAuth credentials and calls `show-spending-insights`; the widget is not requested or shown in our test.     |

- **A widget only renders when the model calls a tool linked to the view.** If the answer can come from earlier context, the model replies in text. This is why `show-disputes` exists.
- **Theme:** `prefers-color-scheme` inside the iframe follows the operating system, not the host, which made text and dropdowns unreadable in a dark VS Code on a light Windows theme. The widget now applies the host's theme variables, and the theme matched in Claude, ChatGPT and VS Code.
- **ChatGPT authentication:** the custom-server dialog offers OAuth, no authentication, or both, with no static key or header, so the demo runs without authentication. A real deployment would need OAuth.
- **ChatGPT answer layer:** after opening the view, the model also wrote its own formatted answer (cards, charts, recommendations) from the tool's data, so the view was not the only visual output. In Claude the answer was a short text.
- **Gemini:** the server log shows `tools/call` but no `resources/read`, so the `ui://` view was never requested. Gemini drew its own chart and sliders from the text result, and its figures did not agree with each other. Other Gemini surfaces were not checked.
- **VS Code first call:** one run failed with `[MCP App] Error loading app ... No MCP host initialized` and showed text; it worked later in a normal chat. A first-call race is a hypothesis, not confirmed. The widget can also be hidden inside a collapsed "Completed N steps" group.
- **VS Code setup errors look like a missing tool.** When the server was not connected, Copilot answered that the tool was not available and its agent read `server.ts` instead. The causes were a URL without `/mcp` (`404`) and a server started without `ALLOWED_HOSTS` (`403 Invalid Host`); both appear only in the VS Code server log, not in the chat.

## Troubleshooting

- **`403` through the tunnel:** the server was started without `ALLOWED_HOSTS`, or `ALLOWED_HOSTS` does not match the current tunnel host (it changes on every tunnel restart). ChatGPT shows this as "The MCP server denied access".
- **`404` "Cannot GET /":** the URL is missing `/mcp`.
- **"Could not reach the server" in the widget:** the server or the tunnel is stopped. Restart it and choose **Try again**.
- **Text only, no view:** the model did not call a tool linked to the view. Ask again or name the tool.
- **VS Code chat says the tool is not available:** the server did not connect. In **MCP: List Servers** choose **Show Output** and look for a `404` (URL without `/mcp`) or a `403 Invalid Host` (see above).

## Demo script

1. "How has my spending looked over the last six months? Anything unusual?" The view opens with the chart and three flagged items.
2. Click **Review** on the Bistro Verde duplicate, open one payment, **Dispute this payment**, confirm.
3. Open **Disputes**: the case shows as Open.
4. In chat: "Show my disputes." The view opens on the Disputes tab.
5. Stop the server and click **Transactions**: a short error and **Try again**. Restart and click it.
6. Ask "Show my disputes" in a new chat: the case is still there.
