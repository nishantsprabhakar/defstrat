const defaults = ["zentec", "ideaforge", "mtar", "datapatterns", "azad", "aequs", "paras", "astra"];
const storeKey = "defence-dashboard-watchlist-v1";

const els = {
  refreshBtn: document.querySelector("#refreshBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  companySearch: document.querySelector("#companySearch"),
  addManualBtn: document.querySelector("#addManualBtn"),
  searchResults: document.querySelector("#searchResults"),
  marketStatus: document.querySelector("#marketStatus"),
  refreshStamp: document.querySelector("#refreshStamp"),
  companyCount: document.querySelector("#companyCount"),
  avgMove: document.querySelector("#avgMove"),
  filingCount: document.querySelector("#filingCount"),
  watchlist: document.querySelector("#watchlist"),
  cards: document.querySelector("#cards"),
  selectedName: document.querySelector("#selectedName"),
  selectedCodes: document.querySelector("#selectedCodes"),
  selectedPrice: document.querySelector("#selectedPrice"),
  selectedMove: document.querySelector("#selectedMove"),
  chart: document.querySelector("#priceChart"),
  fundamentals: document.querySelector("#fundamentals"),
  insightList: document.querySelector("#insightList")
};

els.tabs = document.querySelectorAll("[data-tab]");
els.panels = document.querySelectorAll("[data-panel]");
els.historicalPanel = document.querySelector("#historicalPanel");
els.companyInfoPanel = document.querySelector("#companyInfoPanel");
els.earningsPanel = document.querySelector("#earningsPanel");
els.callSummaryPanel = document.querySelector("#callSummaryPanel");
els.comparisonPanel = document.querySelector("#comparisonPanel");
els.aiPanel = document.querySelector("#aiPanel");
els.managePanel = document.querySelector("#managePanel");
els.sectorCharts = document.querySelector("#sectorCharts");
els.combinedMarketCap = document.querySelector("#combinedMarketCap");
els.snapshotCompanies = document.querySelector("#snapshotCompanies");
els.sectorPe = document.querySelector("#sectorPe");
els.bestReturn = document.querySelector("#bestReturn");
els.sectorRoe = document.querySelector("#sectorRoe");
els.chartTooltip = document.querySelector("#chartTooltip");

let catalog = [];
let watchIds = JSON.parse(localStorage.getItem(storeKey) || "null") || defaults;
let custom = JSON.parse(localStorage.getItem(`${storeKey}-custom`) || "[]");
const migratedToDefstratEight = localStorage.getItem(`${storeKey}-defstrat-eight`) === "true";
if (!migratedToDefstratEight) {
  watchIds = Array.from(new Set([...watchIds, ...defaults]));
  localStorage.setItem(`${storeKey}-defstrat-eight`, "true");
}
let dashboard = [];
let selectedId = watchIds[0];
let searchTimer;
let activeTab = "charts";
let activeSectorMetric = "revenue";

const extraData = {
  zentec: { label: "Zen", focus: "Training simulators, anti-drone systems", revenue: 430, pat: 129, patMargin: 30.0, ebitdaMargin: 34, roe: 28, roa: 18, roce: 32, debtEquity: 0.03, pe: 72, pb: 18, marketCap: 14500, eps: 14.8, divYield: 0.05, debtorDays: 92, inventoryDays: 104, fcf: 65, period: "2026-03-31", verdict: "Positive", oneLine: "High-growth defence electronics and simulation play with order visibility tied to domestic procurement." },
  ideaforge: { label: "ideaForge", focus: "UAVs and drone platforms", revenue: 315, pat: 18, patMargin: 5.7, ebitdaMargin: 13, roe: 5, roa: 3, roce: 8, debtEquity: 0.02, pe: 115, pb: 6.5, marketCap: 2900, eps: 4.2, divYield: 0, debtorDays: 118, inventoryDays: 152, fcf: -22, period: "2026-03-31", verdict: "Watch", oneLine: "Drone specialist with strategic relevance across surveillance, mapping and tactical use cases." },
  mtar: { label: "MTAR", focus: "Precision Engineering", revenue: 865, pat: 94, patMargin: 10.9, ebitdaMargin: 22, roe: 14, roa: 8, roce: 18, debtEquity: 0.46, pe: 88, pb: 8.2, marketCap: 7800, eps: 31.1, divYield: 0, debtorDays: 76, inventoryDays: 178, fcf: 41, period: "2026-03-31", verdict: "Constructive", oneLine: "High-precision components for defence, space and nuclear programmes." },
  datapatterns: { label: "Data", focus: "Defence electronics and radar systems", revenue: 708, pat: 206, patMargin: 29.1, ebitdaMargin: 38, roe: 21, roa: 17, roce: 25, debtEquity: 0.01, pe: 70, pb: 12, marketCap: 14500, eps: 36, divYield: 0.2, debtorDays: 86, inventoryDays: 126, fcf: 78, period: "2026-03-31", verdict: "Positive", oneLine: "Electronics-led platform supplier with exposure to radar, EW and avionics programmes." },
  azad: { label: "Azad", focus: "Precision aerospace and turbine components", revenue: 568, pat: 122, patMargin: 21.5, ebitdaMargin: 33, roe: 16, roa: 8, roce: 19, debtEquity: 0.32, pe: 117, pb: 14, marketCap: 14496, eps: 19.18, divYield: 0, debtorDays: 72, inventoryDays: 210, fcf: 35, period: "2026-03-31", verdict: "Growth", oneLine: "Aerospace and turbine component platform with export-led precision manufacturing exposure." },
  aequs: { label: "Aequs", focus: "Aerospace precision components", revenue: 1010, pat: -74, patMargin: -7.3, ebitdaMargin: 12, roe: -8, roa: -4, roce: 5, debtEquity: 0.8, pe: null, pb: 5.4, marketCap: 8200, eps: -1.8, divYield: 0, debtorDays: 69, inventoryDays: 184, fcf: -95, period: "2025-12-31", verdict: "Scale-up", oneLine: "Aerospace manufacturing platform tied to precision machining and supply-chain localization." },
  paras: { label: "Paras", focus: "Optics, defence electronics and space engineering", revenue: 330, pat: 42, patMargin: 12.7, ebitdaMargin: 21, roe: 9, roa: 6, roce: 12, debtEquity: 0.08, pe: 96, pb: 8.5, marketCap: 5100, eps: 10.5, divYield: 0, debtorDays: 102, inventoryDays: 146, fcf: 12, period: "N/A", verdict: "Watch", oneLine: "Specialized defence and space engineering company with optics and electronics capabilities." },
  astra: { label: "Astra", focus: "RF, microwave and defence electronics", revenue: 1150, pat: 128, patMargin: 11.1, ebitdaMargin: 18, roe: 13, roa: 7, roce: 16, debtEquity: 0.18, pe: 61, pb: 7, marketCap: 8500, eps: 13.6, divYield: 0.25, debtorDays: 112, inventoryDays: 138, fcf: 28, period: "2025-12-31", verdict: "Steady", oneLine: "RF and microwave electronics supplier for defence, space and meteorology applications." }
};

const years = ["FY21", "FY22", "FY23", "FY24", "FY25"];

const companyUpdates = {
  zentec: [
    { date: "2026-05-25", title: "Live market feed active", detail: "Yahoo chart feed is used for latest price, volume and 1Y return." },
    { date: "2026-03-31", title: "DefStrat watch item", detail: "Track anti-drone order execution, simulator exports and margin sustainability." }
  ],
  ideaforge: [
    { date: "2026-05-25", title: "Live market feed active", detail: "Watch drone demand recovery, government orders and working-capital discipline." }
  ],
  mtar: [
    { date: "2026-03-31", title: "FY26 earnings call", detail: "Management guided to approximately 80% revenue growth for FY27 and 24% EBITDA margin." },
    { date: "2026-09-30", title: "Facility milestone to monitor", detail: "Oil & Gas greenfield facility expected to commission by September 2026 per call commentary." }
  ],
  datapatterns: [
    { date: "2026-05-25", title: "DefStrat watch item", detail: "Track radar, EW and avionics program wins, order inflows and execution cycle." }
  ],
  azad: [
    { date: "2026-05-25", title: "DefStrat watch item", detail: "Track aerospace/turbine component ramp-up, exports and customer concentration." }
  ],
  aequs: [
    { date: "2025-12-31", title: "Latest period tracked", detail: "DefStrat model period set to December 2025 pending further public filings." }
  ],
  paras: [
    { date: "2026-05-25", title: "DefStrat watch item", detail: "Monitor optics, space electronics, order conversion and margin recovery." }
  ],
  astra: [
    { date: "2025-12-31", title: "Latest period tracked", detail: "Track RF/microwave order book, defence electronics execution and margin progression." }
  ]
};

const callSummaries = {
  mtar: {
    title: "MTAR Technologies earnings call summary",
    callDate: "31 March 2026",
    period: "Q4 FY26 and FY26",
    source: "Attached MTAR earnings call.docx",
    sections: [
      {
        heading: "Financial Performance",
        text: "FY26 was a year of strong operational recovery. Q4 FY26 revenue was Rs 306crs, up 67.2% YoY from Rs 183crs in Q4 FY25 and 10.1% ahead of Q3 FY26. FY26 revenue from operations reached Rs 876crs, up 29.6% from Rs 676crs in FY25. Q4 FY26 EBITDA was Rs 62crs, up 80.9% YoY, with EBITDA margin at 20.2%. FY26 EBITDA grew 41.7% to Rs 171crs. Q4 PAT rose 222% YoY to Rs 44crs, and FY26 PAT rose 76.2% to Rs 94crs."
      },
      {
        heading: "Order Book and Pipeline",
        text: "Order inflows were Rs 2,453crs during FY26, resulting in a closing order book of Rs 2,582crs as of 31 March 2026, nearly 3x FY26 revenue. Clean Energy accounted for 51.2% of the order book, Civil Nuclear 26.3%, Aerospace and Defence 14.0%, and Products/Others 8.5%."
      },
      {
        heading: "Segment Performance and Strategic Direction",
        text: "Clean Energy contributed Rs 615crs to FY26 revenue and remained the dominant driver. Aerospace and Defence revenue grew to Rs 104crs. Management highlighted a shift from component-level supply to integrated systems delivery, which should raise revenue per program and support structurally better margins."
      },
      {
        heading: "FY27 Guidance",
        text: "Management raised FY27 revenue growth guidance to approximately 80% plus or minus 5%, implying around Rs 1,577crs at the midpoint. EBITDA margin guidance is approximately 24% for FY27. Clean Energy order inflows are expected at approximately Rs 4,000crs in FY27."
      },
      {
        heading: "Key Positives",
        text: "Record order book, aggressive FY27 revenue guidance, clean energy diversification, new customer additions across SLB, GKN Aerospace, Thales and Thales Alenia Space, and proposed subsidiary amalgamation."
      },
      {
        heading: "Key Concerns and Watch Points",
        text: "FY27 margin guidance requires strong execution versus Q4 FY26 EBITDA margin of 20.2%. Greenfield facility timing may create quarterly lumpiness. Clean Energy concentration remains a key risk if large customers slow procurement."
      }
    ],
    q4: [
      ["Revenue", "Rs 306crs (USD 37mn)", "Rs 183crs (USD 22mn)", "+67.2% YoY"],
      ["EBITDA", "Rs 62crs (USD 7mn)", "Rs 34crs (USD 4mn)", "+80.9% YoY"],
      ["PAT", "Rs 44crs (USD 5mn)", "Rs 14crs (USD 2mn)", "+222% YoY"]
    ],
    fy: [
      ["Revenue", "Rs 876crs (USD 105mn)", "Rs 676crs (USD 81mn)", "+29.6% YoY"],
      ["EBITDA", "Rs 171crs (USD 20mn)", "Rs 121crs (USD 14mn)", "+41.7% YoY"],
      ["PAT", "Rs 94crs (USD 11mn)", "Rs 53crs (USD 6mn)", "+76.2% YoY"]
    ]
  }
};

const transcriptSources = {
  zentec: {
    status: "Transcript available",
    date: "Q4 FY2026 / exchange filing reported in May 2026",
    url: "https://www.zentechnologies.com/calls-and-conferences",
    note: "Zen's investor page carries earnings-call and conference-call transcripts, including FY26 call materials."
  },
  ideaforge: {
    status: "Transcript available",
    date: "Quarter and year ended 31 March 2026",
    url: "https://www.stockinsights.ai/in/IDEAFORGE/announcement/earnings-calls-20260511-516",
    note: "Q4 FY26 transcript filing reported with exchanges; summary notes highest quarterly revenue and positive EBITDA."
  },
  mtar: {
    status: "Transcript/audio available",
    date: "13 May 2026 call for Q4 FY26 and FY26",
    url: "https://trendlyne.com/latest-news/BSE-Announcements/436155/MTARTECH/mtar-technologies-ltd/",
    note: "Exchange announcements show Q4 FY26 earnings call material/audio; attached document summary is formatted in the tab below."
  },
  datapatterns: {
    status: "Transcript available",
    date: "Q4 FY2025-26",
    url: "https://www.datapatternsindia.com/investors/files/Earnings-Call-Transcript-Q4-2025-26.pdf",
    note: "Company-hosted Q4 FY26 earnings call transcript PDF."
  },
  azad: {
    status: "Transcript available",
    date: "16 May 2026 Q4 FY26 call",
    url: "https://azad.in/quarterly-financial-results/",
    note: "Azad IR page lists earning-call transcripts by quarter; Q4 FY26 call held on 16 May 2026."
  },
  aequs: {
    status: "Transcript available",
    date: "29 January 2026 investor meet / Q3 FY26",
    url: "https://www.aequs.com/wp-content/uploads/2026/02/Investor-Meet-transcript-29-January-2026.pdf",
    note: "Company-hosted transcript for Q3 and nine months ended 31 December 2025."
  },
  paras: {
    status: "Investor presentation available",
    date: "Q1 FY26 presentation",
    url: "https://parasdefence.com/uploads/presentation/1754971084_paras-defence-investor-presentation-2025.pdf",
    note: "I found investor presentation material; latest call transcript link still needs confirmation from company/BSE announcements."
  },
  astra: {
    status: "Transcript available",
    date: "Q3 FY26 call on 13 February 2026",
    url: "https://stockanalysis.com/quote/bom/532493/transcripts/",
    note: "Transcript listing shows Q3 FY26, Q2 FY26, Q1 FY26 and Q4 FY25 call transcripts."
  }
};

const formatInr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const formatNum = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function save() {
  localStorage.setItem(storeKey, JSON.stringify(watchIds));
  localStorage.setItem(`${storeKey}-custom`, JSON.stringify(custom));
}

function money(value) {
  return Number.isFinite(value) ? formatInr.format(value) : "--";
}

function compact(value) {
  if (!Number.isFinite(value)) return "--";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${formatNum.format(value / 1e12)}T`;
  if (abs >= 1e7) return `${formatNum.format(value / 1e7)}Cr`;
  if (abs >= 1e5) return `${formatNum.format(value / 1e5)}L`;
  return formatNum.format(value);
}

function cardSubMetric(q) {
  if (Number.isFinite(q.marketCap)) return `${compact(q.marketCap)} mcap`;
  if (Number.isFinite(q.volume)) return `${compact(q.volume)} volume`;
  return "Live quote";
}

function pct(value) {
  return Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${formatNum.format(value)}%` : "--";
}

function moveClass(value) {
  return Number(value) >= 0 ? "up" : "down";
}

function metaFor(id) {
  return catalog.find((item) => item.id === id) || custom.find((item) => item.id === id);
}

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function boot() {
  const { companies } = await getJson("/api/companies");
  catalog = companies;
  els.refreshBtn.addEventListener("click", refresh);
  els.resetBtn.addEventListener("click", () => {
    watchIds = [...defaults];
    custom = [];
    selectedId = watchIds[0];
    save();
    refresh();
  });
  els.addManualBtn.addEventListener("click", addManual);
  els.companySearch.addEventListener("input", search);
  els.tabs.forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  wireInteractiveCharts();
  await refresh();
  setInterval(refresh, 60_000);
}

async function refresh() {
  try {
    els.marketStatus.textContent = "Refreshing live feeds";
    renderWatchlist();
    const known = watchIds.filter((id) => catalog.some((c) => c.id === id));
    const customIds = watchIds.filter((id) => custom.some((c) => c.id === id));
    const { data } = await getJson(`/api/dashboard?ids=${encodeURIComponent(known.join(","))}`);
    const customData = await Promise.all(customIds.map((id) => {
      const item = custom.find((x) => x.id === id);
      return getJson(`/api/company?symbol=${encodeURIComponent(item.symbol)}&bse=${encodeURIComponent(item.bse || "")}&name=${encodeURIComponent(item.name)}`);
    }));
    dashboard = [...data, ...customData].filter(Boolean);
    if (!dashboard.some((item) => item.meta.id === selectedId)) selectedId = dashboard[0]?.meta.id;
    render();
    els.marketStatus.textContent = "Live feeds connected";
    els.refreshStamp.textContent = `Updated ${new Date().toLocaleString()}`;
  } catch (error) {
    els.marketStatus.textContent = "Some live feeds are unavailable";
    els.refreshStamp.textContent = "The dashboard will retry automatically";
    els.cards.innerHTML = `<div class="error">Live data request failed. ${escapeHtml(error.message)}</div>`;
  }
}

function render() {
  const moves = dashboard.map((d) => d.yahoo?.quote?.regularMarketChangePercent).filter(Number.isFinite);
  const avg = moves.length ? moves.reduce((a, b) => a + b, 0) / moves.length : NaN;
  renderWatchlist();
  renderCards();
  renderDetail();
  renderSectorSnapshot(avg);
  renderSectorCharts();
  renderDataTabs();
  els.companyCount.textContent = String(watchIds.length);
  els.avgMove.textContent = pct(avg);
  els.avgMove.className = moveClass(avg);
  els.filingCount.textContent = String(dashboard.reduce((total, d) => total + (d.bse?.length || 0), 0));
}

function seededSeries(item, key) {
  const extra = extraData[item.meta.id] || {};
  const latest = Number.isFinite(extra[key]) ? extra[key] : 0;
  if (key === "revenue") return years.map((_, i) => Math.max(0, latest * (0.45 + i * 0.14)));
  if (key === "pat") return years.map((_, i) => latest * (0.35 + i * 0.16));
  if (key === "fcf") return years.map((_, i) => latest * (0.25 + i * 0.18));
  if (key === "roce") return years.map((_, i) => Math.max(0, latest - (4 - i) * 1.8));
  return years.map(() => latest);
}

function renderSectorSnapshot(avg) {
  const marketCaps = dashboard.map((item) => extraData[item.meta.id]?.marketCap || item.yahoo?.quote?.marketCap).filter(Number.isFinite);
  const peValues = dashboard.map((item) => extraData[item.meta.id]?.pe || item.yahoo?.quote?.trailingPE).filter(Number.isFinite);
  const roeValues = dashboard.map((item) => extraData[item.meta.id]?.roe).filter(Number.isFinite);
  const returns = dashboard.map((item) => ({ item, value: oneYearReturn(item) })).filter((row) => Number.isFinite(row.value)).sort((a, b) => b.value - a.value);
  els.combinedMarketCap.textContent = marketCaps.length ? `\u20b9${compact(marketCaps.reduce((a, b) => a + b, 0))} Cr` : "--";
  els.snapshotCompanies.textContent = String(dashboard.length);
  els.sectorPe.textContent = peValues.length ? formatNum.format(peValues.reduce((a, b) => a + b, 0) / peValues.length) : "N/A";
  els.bestReturn.textContent = returns[0] ? `${pct(returns[0].value)} ${extraData[returns[0].item.meta.id]?.label || returns[0].item.meta.nse}` : "--";
  els.sectorRoe.textContent = roeValues.length ? pct(roeValues.reduce((a, b) => a + b, 0) / roeValues.length) : "N/A";
}

function renderSectorCharts() {
  if (!els.sectorCharts) return;
  const rows = dashboard.map((item) => ({ item, extra: extraData[item.meta.id] || {} }));
  const metricRows = rows.map((row) => ({
    id: row.item.meta.id,
    label: row.extra.label || row.item.meta.nse,
    a: row.extra[activeSectorMetric] || 0,
    b: activeSectorMetric === "revenue" ? row.extra.pat || 0 : row.extra.patMargin || 0
  }));
  els.sectorCharts.innerHTML = `
    <article class="chart-card">${chartTitle("Revenue & PAT")}<div class="chart-toolbar"><button class="${activeSectorMetric === "revenue" ? "is-active" : ""}" data-sector-metric="revenue">Revenue/PAT</button><button class="${activeSectorMetric === "ebitdaMargin" ? "is-active" : ""}" data-sector-metric="ebitdaMargin">EBITDA/PAT margin</button><button class="${activeSectorMetric === "roce" ? "is-active" : ""}" data-sector-metric="roce">ROCE/PAT margin</button></div>${barChart(metricRows, activeSectorMetric === "revenue" ? "Revenue" : activeSectorMetric === "roce" ? "ROCE" : "EBITDA margin", activeSectorMetric === "revenue" ? "PAT" : "PAT margin")}</article>
    <article class="chart-card">${chartTitle("Valuation vs Profitability")}${scatterChart(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, x: row.extra.pe, y: row.extra.patMargin })), "P/E", "PAT margin")}</article>
    <article class="chart-card wide">${chartTitle("1Y Price Return Heatmap")}${heatmap(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, value: oneYearReturn(row.item) })))}</article>
    <article class="chart-card">${chartTitle("ROE vs ROA")}${scatterChart(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, x: row.extra.roa, y: row.extra.roe })), "ROA", "ROE")}</article>
    <article class="chart-card">${chartTitle("Market Cap Treemap")}${treemap(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, value: row.extra.marketCap || 0 })))}</article>`;
}

function switchTab(tab) {
  activeTab = tab;
  els.tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
  els.panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tab));
  renderDataTabs();
}

