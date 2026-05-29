import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 4173);
const ROOT = join(process.cwd(), "public");
const TTL = 60_000;
const cache = new Map();

const companies = [
  { id: "zentec", name: "Zen Technologies", symbol: "ZENTEC.NS", nse: "ZENTEC", bse: "533339", isin: "INE251B01027", segment: "Simulation, anti-drone and training systems" },
  { id: "ideaforge", name: "ideaForge Technology", symbol: "IDEAFORGE.NS", nse: "IDEAFORGE", bse: "543932", isin: "INE349Y01013", segment: "UAVs and drone platforms" },
  { id: "mtar", name: "MTAR Technologies", symbol: "MTARTECH.NS", nse: "MTARTECH", bse: "543270", isin: "INE864I01014", segment: "Precision engineering for aerospace, nuclear and clean energy" },
  { id: "datapatterns", name: "Data Patterns", symbol: "DATAPATTNS.NS", nse: "DATAPATTNS", bse: "543428", isin: "INE0IX101010", segment: "Defence electronics and radar systems" },
  { id: "azad", name: "Azad Engineering", symbol: "AZAD.NS", nse: "AZAD", bse: "544061", isin: "INE02IJ01035", segment: "Precision aerospace and turbine components" },
  { id: "aequs", name: "Aequs", symbol: "AEQUS.NS", nse: "AEQUS", bse: "544634", isin: "INE947N01017", segment: "Aerospace precision components" },
  { id: "paras", name: "Paras Defence", symbol: "PARAS.NS", nse: "PARAS", bse: "543367", isin: "INE045601023", segment: "Optics, defence electronics and space engineering" },
  { id: "astra", name: "Astra Microwave", symbol: "ASTRAMICRO.NS", nse: "ASTRAMICRO", bse: "532493", isin: "INE386C01029", segment: "RF, microwave and defence electronics" }
];

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function compactYahoo(value) {
  if (!value || typeof value !== "object") return value ?? null;
  if ("raw" in value) return value.raw;
  if ("fmt" in value) return value.fmt;
  return value;
}

function latestStatements(list = []) {
  return list.slice(0, 4).map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, compactYahoo(value)])
  ));
}

