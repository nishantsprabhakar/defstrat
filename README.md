# Defence Finance Command

A live defence-equities dashboard for:

- Zen Technologies
- ideaForge Technology
- MTAR Technologies
- Data Patterns
- Aequs
- Paras Defence
- Astra Microwave

## Run

```powershell
npm start
```

Then open:

```text
http://localhost:4173
```

The backend proxies Yahoo Finance chart/quote data and BSE filings so the browser can keep refreshing without CORS failures. The dashboard refreshes automatically every 60 seconds and stores added/deleted companies in local browser storage.

## Publish

This app needs a Node-capable web service because it includes a live-data proxy.

### Render

1. Create a new Web Service.
2. Connect the repository or upload these files.
3. Use:
   - Build command: blank
   - Start command: `node server.mjs`
   - Environment: Node

`render.yaml` is included for blueprint deploys.

### Docker

```powershell
docker build -t defstrat-dashboard .
docker run -p 4173:4173 defstrat-dashboard
```

## Notes

Yahoo's richer financial-statement endpoint can require protected web-session authorization. The app therefore uses Yahoo's live chart feed as the primary quote source and keeps direct BSE/Yahoo source links beside every company for filings, earnings notes, investor presentations, and financial disclosures.