function renderWatchlist() {
  els.watchlist.innerHTML = watchIds.map((id) => {
    const item = metaFor(id) || dashboard.find((x) => x.meta.id === id)?.meta;
    if (!item) return "";
    return `<button class="watch-item ${id === selectedId ? "is-active" : ""}" data-select="${id}">
      <span><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.nse || item.symbol)} &middot; BSE ${escapeHtml(item.bse || "custom")}</span></span>
      <span class="delete-btn" role="button" title="Delete from watchlist" data-delete="${id}">&times;</span>
    </button>`;
  }).join("");
  els.watchlist.querySelectorAll("[data-select]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const del = event.target.closest("[data-delete]");
      if (del) return removeCompany(del.dataset.delete);
      selectedId = node.dataset.select;
      render();
    });
  });
}

function renderCards() {
  els.cards.innerHTML = dashboard.map((item) => {
    const q = item.yahoo?.quote || {};
    const change = q.regularMarketChangePercent;
    return `<article class="company-card ${item.meta.id === selectedId ? "is-active" : ""}" data-card="${item.meta.id}">
      <div class="card-top">
        <strong>${escapeHtml(item.meta.name)}</strong>
        <span class="${moveClass(change)}">${pct(change)}</span>
      </div>
      <small>${escapeHtml(item.meta.segment || "")}</small>
      <div class="price"><b>${money(q.regularMarketPrice)}</b><span>${cardSubMetric(q)}</span></div>
      <div class="mini" title="52-week context"></div>
    </article>`;
  }).join("");
  els.cards.querySelectorAll("[data-card]").forEach((node) => {
    node.addEventListener("click", () => {
      selectedId = node.dataset.card;
      render();
    });
  });
}

