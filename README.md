# Spending insights — MCP Apps demo (banking)

A small MCP server that returns an interactive spending-insights view inside the conversation, for a retail-banking customer. Sample data only: one invented customer, invented merchants, and no dispute is sent anywhere. Built on the official [`basic-server-react`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react) starter from ext-apps.

## What the widget does

- **Overview:** income, spending, net and savings-rate tiles, a monthly bar chart (with a "Show table" alternative), spending by category, and a "What if I spent less?" calculator.
- **Worth a look:** flags a possible duplicate charge, a subscription price increase and an unusually large payment. "Review" jumps to the affected transactions.
- **Transactions:** filter by category or merchant, open a payment, and dispute it (reason, optional comment, explicit confirm).
- **Disputes:** the customer's cases with reference, merchant, amount, reason and opened date.
- **Failures:** a failed call shows a short message and a "Try again" button.

## Tools

| Tool                                               | Visible to                       | Purpose                                                                                   |
| -------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| `show-spending-insights`                           | model + UI                       | Opens the view. The text result is the fallback for hosts without MCP Apps.               |
| `show-disputes`                                    | model + UI                       | Opens the view on the Disputes tab.                                                       |
| `get-overview`, `get-transactions`, `get-disputes` | app only (`visibility: ["app"]`) | Data for the widget.                                                                      |
| `dispute-transaction`                              | app only                         | Opens a dispute case. Hidden from the model on purpose: a sensitive action needs a click. |

After a dispute the widget calls `updateModelContext`, because the model cannot see the iframe. The widget is one self-contained file; its resource declares an empty CSP and no browser permissions.

## Run locally

Requires Node 20+.

```bash
npm install
npm run build
npm run serve   # http://localhost:3001/mcp (port via PORT)
```

Test with the official `basic-host` (needs Bun):

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host && npm install
SERVERS='["http://localhost:3001/mcp"]' npm start         # bash
$env:SERVERS='["http://localhost:3001/mcp"]'; npm start   # PowerShell
```

Open http://localhost:8080, pick `show-spending-insights`, input `{}`, **Call Tool**.

## Connect a host

Remote hosts need a public HTTPS URL. A free Cloudflare quick tunnel is enough. The demo has no authentication, so the steps are the same for every host. Each session:

1. Start the tunnel and copy its host name: `npm run tunnel`. The host changes on every restart.
2. In a second terminal, start the server allowing only that host (host name only, no `https://`, no `/mcp`): `npx cross-env ALLOWED_HOSTS=<tunnel-host> npm run serve`
3. Open `https://<tunnel-host>/mcp` in a browser. A JSON error from the MCP server means it is reachable; a Cloudflare 502 or a `403` means it is not.

The URL always ends in `/mcp`. While the server runs, anyone with the tunnel URL can call it, so use sample data only and stop the server and tunnel when you finish.

Example prompt for every host: "How has my spending looked over the last six months? Anything unusual?"

### Claude

Needs a paid plan. Settings → Connectors → Add custom connector. Name `Spending Insights Demo`, URL `https://<tunnel-host>/mcp`, authentication **No sign-in** (the dialog may preselect "Sign in now"), no headers.

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` (or **MCP: Open User Configuration**):

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

Run **MCP: List Servers** → select the server → **Start Server**, then use Copilot Chat in **Agent** mode. For a local run use `http://localhost:3001/mcp`.

### ChatGPT

Web app only. Plugins → add a custom MCP server (**Add custom MCP server**). Name `Spending Insights Demo`, **Server URL** `https://<tunnel-host>/mcp`, authentication **No authentication**, tick "I understand and want to continue", **Create as a plugin**. In a new chat type `@` and select the plugin. See OpenAI's [connect guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

### Gemini

Customize → Connectors → add a custom MCP server. Enter `https://<tunnel-host>/mcp` and leave Client ID and Client secret empty. Mention the connector in a chat; Gemini asks permission before calling the tool. In our test it called the tool but did not request the widget.

## Configuration

| Variable        | Default              | Purpose                                                 |
| --------------- | -------------------- | ------------------------------------------------------- |
| `PORT`          | `3001`               | Listening port. `npm run tunnel` assumes 3001.          |
| `HOST`          | `127.0.0.1`          | Bind address.                                           |
| `ALLOWED_HOSTS` | unset                | Comma-separated host names accepted in the Host header. |
| `DISPUTES_FILE` | `data/disputes.json` | Where dispute cases are saved.                          |

## Security notes

- **No authentication.** Without `ALLOWED_HOSTS` only localhost Host and Origin values are accepted. With it, requests for a listed host are accepted from anyone and other hosts get `403`. A real deployment would need OAuth or an identity provider in front.
- **CORS:** the server sends `Access-Control-Allow-Origin: *` (default `cors()`). The widget calls no external APIs, so it needs none.
- **Input limits:** bodies up to 64 KB (`413` above), validated transaction ids, comments up to 500 characters, filters up to 80, at most 20 ids per query.
- **Persistence:** dispute cases are saved to the JSON file, shared by everyone who reaches the server, single process only. Delete the file to start fresh; `data/` is git-ignored.

## Tested hosts

| Host            | Result                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| `basic-host`    | Works.                                                                  |
| Claude          | Works.                                                                  |
| VS Code Copilot | Works.                                                                  |
| ChatGPT (web)   | Works. The model also writes its own formatted answer next to the view. |
| Gemini          | Tool is called; the widget is not requested or shown.                   |

## Troubleshooting

- **`403` through the tunnel:** the server was started without `ALLOWED_HOSTS`, or it does not match the current tunnel host. ChatGPT shows this as "The MCP server denied access".
- **`404` "Cannot GET /":** the URL is missing `/mcp`.
- **"Could not reach the server" in the widget:** the server or tunnel is stopped. Restart it and choose **Try again**.
- **Text only, no view:** the model did not call a tool linked to the view. Ask again or name the tool.
- **VS Code says the tool is not available:** the server did not connect. In **MCP: List Servers** choose **Show Output** and look for a `404` or `403 Invalid Host`; neither appears in the chat.

## Demo script

1. Ask the example prompt. The view opens with the chart and three flagged items.
2. Click **Review** on the Bistro Verde duplicate, open one payment, **Dispute this payment**, confirm.
3. Open **Disputes**: the case shows as Open.
4. In chat: "Show my disputes." The view opens on the Disputes tab.
5. Stop the server and click **Transactions**: a short error and **Try again**. Restart and click it.
6. Ask "Show my disputes" in a new chat: the case is still there.
