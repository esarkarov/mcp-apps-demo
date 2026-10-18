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

Without `API_KEYS` the server accepts only localhost requests, so a tunnel cannot reach it by accident.

Test host (official `basic-host`):

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host && npm install
SERVERS='["http://localhost:3001/mcp"]' npm start   # open http://localhost:8080
```

Pick tool `show-spending-insights`, input `{}`, Call Tool.

## Run in Claude (custom connector)

Needs a paid Claude plan and a public HTTPS URL. A free quick tunnel is enough for a demo.

1. Choose a key of at least 16 characters, for example `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`, and start the server with it:

   ```bash
   API_KEYS=<your key> npm run serve          # bash
   set API_KEYS=<your key>&& npm run serve    # Windows cmd (no space before &&)
   $env:API_KEYS="<your key>"; npm run serve  # PowerShell
   ```

2. Start the tunnel in a second terminal:

   ```bash
   npx cloudflared tunnel --url http://127.0.0.1:3001
   ```

3. In Claude: Settings → Connectors → Add custom connector. Name `Spending Insights Demo`, URL `https://<tunnel-host>/mcp`, authentication **No sign-in**, then **Add header**: name `Authorization`, value `Bearer <your key>`.

4. Ask, for example: "How has my spending looked over the last six months? Anything unusual?"

Reuse the same key on every start. A quick tunnel gets a new URL each time it restarts, so update the connector URL then. Close the tunnel when you finish.

### VS Code (GitHub Copilot)

`.vscode/mcp.json`:

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

## Security and data

- **Auth:** with `API_KEYS` set, `/mcp` requires `Authorization: Bearer <key>` (`401` otherwise). Keys are compared by hash in constant time. `API_KEYS` takes `key` or `key:user` entries, comma-separated; dispute cases are kept per user. Optional: `ALLOWED_HOSTS` restricts the accepted Host header.
- **Input limits:** request bodies up to 64 KB, validated transaction ids, comments up to 500 characters, filters up to 80.
- **Persistence:** dispute cases are saved to `data/disputes.json` (override with `DISPUTES_FILE`) and survive a restart. Single server process only. Delete the file to start fresh; `data/` is git-ignored.
- **Scope:** demo-grade protection with one shared key and no per-user identity. For real users, put an identity provider in front and keep the bearer-token check; the SDK's `requireBearerAuth` accepts any token verifier.

## Tested hosts and findings

| Host                      | Result                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `basic-host`              | Works.                                                                                                     |
| Claude (custom connector) | Works with the API key header.                                                                             |
| VS Code Copilot           | Renders; tested through the tunnel before the API key was added, so the `headers` setup above is untested. |
| ChatGPT                   | Not tested.                                                                                                |

- **A widget only renders when the model calls a tool linked to the view.** If the answer can come from earlier context, the model replies in text. This is why `show-disputes` exists.
- **Theme:** `prefers-color-scheme` inside the iframe follows the operating system, not the host, which made text and dropdowns unreadable in a dark VS Code on a light Windows theme. The widget now applies the host's theme variables.
- **VS Code first call:** one run failed with `[MCP App] Error loading app ... No MCP host initialized` and showed text; it worked later in a normal chat. A first-call race is a hypothesis, not confirmed. The widget can also be hidden inside a collapsed "Completed N steps" group.

## Demo script

1. "How has my spending looked over the last six months? Anything unusual?" The view opens with the chart and three flagged items.
2. Click **Review** on the Bistro Verde duplicate, open one payment, **Dispute this payment**, confirm.
3. Open **Disputes**: the case shows as Open.
4. In chat: "Show my disputes." The view opens on the Disputes tab.
5. Stop the server and click **Transactions**: a short error and **Try again**. Restart and click it.
6. Ask "Show my disputes" in a new chat: the case is still there.
