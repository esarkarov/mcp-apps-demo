# Spending insights — MCP Apps demo (banking)

A small MCP server that returns an interactive spending-insights view inside the conversation, for a retail-banking customer. Sample data only: one invented customer, invented merchants, nothing leaves the process and no dispute is sent anywhere. Built on the official `basic-server-react` starter from [ext-apps](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react).

Why this scenario: exploring financial data, spotting problems, and acting on them is a typical banking and fintech task. A text answer can list numbers; the widget lets the customer compare months, drill into a category, and act on a flagged payment in the same place. It matches the "data exploration" use case in the research paper.

## What the widget does

- **Overview:** income / spending / net / savings-rate tiles, a monthly income-vs-spending bar chart (hover or focus for values, "Show table" for an accessible table), spending by category (click a category to see its transactions), and a "What if I spent less?" calculator.
- **Worth a look:** the server analyses the transactions and flags a possible duplicate charge, a subscription price increase, and an unusually large payment. "Review" jumps to the affected transactions.
- **Transactions:** filter by category or merchant, open a payment, and dispute it (reason, optional comment, explicit confirm).
- **Disputes:** the customer's cases with reference, merchant, amount, reason, an "Open" badge and the opened date. Asking "show my disputes" in chat opens this tab directly.
- **Failure states:** a failed call shows one short message and a "Try again" button (server unreachable, timeout, connection lost). If the host sends no tool result, the widget fetches the overview itself after 3 seconds; if the host never completes the handshake, it says so after 10 seconds.

## Tools

| Tool                     | Visible to                       | Purpose                                                                                                                                                                                            |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `show-spending-insights` | model + UI                       | Opens the view (read-only). The text result is the fallback for hosts without MCP Apps and is what the model reads: balance, totals, a month-by-month line, top categories, and the flagged items. |
| `show-disputes`          | model + UI                       | Opens the same view on the Disputes tab (read-only). Exists because the model would otherwise answer dispute follow-ups in text from earlier context.                                              |
| `get-overview`           | app only (`visibility: ["app"]`) | Refreshes aggregates when the period changes (3 / 6 months).                                                                                                                                       |
| `get-transactions`       | app only                         | Filtered transaction list.                                                                                                                                                                         |
| `get-disputes`           | app only                         | All dispute cases, newest first.                                                                                                                                                                   |
| `dispute-transaction`    | app only                         | Opens a dispute case. Hidden from the model on purpose: a sensitive action needs a person to click.                                                                                                |

After a dispute the widget calls `updateModelContext`, because the model cannot see the iframe. Trade-off: hosts without MCP Apps can summarise the data but cannot dispute.

The widget is one self-contained file. Its resource declares an empty CSP (no external origins) and no browser permissions, so it makes no network requests of its own; all data goes through the host.

Chart colours come from a palette checked with a colour-blind-safety validator (blue and orange for the two series, light and dark mode), and values are also available as text, a table, and per-mark labels. The widget follows the host's theme, not the OS setting.

## Run locally

Requires Node 20+. No bun needed.

```bash
npm install
npm run build
npm run serve              # MCP endpoint: http://localhost:3001/mcp (port via PORT env var)
```

With no `API_KEYS` set the server accepts only requests whose Host and Origin are localhost, so it cannot be reached through a tunnel by accident.

Test host (official `basic-host`, from the ext-apps repo):

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

2. In a second terminal start the tunnel:

   ```bash
   npx cloudflared tunnel --url http://127.0.0.1:3001
   ```

3. In Claude: Settings → Connectors → Add custom connector. Name `Spending Insights Demo`, URL `https://<tunnel-host>/mcp`, authentication **No sign-in**, then **Add header**: name `Authorization`, value `Bearer <your key>` (the word `Bearer`, a space, then the key).

4. Ask, for example: "How has my spending looked over the last six months? Anything unusual?"

The key is only a string you choose; reuse the same one on every start. A quick tunnel gets a new URL each time it restarts, so update the connector URL then. Close the tunnel when you finish.

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

## Security