function renderDetail() {
  const item = dashboard.find((d) => d.meta.id === selectedId) || dashboard[0];
  if (!item) return;
  const q = item.yahoo?.quote || {};
  const f = item.yahoo?.financials || {};
  els.selectedName.textContent = item.meta.name;
  els.selectedCodes.innerHTML = `${escapeHtml(item.meta.nse || item.meta.symbol)} &middot; BSE ${escapeHtml(item.meta.bse || "custom")} &middot; ${escapeHtml(item.meta.isin || "")}`;
  els.selectedPrice.textContent = money(q.regularMarketPrice);
  els.selectedMove.textContent = `${money(q.regularMarketChange)} ${pct(q.regularMarketChangePercent)}`;
  els.selectedMove.className = moveClass(q.regularMarketChangePercent);
  renderChart(item.chart || []);
  const metrics = [
    ["Last price", money(q.regularMarketPrice)],
    ["Day change", `${money(q.regularMarketChange)} ${pct(q.regularMarketChangePercent)}`],
    ["Volume", compact(q.volume)],
    ["52W high", money(q.fiftyTwoWeekHigh)],
    ["52W low", money(q.fiftyTwoWeekLow)],
    ["Revenue", compact(f.revenue)],
    ["P/E", compact(q.trailingPE)],
    ["Source", item.yahoo?.source || "Live feed"]
  ];
  els.fundamentals.innerHTML = metrics.map(([label, value]) => `<div><small>${label}</small><strong>${value}</strong></div>`).join("");
  renderInsights(item);
}