async function fetchJson(url, options = {}) {
  const key = url;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) return cached.data;
  const response = await fetch(url, {
    ...options,
    headers: {
      "accept": "application/json,text/plain,*/*",
      "user-agent": "Mozilla/5.0 DefenceDashboard/1.0",
      "referer": "https://www.bseindia.com/",
      "origin": "https://www.bseindia.com",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const data = await response.json();
  cache.set(key, { time: Date.now(), data });
  return data;
}

async function fetchText(url, options = {}) {
  const key = `text:${url}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) return cached.data;
  const response = await fetch(url, {
    ...options,
    headers: {
      "accept": "application/rss+xml,text/xml,text/html,text/plain,*/*",
      "user-agent": "Mozilla/5.0 DefenceDashboard/1.0",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const data = await response.text();
  cache.set(key, { time: Date.now(), data });
  return data;
}

function decodeXml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function yahooCompany(symbol) {
  const modules = [
    "price",
    "summaryDetail",
    "financialData",
    "defaultKeyStatistics",
    "incomeStatementHistory",
    "incomeStatementHistoryQuarterly",
    "balanceSheetHistory",
    "cashflowStatementHistory",
    "earningsTrend"
  ].join(",");
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  const json = await fetchJson(url, { headers: { origin: "https://finance.yahoo.com", referer: "https://finance.yahoo.com/" } });
  const result = json?.quoteSummary?.result?.[0] || {};
  const price = result.price || {};
  const detail = result.summaryDetail || {};
  const financial = result.financialData || {};
  const stats = result.defaultKeyStatistics || {};

  return {
    source: "Yahoo Finance",
    quote: {
      symbol,
      name: price.longName || price.shortName || symbol,
      currency: price.currency || "INR",
      exchange: price.exchangeName || price.exchange || "NSE",
      regularMarketPrice: compactYahoo(price.regularMarketPrice),
      regularMarketChange: compactYahoo(price.regularMarketChange),
      regularMarketChangePercent: compactYahoo(price.regularMarketChangePercent),
      regularMarketTime: compactYahoo(price.regularMarketTime),
      marketCap: compactYahoo(price.marketCap),
      volume: compactYahoo(price.regularMarketVolume),
      fiftyTwoWeekHigh: compactYahoo(detail.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: compactYahoo(detail.fiftyTwoWeekLow),
      trailingPE: compactYahoo(detail.trailingPE),
      forwardPE: compactYahoo(detail.forwardPE),
      dividendYield: compactYahoo(detail.dividendYield),
      beta: compactYahoo(stats.beta)
    },
    financials: {
      revenue: compactYahoo(financial.totalRevenue),
      grossMargins: compactYahoo(financial.grossMargins),
      operatingMargins: compactYahoo(financial.operatingMargins),
      profitMargins: compactYahoo(financial.profitMargins),
      ebitda: compactYahoo(financial.ebitda),
      totalDebt: compactYahoo(financial.totalDebt),
      totalCash: compactYahoo(financial.totalCash),
      currentRatio: compactYahoo(financial.currentRatio),
      returnOnEquity: compactYahoo(financial.returnOnEquity),
      targetMeanPrice: compactYahoo(financial.targetMeanPrice),
      incomeAnnual: latestStatements(result.incomeStatementHistory?.incomeStatementHistory),
      incomeQuarterly: latestStatements(result.incomeStatementHistoryQuarterly?.incomeStatementHistory),
      balanceAnnual: latestStatements(result.balanceSheetHistory?.balanceSheetStatements),
      cashflowAnnual: latestStatements(result.cashflowStatementHistory?.cashflowStatements),
      earningsTrend: result.earningsTrend?.trend?.slice(0, 5)?.map((row) => ({
        period: row.period,
        endDate: row.endDate,
        growth: compactYahoo(row.growth),
        revenueEstimate: compactYahoo(row.revenueEstimate?.avg),
        earningsEstimate: compactYahoo(row.earningsEstimate?.avg)
      })) || []
    }
  };
}

async function yahooChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const json = await fetchJson(url, { headers: { origin: "https://finance.yahoo.com", referer: "https://finance.yahoo.com/" } });
  const result = json?.chart?.result?.[0];
  const meta = result?.meta || {};
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const points = timestamps.map((time, index) => ({
    time,
    close: quote.close?.[index] ?? null,
    volume: quote.volume?.[index] ?? null
  })).filter((point) => Number.isFinite(point.close));
  return { meta, points };
}

async function yahooNews(meta) {
  const query = `"${meta.name}" ${meta.nse || meta.symbol} stock`;
  const json = await fetchJson(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=8`, {
    headers: { origin: "https://finance.yahoo.com", referer: "https://finance.yahoo.com/" }
  });
  const relevant = (json.news || []).filter((row) => isRelevantNews(meta, row));
  return relevant.slice(0, 8).map((row) => ({
    title: row.title || "Yahoo Finance news",
    publisher: row.publisher || "Yahoo Finance",
    date: row.providerPublishTime ? new Date(row.providerPublishTime * 1000).toISOString() : "",
    link: row.link || row.url || null,
    summary: row.summary || row.title || "",
    source: "Yahoo Finance news"
  }));
}

async function googleNews(meta) {
  const query = `"${meta.name}" OR "${meta.nse}" stock`;
  const rss = await fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`);
  const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8);
  return items.map((match) => {
    const item = match[1];
    const title = decodeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const link = decodeXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
    const date = decodeXml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
    const source = decodeXml(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "Google News");
    const description = decodeXml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || title);
    return {
      title: cleanNewsTitle(title, source),
      publisher: source,
      date: date ? new Date(date).toISOString() : "",
      link,
      summary: description || title,
      source: "Google News"
    };
  }).filter((row) => row.title && isRelevantNews(meta, row));
}

function cleanNewsTitle(title, source) {
  const clean = String(title || "").trim();
  const suffix = ` - ${source}`;
  return source && clean.endsWith(suffix) ? clean.slice(0, -suffix.length).trim() : clean;
}

async function companyNews(meta) {
  const [yahoo, google] = await Promise.allSettled([yahooNews(meta), googleNews(meta)]);
  const rows = [
    ...(yahoo.status === "fulfilled" ? yahoo.value : []),
    ...(google.status === "fulfilled" ? google.value : [])
  ];
  const seen = new Set();
  return rows.filter((row) => {
    const key = String(row.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 10);
}

function isRelevantNews(meta, row) {
  const generic = new Set(["limited", "ltd", "technologies", "technology", "engineering", "defence", "defense", "india", "micro", "systems", "products"]);
  const haystack = `${row.title || ""} ${row.summary || ""} ${row.publisher || ""}`.toLowerCase();
  const fullName = String(meta.name || "").toLowerCase();
  const symbol = String(meta.symbol || "").replace(/\..+$/, "").toLowerCase();
  const ticker = String(meta.nse || "").toLowerCase();
  if (fullName && haystack.includes(fullName)) return true;
  if (ticker && haystack.includes(ticker)) return true;
  if (symbol && haystack.includes(symbol)) return true;
  const nameTokens = fullName.split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !generic.has(term));
  if (nameTokens.length === 1) return haystack.includes(nameTokens[0]);
  return nameTokens.length > 1 && nameTokens.filter((term) => haystack.includes(term)).length >= 2;
}

function yahooFromChart(symbol, chartResult) {
  const meta = chartResult?.meta || {};
  const points = chartResult?.points || [];
  const latestPoint = points.at(-1);
  const previousPoint = points.at(-2);
  const previous = meta.previousClose || previousPoint?.close || meta.chartPreviousClose;
  const price = meta.regularMarketPrice ?? latestPoint?.close ?? null;
  const change = Number.isFinite(price) && Number.isFinite(previous) ? price - previous : null;
  const changePercent = Number.isFinite(change) && previous ? (change / previous) * 100 : null;
  const closes = points.map((point) => point.close).filter(Number.isFinite);
  return {
    source: "Yahoo Finance chart",
    quote: {
      symbol,
      name: meta.longName || meta.shortName || symbol,
      currency: meta.currency || "INR",
      exchange: meta.exchangeName || meta.fullExchangeName || "NSE",
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      regularMarketTime: meta.regularMarketTime || null,
      marketCap: null,
      volume: meta.regularMarketVolume || latestPoint?.volume || null,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || (closes.length ? Math.max(...closes) : null),
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || (closes.length ? Math.min(...closes) : null),
      trailingPE: null,
      forwardPE: null,
      dividendYield: null,
      beta: null
    },
    financials: {
      revenue: null,
      grossMargins: null,
      operatingMargins: null,
      profitMargins: null,
      ebitda: null,
      totalDebt: null,
      totalCash: null,
      currentRatio: null,
      returnOnEquity: null,
      targetMeanPrice: null,
      incomeAnnual: [],
      incomeQuarterly: [],
      balanceAnnual: [],
      cashflowAnnual: [],
      earningsTrend: []
    }
  };
}

async function bseAnnouncements(scrip) {
  const today = new Date();
  const from = new Date(today);
  from.setMonth(today.getMonth() - 12);
  const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const url = new URL("https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w");
  url.search = new URLSearchParams({
    pageno: "1",
    strCat: "-1",
    strPrevDate: fmt(from),
    strScrip: scrip,
    strSearch: "P",
    strToDate: fmt(today),
    strType: "C",
    subcategory: "-1"
  });
  const json = await fetchJson(url.toString());
  const rows = json?.Table || json?.table || [];
  return rows.slice(0, 14).map((row) => ({
    title: row.NEWSSUB || row.HEADLINE || row.CATEGORYNAME || "Announcement",
    category: row.CATEGORYNAME || row.SUBCATNAME || "BSE filing",
    date: row.NEWS_DT || row.DT_TM || row.DISSEM_DT || "",
    attachment: row.ATTACHMENTNAME ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${row.ATTACHMENTNAME}` : null,
    notes: row.MORE || row.NEWSBODY || ""
  }));
}

