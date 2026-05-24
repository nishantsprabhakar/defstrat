# 🛡️ India Defence Investor Hub

An interactive investor-data dashboard for listed Indian defence companies.  
Live financial data · Charts & infographics · Downloadable Word & Excel reports.

**© Nishant Prabhakar**

---

## Features

- **Sector Overview** — combined market cap, P/E, 1-year returns, revenue/PAT comparison, bubble chart, heatmap, ROE/ROA scatter, market-cap treemap
- **Company Deep-Dive** — candlestick price chart, quarterly & annual financials, margin cascade, shareholding donut
- **Add any company** — type an NSE ticker in the sidebar to include any stock
- **Downloads** — one-click `.docx` summary reports and `.xlsx` financial workbooks

## Companies Tracked (default)

| Company | NSE Ticker | Sub-sector |
|---|---|---|
| MTAR Technologies | MTARTECH | Precision Engineering |
| Data Patterns | DATAPATTNS | Defence Electronics |
| Azad Engineering | AZAD | Precision Engineering |
| Zen Technologies | ZENTEC | Training Simulators |
| Ideaforge Technology | IDEAFORGE | Drones & UAVs |
| Paras Defence | PARASDEFE | Defence Optics & EMP |
| Aequs Aerospace | AEQUS | Precision Engineering |
| Astra Microwave | ASTRAMICRO | RF & Microwave Systems |

## Quick Start (local)

```bash
pip install -r requirements.txt
streamlit run app.py
```

Or double-click **`setup_and_run.bat`** (Windows — installs Python automatically if needed).

## Deploy on Streamlit Community Cloud

1. Fork / push this repo to your GitHub account
2. Go to [share.streamlit.io](https://share.streamlit.io) → **New app**
3. Select this repo, branch `main`, file `app.py`
4. Click **Deploy** — done ✅

## Stack

`streamlit` · `yfinance` · `pandas` · `matplotlib` · `plotly` · `python-docx` · `openpyxl`

---

*Data sourced from Yahoo Finance. For informational purposes only — not investment advice.*  
*© Nishant Prabhakar*