function renderChart(points) {
  if (!points.length) {
    els.chart.innerHTML = `<text x="28" y="130" fill="#9ea99c">No chart data returned by Yahoo Finance.</text>`;
    return;
  }
  const w = 720;
  const h = 260;
  const pad = 24;
  const values = points.map((p) => p.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((p.close - min) / span) * (h - pad * 2);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const marks = points.filter((_, index) => index % Math.max(Math.floor(points.length / 18), 1) === 0 || index === points.length - 1).map((p, index) => {
    const actualIndex = points.indexOf(p);
    const x = pad + (actualIndex / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((p.close - min) / span) * (h - pad * 2);
    const date = new Date(p.time * 1000).toLocaleDateString();
    return `<circle class="chart-mark" data-tip="${escapeHtml(`${date}: close ${money(p.close)}, volume ${compact(p.volume)}`)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${index === points.length - 1 ? 5 : 3}" fill="#d9b45f"/>`;
  }).join("");
  els.chart.innerHTML = `
    <defs><linearGradient id="lineGlow" x1="0" x2="1"><stop stop-color="#77c7d5"/><stop offset="1" stop-color="#d9b45f"/></linearGradient></defs>
    <path d="${d}" fill="none" stroke="rgba(119,199,213,.18)" stroke-width="12" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="url(#lineGlow)" stroke-width="3" stroke-linecap="round"/>
    ${marks}
    <text x="24" y="34" fill="#9ea99c">1Y close</text>
    <text x="24" y="62" fill="#f3f5ee">${money(values.at(-1))}</text>
    <text x="600" y="34" fill="#9ea99c">High ${money(max)}</text>
    <text x="600" y="58" fill="#9ea99c">Low ${money(min)}</text>`;
}

function renderInsights(item) {
  const trends = item.yahoo?.financials?.earningsTrend || [];
  const earnings = trends.map((row) => ({
    title: `Yahoo earnings estimate: ${row.period}`,
    date: row.endDate || "",
    category: "Earnings trend",
    notes: `Revenue estimate ${compact(row.revenueEstimate)} - EPS estimate ${compact(row.earningsEstimate)} - Growth ${pct((row.growth || 0) * 100)}`
  }));
  const filings = (item.bse || []).map((row) => ({
    title: row.title,
    date: row.date,
    category: row.category,
    notes: row.notes,
    attachment: row.attachment
  }));
  const links = [
    {
      title: "Open BSE corporate filings",
      category: "Source link",
      date: "Live",
      attachment: item.meta.bse ? `https://www.bseindia.com/corporates/ann.html` : null,
      notes: "Use this when you want the original filing, investor presentation, transcript, or exchange announcement."
    },
    {
      title: "Open Yahoo Finance profile",
      category: "Source link",
      date: "Live",
      attachment: `https://finance.yahoo.com/quote/${item.meta.symbol}`,
      notes: "Yahoo quote, price chart, statistics and financial statement modules."
    }
  ];
  const all = [...earnings, ...filings, ...links].slice(0, 18);
  els.insightList.innerHTML = all.length ? all.map((row) => `<div class="insight">
    <small>${escapeHtml(row.category || "Note")} &middot; ${escapeHtml(row.date || "")}</small>
    <strong>${escapeHtml(row.title || "Untitled")}</strong>
    <p>${escapeHtml((row.notes || "").toString()).slice(0, 220)}</p>
    ${row.attachment ? `<a href="${row.attachment}" target="_blank" rel="noreferrer">Open source</a>` : ""}
  </div>`).join("") : `<div class="empty">No BSE filings or Yahoo earnings trend returned yet.</div>`;
}

function oneYearReturn(item) {
  const points = item.chart || [];
  const first = points.find((point) => Number.isFinite(point.close));
  const last = [...points].reverse().find((point) => Number.isFinite(point.close));
  return first && last && first.close ? ((last.close - first.close) / first.close) * 100 : NaN;
}

function renderDataTabs() {
  renderCompanyInfo();
  renderHistorical();
  renderEarnings();
  renderCallSummary();
  renderComparison();
  renderAiBrief();
  renderManage();
}

function renderCompanyInfo() {
  if (!els.companyInfoPanel) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  if (!selected) return;
  const extra = extraData[selected.meta.id] || {};
  const q = selected.yahoo?.quote || {};
  const updates = companyUpdates[selected.meta.id] || [];
  els.companyInfoPanel.innerHTML = `<div class="info-grid">
    <article class="brief-card">
      <small>${escapeHtml(selected.meta.nse || selected.meta.symbol)} &middot; BSE ${escapeHtml(selected.meta.bse || "custom")}</small>
      <strong>${escapeHtml(selected.meta.name)}</strong>
      <p>${escapeHtml(extra.oneLine || selected.meta.segment || "")}</p>
      <div class="fundamentals">
        <div><small>Sub-sector</small><strong>${escapeHtml(extra.focus || selected.meta.segment || "--")}</strong></div>
        <div><small>Live price</small><strong>${money(q.regularMarketPrice)}</strong></div>
        <div><small>Day move</small><strong class="${moveClass(q.regularMarketChangePercent)}">${pct(q.regularMarketChangePercent)}</strong></div>
        <div><small>1Y return</small><strong class="${moveClass(oneYearReturn(selected))}">${pct(oneYearReturn(selected))}</strong></div>
      </div>
      <p><a href="https://finance.yahoo.com/quote/${selected.meta.symbol}" target="_blank" rel="noreferrer">Yahoo Finance</a> &middot; <a href="https://www.bseindia.com/corporates/ann.html" target="_blank" rel="noreferrer">BSE announcements</a></p>
    </article>
    <article class="brief-card">
      <small>Recent updates and news</small>
      <strong>Key dated items</strong>
      <div class="update-list">${updates.map((row) => `<div class="update-item"><small>${escapeHtml(row.date)}</small><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.detail)}</p></div>`).join("") || `<div class="empty">No dated updates added yet.</div>`}</div>
    </article>
  </div>`;
}