| Mode  | How              | Who can reach the server                                              |
| ----- | ---------------- | --------------------------------------------------------------------- |
| Local | no `API_KEYS`    | Only requests with a localhost Host and Origin. Bound to `127.0.0.1`. |
| Key   | `API_KEYS=<key>` | Requests with `Authorization: Bearer <key>`. Others get `401`.        |

- `API_KEYS` takes a comma-separated list of `key` or `key:user` entries (keys of at least 16 characters). A key without a user belongs to the user `demo`. Keys are compared by hash in constant time.
- Request bodies are limited to 64 KB (`413` above that). Tool inputs are validated: transaction ids, comment length (500), filter length (80), at most 20 ids per query.
- Dispute cases are kept per user.
- Optional: `ALLOWED_HOSTS=<tunnel-host>` restricts the accepted Host header. `HOST` changes the bind address (default `127.0.0.1`).

This is demo-grade protection: one shared key, no per-user identity, no rate limiting. For real users, put an identity provider (for example Entra ID, Okta or Keycloak) in front and keep the bearer-token check in `main.ts`; the SDK's `requireBearerAuth` already accepts any token verifier. An earlier version of this demo included its own OAuth server; it was removed because writing an authorization server is outside the point of the demo and not a pattern to copy.

## Persistence

Dispute cases are saved to `data/disputes.json` (override with `DISPUTES_FILE`) and loaded at start, so they survive a restart. The file is written through a temporary file and a rename. It is meant for one server process; two processes writing the same file will overwrite each other. `data/` is in `.gitignore`. To start fresh, stop the server and delete the file.

## Tested hosts and findings

| Host                      | Result                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `basic-host` (ext-apps)   | Works. Used for the automated checks of all tabs, failure states and narrow frames.                                                   |
| Claude (custom connector) | Works with API key header. Widget renders, disputes work, failure states shown.                                                       |
| VS Code Copilot           | Renders after the fixes below. Tested through the tunnel before the API key was added; the `headers` setup above has not been tested. |
| ChatGPT                   | Not tested.                                                                                                                           |

What we learned:

- **A widget only renders when the model calls a tool that is linked to the view.** If the answer can be given from earlier context, the model replies in text and no view opens. This is why `show-disputes` exists. Tool descriptions should say when to use each view.
- **Theme:** `prefers-color-scheme` inside the iframe follows the operating system, not the host. A dark VS Code on a light Windows theme produced unreadable text and dropdowns. The widget now applies the host's theme variables and sets colours on `select`, `option`, `input` and `textarea` explicitly.
- **VS Code first call:** one run failed with `[MCP App] Error loading app ... No MCP host initialized` in a chat session of type `agent-host-copilotcli`, and the result showed as text. It worked in a normal chat afterwards. Some text-only results were also seen on the first call of a fresh connection; a first-call race is a hypothesis and is not confirmed. When a result looks like text, expand the "Completed N steps" group, it may be hidden there.
- **Tunnel errors:** a stopped server behind a quick tunnel returns a long Cloudflare `502` body through the host. The widget shortens this to "Could not reach the server."

## Demo script

1. "How has my spending looked over the last six months? Anything unusual?" The view opens with the chart and three flagged items.
2. Click **Review** on the Bistro Verde duplicate. Transactions filter to the two payments. Open one, **Dispute this payment**, confirm.
3. Open **Disputes**. The case shows with an Open badge.
4. In chat: "Show my disputes." The view opens on the Disputes tab.
5. In chat: "What did I spend on groceries?" Depending on the model this may be answered in text from earlier context; that is expected.
6. Stop the server and click **Transactions**: a short error and **Try again**. Restart and click it.
7. Restart the server and ask "Show my disputes" in a new chat: the case is still there.

## Demo limits

- Sample data only; nothing is sent to a bank.
- One shared API key, no per-user identity.
- Dispute cases are saved to a local JSON file for a single server process.
- Quick tunnels have no uptime guarantee and change URL on restart.
- Not tested in ChatGPT; the VS Code first-call behaviour is unconfirmed, and VS Code with the key header is untested.