async function companyPayload(meta) {
  const [chart, richYahoo, bse, news] = await Promise.allSettled([
    yahooChart(meta.symbol),
    yahooCompany(meta.symbol),
    bseAnnouncements(meta.bse),
    companyNews(meta)
  ]);
  const chartValue = chart.status === "fulfilled" ? chart.value : { meta: {}, points: [] };
  const yahooValue = richYahoo.status === "fulfilled" ? richYahoo.value : yahooFromChart(meta.symbol, chartValue);
  return {
    meta,
    yahoo: yahooValue,
    chart: chartValue.points,
    bse: bse.status === "fulfilled" ? bse.value : [],
    news: news.status === "fulfilled" ? news.value : [],
    refreshedAt: new Date().toISOString()
  };
}

async function routeApi(req, res, url) {
  if (url.pathname === "/api/companies") return send(res, 200, { companies });
  if (url.pathname === "/api/dashboard") {
    const ids = (url.searchParams.get("ids") || companies.map((c) => c.id).join(",")).split(",").filter(Boolean);
    const selected = ids.map((id) => companies.find((c) => c.id === id) || companies.find((c) => c.nse === id.toUpperCase())).filter(Boolean);
    const data = await Promise.all(selected.map(companyPayload));
    return send(res, 200, { data, refreshedAt: new Date().toISOString() });
  }
  if (url.pathname === "/api/company") {
    const symbol = url.searchParams.get("symbol");
    const bse = url.searchParams.get("bse") || "";
    const name = url.searchParams.get("name") || symbol;
    if (!symbol) return send(res, 400, { error: "symbol is required" });
    return send(res, 200, await companyPayload({ id: symbol.toLowerCase(), name, symbol, nse: symbol.replace(".NS", ""), bse, segment: "Custom watchlist company" }));
  }
  if (url.pathname === "/api/search") {
    const q = url.searchParams.get("q") || "";
    if (q.length < 2) return send(res, 200, { results: [] });
    const json = await fetchJson(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`, {
      headers: { origin: "https://finance.yahoo.com", referer: "https://finance.yahoo.com/" }
    });
    return send(res, 200, { results: (json.quotes || []).filter((x) => x.symbol).slice(0, 8) });
  }
  if (url.pathname === "/api/news") {
    const id = url.searchParams.get("id") || "";
    const meta = companies.find((c) => c.id === id || c.symbol === id || c.nse === id.toUpperCase());
    if (!meta) return send(res, 404, { error: "Unknown company" });
    const [news, bse] = await Promise.allSettled([companyNews(meta), bseAnnouncements(meta.bse)]);
    return send(res, 200, {
      meta,
      news: news.status === "fulfilled" ? news.value : [],
      bse: bse.status === "fulfilled" ? bse.value : [],
      refreshedAt: new Date().toISOString()
    });
  }
  return send(res, 404, { error: "Unknown API endpoint" });
}

async function routeStatic(req, res, url) {
  const target = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const file = normalize(join(ROOT, target));
  if (!file.startsWith(ROOT)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": mime[extname(file)] || "application/octet-stream",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      "pragma": "no-cache",
      "expires": "0"
    });
    res.end(body);
  } catch {
    send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await routeApi(req, res, url);
    return await routeStatic(req, res, url);
  } catch (error) {
    send(res, 502, { error: error.message || "Upstream data request failed" });
  }
}).listen(PORT, () => {
  console.log(`Defence finance dashboard running at http://localhost:${PORT}`);
});