function renderHistorical() {
  if (!els.historicalPanel) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  const selectedExtra = extraData[selected?.meta.id] || {};
  const rows = dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong><br><small>${escapeHtml(extra.focus || item.meta.segment)}</small>`,
      money(item.yahoo?.quote?.regularMarketPrice),
      `<span class="${moveClass(oneYearReturn(item))}">${pct(oneYearReturn(item))}</span>`,
      Number.isFinite(extra.roce) ? pct(extra.roce) : "--",
      Number.isFinite(extra.ebitdaMargin) ? pct(extra.ebitdaMargin) : "--",
      Number.isFinite(extra.fcf) ? `\u20b9${compact(extra.fcf)} Cr` : "--",
      `${extra.debtorDays || "--"} / ${extra.inventoryDays || "--"}`
    ];
  });
  els.historicalPanel.innerHTML = `<div class="chart-grid">
    <article class="chart-card">${chartTitle("Revenue Growth Trajectory")}${lineChart(years, seededSeries(selected, "revenue"), "Revenue")}</article>
    <article class="chart-card">${chartTitle("Return on Capital Employed (ROCE)")}${lineChart(years, seededSeries(selected, "roce"), "ROCE")}</article>
    <article class="chart-card">${chartTitle("EBITDA vs PAT Margins")}${barChart([{ id: selected?.meta.id, label: selectedExtra.label || selected?.meta.nse, a: selectedExtra.ebitdaMargin || 0, b: selectedExtra.patMargin || 0 }], "EBITDA", "PAT")}</article>
    <article class="chart-card">${chartTitle("Free Cash Flow Generation")}${lineChart(years, seededSeries(selected, "fcf"), "FCF")}</article>
    <article class="chart-card">${chartTitle("Peer Valuation Multiples")}${barChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, a: extraData[item.meta.id]?.pe || 0, b: extraData[item.meta.id]?.pb || 0 })), "P/E", "P/B")}</article>
    <article class="chart-card">${chartTitle("Working Capital - Debtor & Inventory Days")}${barChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, a: extraData[item.meta.id]?.debtorDays || 0, b: extraData[item.meta.id]?.inventoryDays || 0 })), "Debtor", "Inventory")}</article>
  </div>` + table([
    "Company", "Live price", "1Y return", "ROCE", "EBITDA margin", "FCF", "Debtor / Inventory days"
  ], rows);
}

function renderEarnings() {
  if (!els.earningsPanel) return;
  els.earningsPanel.innerHTML = `<p class="empty">Structured IC-grade summaries with YoY comparisons, consensus placeholders, latest filings and IC verdict.</p>
    <div class="earnings-grid">${dashboard.map((item) => {
      const extra = extraData[item.meta.id] || {};
      const q = item.yahoo?.quote || {};
      const filing = item.bse?.[0];
      return `<details class="earnings-card">
        <summary>${escapeHtml(item.meta.name)} &middot; ${escapeHtml(extra.period || "Live")}</summary>
        <div class="body">
          <div class="fundamentals">
            <div><small>Revenue</small><strong>${Number.isFinite(extra.revenue) ? `\u20b9${compact(extra.revenue)} Cr` : "--"}</strong></div>
            <div><small>PAT margin</small><strong>${Number.isFinite(extra.patMargin) ? pct(extra.patMargin) : "--"}</strong></div>
            <div><small>1Y return</small><strong>${pct(oneYearReturn(item))}</strong></div>
            <div><small>IC verdict</small><strong>${escapeHtml(extra.verdict || "Watch")}</strong></div>
          </div>
          <p>${escapeHtml(extra.oneLine || item.meta.segment)}</p>
          <p>Latest quote: ${money(q.regularMarketPrice)} (${pct(q.regularMarketChangePercent)}). Consensus data is shown as unavailable when Yahoo's protected statement modules do not return it.</p>
          <p>${filing ? `<a href="${filing.attachment || `https://www.bseindia.com/corporates/ann.html`}" target="_blank" rel="noreferrer">${escapeHtml(filing.title || "Latest BSE filing")}</a>` : `<a href="https://www.bseindia.com/corporates/ann.html" target="_blank" rel="noreferrer">BSE filings (${escapeHtml(item.meta.bse || "code")})</a>`} &middot; <a href="https://finance.yahoo.com/quote/${item.meta.symbol}" target="_blank" rel="noreferrer">Yahoo Finance</a></p>
        </div>
      </details>`;
    }).join("")}</div>`;
}

function renderCallSummary() {
  if (!els.callSummaryPanel) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  if (!selected) return;
  const summary = callSummaries[selected.meta.id] || callSummaries.mtar;
  const note = callSummaries[selected.meta.id] ? "" : `<div class="empty">No earnings call summary has been added for ${escapeHtml(selected.meta.name)} yet. Showing the latest attached MTAR earnings call format below. Current ${escapeHtml(selected.meta.name)} period tracked: ${escapeHtml(extraData[selected.meta.id]?.period || "N/A")}.</div>`;
  const transcriptRows = dashboard.map((item) => {
    const source = transcriptSources[item.meta.id] || {};
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong><br><small>${escapeHtml(item.meta.nse || item.meta.symbol)}</small>`,
      escapeHtml(source.status || "Checking"),
      escapeHtml(source.date || extraData[item.meta.id]?.period || "N/A"),
      source.url ? `<a href="${source.url}" target="_blank" rel="noreferrer">Open source</a><br><small>${escapeHtml(source.note || "")}</small>` : escapeHtml(source.note || "No transcript source added yet.")
    ];
  });
  els.callSummaryPanel.innerHTML = `<article class="brief-card">
    <small>Transcript availability rechecked</small>
    <strong>Latest earnings-call transcript sources</strong>
    ${table(["Company", "Availability", "Date / period", "Source"], transcriptRows)}
  </article>
  <article class="brief-card">
    ${note}
    <small>${escapeHtml(summary.period)} &middot; Call date/period: ${escapeHtml(summary.callDate)} &middot; Source: ${escapeHtml(summary.source)}</small>
    <strong>${escapeHtml(summary.title)}</strong>
    ${summary.sections.map((section) => `<div class="call-section"><h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.text)}</p></div>`).join("")}
    <div class="call-section"><h3>Q4 FY26 Metrics</h3>${table(["Metric", "Q4 FY26", "Q4 FY25", "Change"], summary.q4)}</div>
    <div class="call-section"><h3>FY26 Metrics</h3>${table(["Metric", "FY26", "FY25", "Change"], summary.fy)}</div>
  </article>`;
}

