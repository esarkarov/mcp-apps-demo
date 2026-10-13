# Spending insights — MCP Apps demo (banking)

A small MCP server that returns an interactive spending-insights view inside the conversation, for a retail-banking customer. Sample data only: one invented customer, invented merchants, nothing leaves the process and no dispute is sent anywhere. Built on the official `basic-server-react` starter from [ext-apps](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react).

Why this scenario: exploring financial data, spotting problems, and acting on them is a typical banking and fintech task. A text answer can list numbers; the widget lets the customer compare months, drill into a category, and act on a flagged payment in the same place. It matches the "data exploration" use case in the research paper.

## What the widget does

- **Overview:** income / spending / net / savings-rate tiles, a monthly income-vs-spending bar chart (hover or focus for values, "Show table" for an accessible table), spending by category (click a category to see its transactions), and a "What if I spent less?" calculator.
- **Worth a look:** the server analyses the transactions and flags a possible duplicate charge, a subscription price increase, and an unusually large payment. "Review" jumps to the affected transactions.
- **Transactions:** filter by category or merchant, open a payment, and dispute it (reason, optional comment, explicit confirm).

## Tools

| Tool | Visible to | Purpose |
|---|---|---|
| `show-spending-insights` | model + UI | Opens the view (read-only). The text result is the fallback for hosts without MCP Apps and is what the model reads. |
| `get-overview` | app only (`visibility: ["app"]`) | Refreshes aggregates when the period changes (3 / 6 months). |
| `get-transactions` | app only | Filtered transaction list. |
| `dispute-transaction` | app only | Opens a dispute case. Hidden from the model on purpose: a sensitive action needs a person to click. |

After a dispute the widget calls `updateModelContext`, because the model cannot see the iframe. Trade-off: hosts without MCP Apps can summarise the data but cannot dispute.

Chart colours come from a palette checked with a colour-blind-safety validator (blue and orange for the two series, light and dark mode), and values are also available as text, a table, and per-mark labels.

## Run locally

Requires Node 20+. No bun needed.

```bash
npm install
npm run build
npm run serve              # MCP endpoint: http://localhost:3001/mcp (port via PORT env var)
```

Test host (official `basic-host`, from the ext-apps repo):

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host && npm install
SERVERS='["http://localhost:3001/mcp"]' npm start   # open http://localhost:8080
```

Pick tool `show-spending-insights`, input `{}`, Call Tool.

## Run in Claude (custom connector)

Needs a paid Claude plan and a public HTTPS URL. A free quick tunnel is enough for a demo:

```bash
npx cloudflared tunnel --url http://127.0.0.1:3001
```

Claude → Settings → Connectors → Add custom connector → name `Spending Insights Demo`, URL `https://<tunnel-host>/mcp`, authentication "No sign-in". Then ask, for example: "How has my spending looked over the last six months? Anything unusual?" Close the tunnel when you finish; anyone with the URL can call the server.
