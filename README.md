# Live Finance Command

A forked finance-tool branch that keeps the original curated watchlist but lets you add any listed company symbol and refresh it immediately from live sources.

Newly added companies are stored in the browser watchlist, survive refresh, and load quote, chart, news and available annual financial data from Yahoo Finance. Where a curated Moneycontrol/BSE/company-filing mapping exists, the app uses those sources as well.

## Run

```powershell
npm start
```

Then open:

```text
http://localhost:4173
```

On Windows, you can also double-click:

```text
Run DefStrat Dashboard.cmd
```

To stop the local server, double-click:

```text
Stop DefStrat Dashboard.cmd
```

The backend proxies Yahoo Finance chart/quote/fundamentals data, Moneycontrol consolidated financials and BSE filings so the browser can keep refreshing without CORS failures. The finance tool refreshes automatically every 60 seconds and stores added/deleted companies in branch-specific local browser storage.

## AI and transcript refresh

Finance AI calls the backend endpoint `/api/ai`, which refreshes company filing metrics, Yahoo Finance, Moneycontrol consolidated P&L, BSE announcements and news context before answering. Set `OPENAI_API_KEY` on your host for full AI-generated responses. Without it, the server returns a deterministic live-data fallback instead of inventing unavailable numbers.

The earnings-call tab calls `/api/transcript-summary` for the selected company. The backend scans BSE/company/news sources for transcript-like uploads and surfaces the latest detected filing or presentation signal automatically. Financial metrics shown in the earnings-call summary are restricted to company filing / investor-release data; Yahoo and Moneycontrol are only fallback sources outside that filing-backed summary section.

## Publish

This app needs a Node-capable web service because it includes a live-data proxy.

### Render

1. Create a new Web Service.
2. Connect the repository or upload these files.
3. Use:
   - Build command: blank
   - Start command: `node server.mjs`
   - Environment: Node

`render.yaml` is included for blueprint deploys and enables auto-deploy from the connected branch. If an existing Render service was created with auto-deploy disabled, open the Render dashboard and trigger **Manual Deploy -> Deploy latest commit** once.

### Docker

```powershell
docker build -t live-finance-command .
docker run -p 4173:4173 live-finance-command
```

## Notes

Yahoo's richer quote-summary endpoint can require protected web-session authorization. The app therefore uses Yahoo's live chart feed as the primary quote source and Yahoo annual fundamentals-timeseries as a financial-history fallback for newly added companies. Moneycontrol consolidated P&L and BSE/company filings remain preferred where mappings are available.