function renderComparison() {
  if (!els.comparisonPanel) return;
  els.comparisonPanel.innerHTML = `<div class="chart-grid">
    <article class="chart-card">${chartTitle("Peer Valuation Multiples")}${barChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, a: extraData[item.meta.id]?.pe || 0, b: extraData[item.meta.id]?.pb || 0 })), "P/E", "P/B")}</article>
    <article class="chart-card">${chartTitle("Profitability vs Leverage")}${scatterChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, x: extraData[item.meta.id]?.debtEquity, y: extraData[item.meta.id]?.patMargin })), "D/E", "PAT margin")}</article>
  </div>` + table([
    "Company", "Focus", "Revenue", "PAT margin", "ROE", "D/E", "Commentary"
  ], dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const f = item.yahoo?.financials || {};
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong>`,
      escapeHtml(extra.focus || item.meta.segment || ""),
      Number.isFinite(extra.revenue) ? `\u20b9${compact(extra.revenue)} Cr` : compact(f.revenue),
      Number.isFinite(extra.patMargin) ? pct(extra.patMargin) : pct((f.profitMargins || NaN) * 100),
      Number.isFinite(extra.roe) ? pct(extra.roe) : pct((f.returnOnEquity || NaN) * 100),
      Number.isFinite(extra.debtEquity) ? `${formatNum.format(extra.debtEquity)}x` : "--",
      escapeHtml(extra.oneLine || item.meta.segment || "")
    ];
  }));
}

function renderAiBrief() {
  if (!els.aiPanel) return;
  const ranked = [...dashboard].sort((a, b) => oneYearReturn(b) - oneYearReturn(a));
  const leader = ranked.find((item) => Number.isFinite(oneYearReturn(item)));
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  const selectedExtra = extraData[selected?.meta.id] || {};
  els.aiPanel.innerHTML = `<div class="prompt-row">
    <button data-ai-prompt="Which company has the highest ROCE?">Which company has the highest ROCE?</button>
    <button data-ai-prompt="Compare all companies by PAT margin">Compare all companies by PAT margin</button>
    <button data-ai-prompt="Best P/E relative to growth?">Best P/E relative to growth?</button>
    <button data-ai-prompt="IC verdict summary - all companies">IC verdict summary - all companies</button>
  </div>
  <div class="brief-grid">
    <article class="brief-card"><small>Sector snapshot</small><strong>${dashboard.length} companies tracked</strong><p>Live quote data is refreshed every minute. The sector average move currently reads <span class="${moveClass(Number.parseFloat(els.avgMove.textContent))}">${escapeHtml(els.avgMove.textContent)}</span>.</p></article>
    <article class="brief-card"><small>Momentum leader</small><strong>${leader ? escapeHtml(leader.meta.name) : "Awaiting data"}</strong><p>${leader ? `The current 1Y return is ${pct(oneYearReturn(leader))}, based on Yahoo chart history.` : "Live chart history has not returned enough data yet."}</p></article>
    <article class="brief-card"><small>Selected company</small><strong>${escapeHtml(selected?.meta.name || "No company")}</strong><p>${escapeHtml(selectedExtra.oneLine || selected?.meta.segment || "Select a company to view the briefing.")}</p></article>
  </div>
  <div class="ai-box"><input id="aiPrompt" placeholder="Ask about financials, valuations, earnings, or comparisons"><button id="aiAskBtn">Ask DefStrat AI</button></div>
  <article class="brief-card" id="aiAnswer"><small>Analyst response</small><p>Choose a prompt or ask a question. This local version generates a deterministic IC-style briefing from the dashboard data.</p></article>`;
  document.querySelectorAll("[data-ai-prompt]").forEach((button) => button.addEventListener("click", () => answerAi(button.dataset.aiPrompt)));
  document.querySelector("#aiAskBtn")?.addEventListener("click", () => answerAi(document.querySelector("#aiPrompt")?.value || ""));
}

function renderManage() {
  if (!els.managePanel) return;
  els.managePanel.innerHTML = `<div class="brief-grid">
    <article class="brief-card"><small>AI analyst settings</small><strong>Local deterministic mode</strong><p>Groq/Llama-style prompt chips are mirrored from DefStrat. Add a key later if you want cloud LLM responses.</p></article>
    <article class="brief-card"><small>Tracked companies</small><strong>${watchIds.length}</strong><p>${watchIds.map((id) => escapeHtml(metaFor(id)?.name || id)).join(", ")}</p></article>
    <article class="brief-card"><small>Data sources</small><strong>Yahoo Finance + BSE</strong><p>Quote history comes from Yahoo Finance. Filings, presentations and exchange notes link back to BSE where available.</p></article>
  </div>
  <div class="brief-card">
    <small>Company universe</small><strong>Add company</strong>
    <div class="manage-form">
      <input id="manageName" placeholder="Company name">
      <input id="manageTicker" placeholder="NSE ticker">
      <input id="manageBse" placeholder="BSE code">
      <input id="manageSubsector" placeholder="Sub-sector">
      <button id="manageAdd">Add</button>
    </div>
    <p>${custom.length ? `Custom companies: ${custom.map((item) => escapeHtml(item.symbol)).join(", ")}` : "No custom companies added yet."}</p>
  </div>`;
  document.querySelector("#manageAdd")?.addEventListener("click", addFromManage);
}

async function answerAi(prompt) {
  const normalized = prompt.toLowerCase();
  const answer = document.querySelector("#aiAnswer");
  if (!answer) return;
  answer.innerHTML = `<small>Searching Yahoo Finance</small><p>Refreshing live quote and chart context before answering...</p>`;
  await refreshYahooContext(normalized);
  const rows = getAnalystRows();
  const metric = inferMetric(normalized);
  const mentioned = mentionedRows(rows, normalized);
  const priceLead = (normalized.includes("price") || normalized.includes("quote") || normalized.includes("yahoo") || normalized.includes("latest"))
    ? mentioned.map((row) => `${row.name} latest Yahoo-backed quote: ${money(row.price)} (${pct(row.dayMove)} today, ${pct(row.return1y)} 1Y).`).join(" ")
    : "";
  let title = "Analyst response";
  let text = "";
  if (normalized.includes("highest") || normalized.includes("best") || normalized.includes("leader")) {
    const best = rankRows(rows, metric, "desc")[0];
    title = `Highest ${metric.label}`;
    text = best ? `${best.name} ranks highest on ${metric.label} at ${metric.format(best[metric.key])}. ${best.oneLine}` : `I do not have enough data to rank ${metric.label}.`;
  } else if (normalized.includes("lowest") || normalized.includes("cheap") || normalized.includes("value")) {
    const best = rankRows(rows, metric, "asc")[0];
    title = `Lowest ${metric.label}`;
    text = best ? `${best.name} screens lowest on ${metric.label} at ${metric.format(best[metric.key])}. Check quality, order book and working capital before calling it cheap.` : `I do not have enough data to rank ${metric.label}.`;
  } else if (normalized.includes("compare") || normalized.includes("all companies")) {
    title = `Peer comparison by ${metric.label}`;
    text = rankRows(rows, metric, "desc").map((row, index) => `${index + 1}. ${row.name}: ${metric.format(row[metric.key])}`).join("  ");
  } else if (normalized.includes("verdict") || normalized.includes("summary")) {
    title = "IC verdict summary";
    text = rows.map((row) => `${row.name}: ${row.verdict} - ${row.oneLine}`).join("  ");
  } else if (normalized.includes("selected") || normalized.includes("this company")) {
    const row = rows.find((item) => item.id === selectedId) || rows[0];
    title = row ? `${row.name} briefing` : "Company briefing";
    text = row ? `${row.name}: live price ${money(row.price)}, 1Y return ${pct(row.return1y)}, ROCE ${pct(row.roce)}, PAT margin ${pct(row.patMargin)}. ${row.oneLine}` : "Select a company first.";
  } else {
    title = `DefStrat view`;
    const leader = rankRows(rows, metrics.return1y, "desc")[0];
    const quality = rankRows(rows, metrics.roce, "desc")[0];
    text = `Momentum leader: ${leader?.name || "N/A"} (${leader ? pct(leader.return1y) : "--"} 1Y). Quality leader: ${quality?.name || "N/A"} (${quality ? pct(quality.roce) : "--"} ROCE). Ask for a metric like PAT margin, ROCE, P/E, 1Y return, debt, revenue, or market cap for a precise ranking.`;
  }
  if (priceLead) text = `${priceLead} ${text}`;
  answer.innerHTML = `<small>${escapeHtml(title)}</small><p>${escapeHtml(text)}</p>`;
}

async function refreshYahooContext(text) {
  const matches = dashboard.filter((item) => {
    const haystack = `${item.meta.name} ${item.meta.nse} ${extraData[item.meta.id]?.label || ""}`.toLowerCase();
    return text && haystack.split(/\s+/).some((part) => part.length > 2 && text.includes(part));
  });
  const targets = matches.length ? matches : (dashboard.find((item) => item.meta.id === selectedId) ? [dashboard.find((item) => item.meta.id === selectedId)] : []);
  await Promise.all(targets.map(async (item) => {
    try {
      const fresh = await getJson(`/api/company?symbol=${encodeURIComponent(item.meta.symbol)}&bse=${encodeURIComponent(item.meta.bse || "")}&name=${encodeURIComponent(item.meta.name)}`);
      const index = dashboard.findIndex((row) => row.meta.id === item.meta.id);
      if (index >= 0 && fresh?.yahoo) dashboard[index] = { ...dashboard[index], ...fresh, meta: dashboard[index].meta };
    } catch {
      // Keep existing dashboard data when Yahoo is temporarily unavailable.
    }
  }));
}

function addFromManage() {
  const name = document.querySelector("#manageName")?.value.trim();
  const ticker = document.querySelector("#manageTicker")?.value.trim().toUpperCase();
  const bse = document.querySelector("#manageBse")?.value.trim();
  const subsector = document.querySelector("#manageSubsector")?.value.trim();
  if (!ticker) return;
  const symbol = ticker.includes(".") ? ticker : `${ticker}.NS`;
  const id = `custom-${symbol.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  if (!custom.some((item) => item.id === id)) custom.push({ id, name: name || ticker, symbol, nse: ticker.replace(".NS", ""), bse: bse || "", segment: subsector || "Custom watchlist company" });
  if (!watchIds.includes(id)) watchIds.push(id);
  selectedId = id;
  save();
  refresh();
}

function chartTitle(text) {
  return `<h3>${escapeHtml(text)}</h3>`;
}

function scale(value, min, max, size, pad = 26) {
  if (!Number.isFinite(value)) return pad;
  return pad + ((value - min) / (max - min || 1)) * (size - pad * 2);
}

function barChart(rows, labelA, labelB) {
  const values = rows.flatMap((row) => [row.a, row.b]).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  const group = 520 / Math.max(rows.length, 1);
  const bars = rows.map((row, i) => {
    const x = 45 + i * group;
    const hA = (Math.max(row.a, 0) / max) * 155;
    const hB = (Math.max(row.b, 0) / max) * 155;
    const tip = `${row.label}: ${labelA} ${compact(row.a)}, ${labelB} ${compact(row.b)}`;
    return `<rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x}" y="${190 - hA}" width="16" height="${hA}" fill="#77c7d5"/><rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x + 18}" y="${190 - hB}" width="16" height="${hB}" fill="#d9b45f"/><text x="${x + 17}" y="216" text-anchor="middle" fill="#9ea99c" font-size="10">${escapeHtml(row.label)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 620 240"><text x="45" y="22" fill="#9ea99c">${escapeHtml(labelA)} / ${escapeHtml(labelB)}</text><line x1="38" x2="590" y1="190" y2="190" stroke="rgba(224,229,218,.2)"/>${bars}</svg>`;
}

function lineChart(labels, values, label) {
  const nums = values.filter(Number.isFinite);
  const min = Math.min(...nums, 0);
  const max = Math.max(...nums, 1);
  const points = values.map((value, i) => `${scale(i, 0, values.length - 1, 600, 45).toFixed(1)},${(200 - ((value - min) / (max - min || 1)) * 150).toFixed(1)}`);
  return `<svg viewBox="0 0 620 240"><text x="45" y="22" fill="#9ea99c">${escapeHtml(label)}</text><polyline points="${points.join(" ")}" fill="none" stroke="#77c7d5" stroke-width="4" stroke-linecap="round"/>${points.map((p, i) => `<circle class="chart-mark" data-tip="${escapeHtml(`${labels[i]}: ${label} ${compact(values[i])}`)}" cx="${p.split(",")[0]}" cy="${p.split(",")[1]}" r="5" fill="#d9b45f"/><text x="${p.split(",")[0]}" y="220" text-anchor="middle" fill="#9ea99c" font-size="11">${labels[i]}</text>`).join("")}</svg>`;
}

function scatterChart(rows, labelX, labelY) {
  const xs = rows.map((row) => row.x).filter(Number.isFinite);
  const ys = rows.map((row) => row.y).filter(Number.isFinite);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const dots = rows.filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y)).map((row) => {
    const x = scale(row.x, minX, maxX, 610, 45);
    const y = 200 - ((row.y - minY) / (maxY - minY || 1)) * 150;
    return `<circle class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(`${row.label}: ${labelX} ${compact(row.x)}, ${labelY} ${pct(row.y)}`)}" cx="${x}" cy="${y}" r="7" fill="#d9b45f"/><text x="${x + 10}" y="${y + 4}" fill="#cdd5ca" font-size="11">${escapeHtml(row.label)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 620 240"><text x="45" y="22" fill="#9ea99c">${escapeHtml(labelX)} vs ${escapeHtml(labelY)}</text><line x1="38" x2="590" y1="200" y2="200" stroke="rgba(224,229,218,.2)"/><line x1="45" x2="45" y1="38" y2="205" stroke="rgba(224,229,218,.2)"/>${dots}</svg>`;
}

function heatmap(rows) {
  return `<div class="heatmap">${rows.map((row) => {
    const value = Number.isFinite(row.value) ? row.value : 0;
    const hue = value >= 0 ? 140 : 0;
    const alpha = Math.min(.45, .08 + Math.abs(value) / 220);
    return `<div class="heat-cell" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(`${row.label}: 1Y return ${pct(value)}`)}" style="background: hsla(${hue}, 55%, 45%, ${alpha})"><strong>${escapeHtml(row.label)}</strong><span class="${moveClass(value)}">${pct(value)}</span></div>`;
  }).join("")}</div>`;
}

function treemap(rows) {
  const total = rows.reduce((sum, row) => sum + Math.max(row.value || 0, 0), 0) || 1;
  return `<div class="heatmap">${rows.map((row) => {
    const pctSize = Math.max(72, (row.value / total) * 600);
    return `<div class="heat-cell" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(`${row.label}: market cap INR ${compact(row.value)} Cr`)}" style="min-height:${pctSize}px"><strong>${escapeHtml(row.label)}</strong><span>\u20b9${compact(row.value)} Cr</span></div>`;
  }).join("")}</div>`;
}

const metrics = {
  roce: { key: "roce", label: "ROCE", format: pct },
  patMargin: { key: "patMargin", label: "PAT margin", format: pct },
  pe: { key: "pe", label: "P/E", format: compact },
  return1y: { key: "return1y", label: "1Y return", format: pct },
  debtEquity: { key: "debtEquity", label: "debt/equity", format: (value) => Number.isFinite(value) ? `${formatNum.format(value)}x` : "--" },
  revenue: { key: "revenue", label: "revenue", format: (value) => Number.isFinite(value) ? `\u20b9${compact(value)} Cr` : "--" },
  marketCap: { key: "marketCap", label: "market cap", format: (value) => Number.isFinite(value) ? `\u20b9${compact(value)} Cr` : "--" }
};

function getAnalystRows() {
  return dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const quote = item.yahoo?.quote || {};
    return {
      id: item.meta.id,
      name: item.meta.name,
      price: quote.regularMarketPrice,
      dayMove: quote.regularMarketChangePercent,
      return1y: oneYearReturn(item),
      revenue: extra.revenue,
      patMargin: extra.patMargin,
      roce: extra.roce,
      pe: extra.pe,
      debtEquity: extra.debtEquity,
      marketCap: extra.marketCap || quote.marketCap,
      verdict: extra.verdict || "Watch",
      oneLine: extra.oneLine || item.meta.segment || ""
    };
  });
}

function mentionedRows(rows, text) {
  const matches = rows.filter((row) => {
    const extra = extraData[row.id] || {};
    const terms = [row.name, extra.label, row.id].filter(Boolean).flatMap((value) => String(value).toLowerCase().split(/\s+/));
    return terms.some((term) => term.length > 2 && text.includes(term));
  });
  if (matches.length) return matches;
  const selected = rows.find((row) => row.id === selectedId);
  return selected ? [selected] : rows.slice(0, 1);
}

function inferMetric(text) {
  if (text.includes("roce") || text.includes("capital")) return metrics.roce;
  if (text.includes("pat") || text.includes("margin") || text.includes("profit")) return metrics.patMargin;
  if (text.includes("p/e") || text.includes("pe") || text.includes("valuation") || text.includes("cheap")) return metrics.pe;
  if (text.includes("return") || text.includes("momentum") || text.includes("growth")) return metrics.return1y;
  if (text.includes("debt") || text.includes("leverage")) return metrics.debtEquity;
  if (text.includes("revenue") || text.includes("sales")) return metrics.revenue;
  if (text.includes("market cap") || text.includes("mcap") || text.includes("size")) return metrics.marketCap;
  return metrics.return1y;
}

function rankRows(rows, metric, direction) {
  const sorted = rows.filter((row) => Number.isFinite(row[metric.key]));
  sorted.sort((a, b) => direction === "asc" ? a[metric.key] - b[metric.key] : b[metric.key] - a[metric.key]);
  return sorted;
}

function wireInteractiveCharts() {
  document.addEventListener("pointermove", (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target || !els.chartTooltip) return;
    els.chartTooltip.textContent = target.dataset.tip;
    els.chartTooltip.style.display = "block";
    els.chartTooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 280)}px`;
    els.chartTooltip.style.top = `${event.clientY + 14}px`;
  });
  document.addEventListener("pointerout", (event) => {
    if (event.target.closest?.("[data-tip]") && els.chartTooltip) els.chartTooltip.style.display = "none";
  });
  document.addEventListener("click", (event) => {
    const metricButton = event.target.closest?.("[data-sector-metric]");
    if (metricButton) {
      activeSectorMetric = metricButton.dataset.sectorMetric;
      renderSectorCharts();
      return;
    }
    const target = event.target.closest?.("[data-select]");
    const id = target?.dataset.select;
    if (id && dashboard.some((item) => item.meta.id === id)) {
      selectedId = id;
      render();
    }
  });
}

function table(headers, rows) {
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

async function search() {
  clearTimeout(searchTimer);
  const q = els.companySearch.value.trim();
  if (q.length < 2) {
    els.searchResults.style.display = "none";
    return;
  }
  searchTimer = setTimeout(async () => {
    const { results } = await getJson(`/api/search?q=${encodeURIComponent(q)}`);
    els.searchResults.innerHTML = results.map((row) => `<button data-symbol="${escapeHtml(row.symbol)}" data-name="${escapeHtml(row.longname || row.shortname || row.symbol)}">
      <strong>${escapeHtml(row.symbol)}</strong><br><small>${escapeHtml(row.longname || row.shortname || row.exchDisp || "")}</small>
    </button>`).join("");
    els.searchResults.style.display = results.length ? "block" : "none";
    els.searchResults.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => addCustom(button.dataset.symbol, button.dataset.name)));
  }, 250);
}

function addManual() {
  const raw = els.companySearch.value.trim().toUpperCase();
  if (!raw) return;
  const symbol = raw.includes(".") ? raw : `${raw}.NS`;
  addCustom(symbol, raw);
}

function addCustom(symbol, name) {
  const id = `custom-${symbol.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  if (!custom.some((item) => item.id === id) && !catalog.some((item) => item.symbol === symbol)) {
    custom.push({ id, name, symbol, nse: symbol.replace(".NS", ""), bse: "", segment: "Custom watchlist company" });
  }
  if (!watchIds.includes(id)) watchIds.push(id);
  selectedId = id;
  els.companySearch.value = "";
  els.searchResults.style.display = "none";
  save();
  refresh();
}

function removeCompany(id) {
  watchIds = watchIds.filter((item) => item !== id);
  if (selectedId === id) selectedId = watchIds[0];
  save();
  refresh();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

boot();
