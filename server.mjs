import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 4173);
const ROOT = join(process.cwd(), "public");
const TTL = 60_000;
const TRANSCRIPT_TTL = 15 * 60_000;
const SCHEDULE_TTL = 5 * 60_000;
const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "openai";
const cache = new Map();
const transcriptCache = new Map();
const scheduleCache = new Map();

const companies = [
  { id: "zentec", name: "Zen Technologies", symbol: "ZENTEC.NS", nse: "ZENTEC", bse: "533339", isin: "INE251B01027", segment: "Simulation, anti-drone and training systems", moneycontrol: "https://www.moneycontrol.com/financials/zentechnologies/consolidated-profit-lossVI/zt01" },
  { id: "ideaforge", name: "ideaForge Technology", symbol: "IDEAFORGE.NS", nse: "IDEAFORGE", bse: "543932", isin: "INE349Y01013", segment: "UAVs and drone platforms", moneycontrol: "https://www.moneycontrol.com/financials/ideaforgetechnology/consolidated-profit-lossVI/IT07" },
  { id: "mtar", name: "MTAR Technologies", symbol: "MTARTECH.NS", nse: "MTARTECH", bse: "543270", isin: "INE864I01014", segment: "Precision engineering for aerospace, nuclear and clean energy", moneycontrol: "https://www.moneycontrol.com/financials/mtartechnologies/consolidated-profit-lossVI/MT15" },
  { id: "datapatterns", name: "Data Patterns", symbol: "DATAPATTNS.NS", nse: "DATAPATTNS", bse: "543428", isin: "INE0IX101010", segment: "Defence electronics and radar systems", moneycontrol: "https://www.moneycontrol.com/financials/datapatternsindia/consolidated-profit-lossVI/DPI01" },
  { id: "azad", name: "Azad Engineering", symbol: "AZAD.NS", nse: "AZAD", bse: "544061", isin: "INE02IJ01035", segment: "Precision aerospace and turbine components", moneycontrol: "https://www.moneycontrol.com/financials/azadengineering/consolidated-profit-lossVI/AEL02" },
  { id: "aequs", name: "Aequs", symbol: "AEQUS.NS", nse: "AEQUS", bse: "544634", isin: "INE947N01017", segment: "Aerospace precision components", moneycontrol: "https://www.moneycontrol.com/financials/aequsltd/consolidated-profit-lossVI/AL16" },
  { id: "paras", name: "Paras Defence", symbol: "PARAS.NS", nse: "PARAS", bse: "543367", isin: "INE045601023", segment: "Optics, defence electronics and space engineering", moneycontrol: "https://www.moneycontrol.com/financials/parasdefenceandspacetechnologies/consolidated-profit-lossVI/PDS01" },
  { id: "astra", name: "Astra Microwave", symbol: "ASTRAMICRO.NS", nse: "ASTRAMICRO", bse: "532493", isin: "INE386C01029", segment: "RF, microwave and defence electronics", moneycontrol: "https://www.moneycontrol.com/financials/astramicrowaveproducts/consolidated-profit-lossVI/AMP01" }
];

const auditedMetrics = {
  zentec: { period: "FY26", revenue: 687.69, ebitda: 332.7, pat: 193.45, ebitdaMargin: 48.37, grossMargin: 69.3, source: "NSE/BSE Q4 FY26 investor presentation filed 3 May 2026" },
  ideaforge: { period: "FY26", revenue: 226.1, pat: -17.0, ebitda: 27.1, ebitdaMargin: 12.0, grossMargin: 58.0, source: "NSE Q4 FY26 press release filed 30 Apr 2026" },
  mtar: { period: "FY26", revenue: 876.2, pat: 94.0, ebitda: 171.2, ebitdaMargin: 19.5, source: "Company Q4 FY26 results release / BSE filing dated 12 May 2026" },
  datapatterns: { period: "FY26", revenue: 924.8, pat: 271.4, ebitda: 371.0, ebitdaMargin: 40.1, patMargin: 29.3, receivableDays: 287, inventoryDays: 294, payableDays: 82, source: "Data Patterns Q4 FY26 earnings transcript / Screener FY26 consolidated ratios" },
  azad: { period: "FY26", revenue: 602.98, ebitda: 225.31, pat: 133.56, ebitdaMargin: 37.4, patMargin: 22.1, source: "Audited FY26 consolidated results filed 15 May 2026" },
  aequs: { period: "FY26", revenue: 1230.4, pat: -113.3, ebitda: 154.5, ebitdaMargin: 12.6, patMargin: -9.2, source: "Company FY26 press release dated 26 May 2026" },
  paras: { period: "FY26", revenue: 476.57, pat: 89.46, ebitda: 120.46, ebitdaMargin: 25.3, patMargin: 18.8, source: "Company Q4 FY26 results release / BSE filing dated 13 May 2026" },
  astra: { period: "FY26", revenue: 1162.8, ebitda: 334.0, pat: 192.97, ebitdaMargin: 28.7, patMargin: 16.6, source: "Company audited FY26 results dated 26 May 2026" }
};

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

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
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

function moneycontrolUrl(meta, section) {
  if (!meta.moneycontrol) return "";
  return meta.moneycontrol
    .replace(/consolidated-profit-lossVI/i, section)
    .replace(/profit-lossVI/i, section);
}

function moneycontrolQuoteUrl(meta) {
  const match = String(meta.moneycontrol || "").match(/\/financials\/([^/]+)\/[^/]+\/([^/?#]+)/i);
  if (!match) return "";
  return `https://www.moneycontrol.com/india/stockpricequote/any/${match[1]}/${match[2].toUpperCase()}`;
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

function stripHtml(value = "") {
  return decodeXml(String(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " "));
}

function parseMoneyNumber(value) {
  const clean = stripHtml(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!clean || clean === "-" || clean === ".") return null;
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function parseMoneycontrolRow(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<tr[^>]*>[\\s\\S]*?<td[^>]*>\\s*${escaped}\\s*<\\/td>([\\s\\S]*?)<\\/tr>`, "i"));
  if (!match) return [];
  return [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => parseMoneyNumber(cell[1])).filter((value) => value !== null);
}

function parseMoneycontrolHeaders(html) {
  const seen = new Set();
  return [...html.matchAll(/<td[^>]*>\s*(Mar\s+\d{2})\s*<\/td>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((text) => {
      const key = text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

async function moneycontrolFinancials(meta) {
  if (!meta.moneycontrol) return null;
  const [plResult, bsResult, cfResult] = await Promise.allSettled([
    fetchText(meta.moneycontrol, { headers: { referer: "https://www.moneycontrol.com/" } }),
    fetchText(moneycontrolUrl(meta, "consolidated-balance-sheetVI"), { headers: { referer: "https://www.moneycontrol.com/" } }),
    fetchText(moneycontrolUrl(meta, "consolidated-cash-flowVI"), { headers: { referer: "https://www.moneycontrol.com/" } })
  ]);
  const html = plResult.status === "fulfilled" ? plResult.value : "";
  const balanceHtml = bsResult.status === "fulfilled" ? bsResult.value : "";
  const cashHtml = cfResult.status === "fulfilled" ? cfResult.value : "";
  if (/Data Not Available for Profit\s*&amp;\s*Loss/i.test(html)) {
    return { source: "Moneycontrol consolidated P&L", url: meta.moneycontrol, available: false, reason: "Data not available" };
  }
  const years = parseMoneycontrolHeaders(html);
  const revenue = parseMoneycontrolRow(html, "Revenue From Operations [Gross]");
  const operatingRevenue = parseMoneycontrolRow(html, "Total Operating Revenues");
  const pat = parseMoneycontrolRow(html, "Consolidated Profit/Loss After MI And Associates");
  const pbt = parseMoneycontrolRow(html, "Profit/Loss Before Tax");
  const financeCosts = parseMoneycontrolRow(html, "Finance Costs");
  const depreciation = parseMoneycontrolRow(html, "Depreciation And Amortisation Expenses");
  const totalAssets = parseMoneycontrolRow(balanceHtml, "Total Assets");
  const shareCapital = parseMoneycontrolRow(balanceHtml, "Total Share Capital");
  const reserves = parseMoneycontrolRow(balanceHtml, "Total Reserves and Surplus");
  const longBorrowings = parseMoneycontrolRow(balanceHtml, "Long Term Borrowings");
  const shortBorrowings = parseMoneycontrolRow(balanceHtml, "Short Term Borrowings");
  const currentLiabilities = parseMoneycontrolRow(balanceHtml, "Total Current Liabilities");
  const inventories = parseMoneycontrolRow(balanceHtml, "Inventories");
  const receivables = parseMoneycontrolRow(balanceHtml, "Trade Receivables");
  const payables = parseMoneycontrolRow(balanceHtml, "Trade Payables");
  const cfo = parseMoneycontrolRow(cashHtml, "Net CashFlow From Operating Activities");
  const investing = parseMoneycontrolRow(cashHtml, "Net Cash Used In Investing Activities");
  const byIndex = (fn) => years.map((_, index) => {
    const value = fn(index);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  });
  const baseRevenue = revenue.length ? revenue : operatingRevenue;
  const roce = byIndex((index) => {
    const capitalEmployed = totalAssets[index] - currentLiabilities[index];
    const ebit = pbt[index] + financeCosts[index];
    return capitalEmployed > 0 ? (ebit / capitalEmployed) * 100 : NaN;
  });
  const ebitda = byIndex((index) => pbt[index] + financeCosts[index] + depreciation[index]);
  const ebitdaMargin = byIndex((index) => baseRevenue[index] > 0 ? ((pbt[index] + financeCosts[index] + depreciation[index]) / baseRevenue[index]) * 100 : NaN);
  const patMargin = byIndex((index) => baseRevenue[index] > 0 ? (pat[index] / baseRevenue[index]) * 100 : NaN);
  const roa = byIndex((index) => totalAssets[index] > 0 ? (pat[index] / totalAssets[index]) * 100 : NaN);
  const roe = byIndex((index) => {
    const equity = shareCapital[index] + reserves[index];
    return equity > 0 ? (pat[index] / equity) * 100 : NaN;
  });
  const debtEquity = byIndex((index) => {
    const equity = shareCapital[index] + reserves[index];
    const debt = longBorrowings[index] + shortBorrowings[index];
    return equity > 0 ? debt / equity : NaN;
  });
  const fcf = byIndex((index) => Number.isFinite(cfo[index]) && Number.isFinite(investing[index]) ? cfo[index] + investing[index] : NaN);
  const receivableDays = byIndex((index) => baseRevenue[index] > 0 ? (receivables[index] / baseRevenue[index]) * 365 : NaN);
  const inventoryDays = byIndex((index) => baseRevenue[index] > 0 ? (inventories[index] / baseRevenue[index]) * 365 : NaN);
  const payableDays = byIndex((index) => baseRevenue[index] > 0 ? (payables[index] / baseRevenue[index]) * 365 : NaN);
  const latest = {
    period: years[0] ? `FY${years[0].slice(-2)}` : "latest consolidated year",
    revenue: revenue[0] ?? operatingRevenue[0] ?? null,
    operatingRevenue: operatingRevenue[0] ?? null,
    pat: pat[0] ?? null,
    ebitda: ebitda[0],
    ebitdaMargin: ebitdaMargin[0],
    patMargin: patMargin[0],
    roce: roce[0],
    roe: roe[0],
    roa: roa[0],
    debtEquity: debtEquity[0],
    fcf: fcf[0],
    receivableDays: receivableDays[0],
    inventoryDays: inventoryDays[0],
    payableDays: payableDays[0]
  };
  return {
    source: "Moneycontrol consolidated financial statements",
    url: meta.moneycontrol,
    available: Number.isFinite(latest.revenue) || Number.isFinite(latest.pat),
    latest,
    years,
    rows: {
      revenue,
      operatingRevenue,
      pat,
      pbt,
      financeCosts,
      depreciation,
      ebitda,
      ebitdaMargin,
      patMargin,
      totalAssets,
      shareCapital,
      reserves,
      longBorrowings,
      shortBorrowings,
      currentLiabilities,
      inventories,
      receivables,
      payables,
      cfo,
      investing,
      roce,
      roe,
      roa,
      debtEquity,
      fcf,
      receivableDays,
      inventoryDays,
      payableDays
    }
  };
}

async function yahooSimpleQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const json = await fetchJson(url, { headers: { origin: "https://finance.yahoo.com", referer: "https://finance.yahoo.com/" } });
  const row = json?.quoteResponse?.result?.[0] || {};
  return {
    source: "Yahoo Finance quote",
    quote: {
      symbol,
      name: row.longName || row.shortName || symbol,
      currency: row.currency || "INR",
      exchange: row.fullExchangeName || row.exchange || "NSE",
      regularMarketPrice: row.regularMarketPrice ?? null,
      regularMarketChange: row.regularMarketChange ?? null,
      regularMarketChangePercent: row.regularMarketChangePercent ?? null,
      regularMarketTime: row.regularMarketTime ?? null,
      marketCap: row.marketCap ?? null,
      volume: row.regularMarketVolume ?? row.averageDailyVolume3Month ?? null,
      fiftyTwoWeekHigh: row.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: row.fiftyTwoWeekLow ?? null,
      trailingPE: row.trailingPE ?? row.forwardPE ?? null,
      forwardPE: row.forwardPE ?? null,
      dividendYield: row.trailingAnnualDividendYield ?? null,
      beta: null
    }
  };
}

function parseMetricAfterLabel(text, labelPattern) {
  const match = text.match(new RegExp(`${labelPattern}\\s+(-?[\\d,.]+)`, "i"));
  return match ? parseMoneyNumber(match[1]) : null;
}

function parseMoneycontrolOverviewSeries(html, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`"heading"\\s*:\\s*"${escaped}"\\s*,\\s*"data"\\s*:\\s*(\\[[\\s\\S]*?\\])`, "i"));
  if (!match) return [];
  try {
    return JSON.parse(match[1]).map((row) => ({
      year: row.year ? `Mar ${String(row.year).slice(-2)}` : "",
      value: Number(row.value)
    })).filter((row) => row.year && Number.isFinite(row.value));
  } catch {
    return [];
  }
}

async function moneycontrolQuote(meta) {
  const url = moneycontrolQuoteUrl(meta);
  if (!url) return null;
  const html = await fetchText(url, { headers: { referer: "https://www.moneycontrol.com/" } });
  const text = stripHtml(html).replace(/\s+/g, " ");
  const marketCap = parseMetricAfterLabel(text, "Mkt Cap \\(Rs\\. Cr\\.\\)");
  const dividendYield = parseMetricAfterLabel(text, "Dividend Yield");
  const bookValue = parseMetricAfterLabel(text, "Book Value Per Share");
  const beta = parseMetricAfterLabel(text, "Beta");
  const high = parseMetricAfterLabel(text, "High");
  const low = parseMetricAfterLabel(text, "Low");
  return {
    source: "Moneycontrol live quote",
    url,
    quote: {
      marketCap: Number.isFinite(marketCap) ? marketCap * 1e7 : null,
      dividendYield,
      beta,
      fiftyTwoWeekHigh: high,
      fiftyTwoWeekLow: low,
      bookValue
    },
    overview: {
      revenue: parseMoneycontrolOverviewSeries(html, "Revenue"),
      pat: parseMoneycontrolOverviewSeries(html, "Net Profit"),
      roe: parseMoneycontrolOverviewSeries(html, "ROE"),
      debtEquity: parseMoneycontrolOverviewSeries(html, "Debt to Equity")
    }
  };
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

async function yahooTimeseriesFinancials(symbol) {
  const types = [
    "annualTotalRevenue",
    "annualNetIncome",
    "annualEBITDA",
    "annualTotalAssets",
    "annualStockholdersEquity",
    "annualTotalDebt",
    "annualCashCashEquivalentsAndShortTermInvestments",
    "annualBasicAverageShares",
    "annualDilutedAverageShares",
    "annualOperatingCashFlow",
    "annualCapitalExpenditure",
    "annualAccountsReceivable",
    "annualInventory",
    "annualAccountsPayable"
  ];
  const period2 = Math.floor(Date.now() / 1000) + 86400;
  const period1 = period2 - (11 * 365 * 24 * 60 * 60);
  const params = new URLSearchParams({
    symbol,
    type: types.join(","),
    period1: String(period1),
    period2: String(period2)
  });
  const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?${params}`;
  const json = await fetchJson(url, { headers: { origin: "https://finance.yahoo.com", referer: "https://finance.yahoo.com/" } });
  const rows = json?.timeseries?.result || [];
  const byType = new Map();
  for (const row of rows) {
    const type = row?.meta?.type?.[0];
    if (type && Array.isArray(row[type])) byType.set(type, row[type]);
  }
  const yearSet = new Map();
  for (const entries of byType.values()) {
    for (const entry of entries) {
      const asOfDate = entry?.asOfDate || "";
      const year = Number(String(asOfDate).slice(0, 4));
      if (Number.isFinite(year)) yearSet.set(`FY${String(year).slice(-2)}`, year);
    }
  }
  const years = [...yearSet.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label).slice(0, 6);
  const toCr = (value) => Number.isFinite(value) ? value / 1e7 : null;
  const metric = (type) => {
    const map = new Map((byType.get(type) || []).map((entry) => {
      const asOfDate = entry?.asOfDate || "";
      const year = Number(String(asOfDate).slice(0, 4));
      return [`FY${String(year).slice(-2)}`, compactYahoo(entry?.reportedValue)];
    }));
    return years.map((year) => toCr(map.get(year)));
  };
  const ratioRows = (fn) => years.map((_, index) => {
    const value = fn(index);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  });
  const byIndex = (fn) => years.map((_, index) => {
    const value = fn(index);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  });
  const revenue = metric("annualTotalRevenue");
  const pat = metric("annualNetIncome");
  const ebitda = metric("annualEBITDA");
  const totalAssets = metric("annualTotalAssets");
  const equity = metric("annualStockholdersEquity");
  const debt = metric("annualTotalDebt");
  const cash = metric("annualCashCashEquivalentsAndShortTermInvestments");
  const shares = years.map((year) => {
    const basicMap = new Map((byType.get("annualBasicAverageShares") || []).map((entry) => {
      const asOfDate = entry?.asOfDate || "";
      const fy = `FY${String(Number(String(asOfDate).slice(0, 4))).slice(-2)}`;
      return [fy, compactYahoo(entry?.reportedValue)];
    }));
    const dilutedMap = new Map((byType.get("annualDilutedAverageShares") || []).map((entry) => {
      const asOfDate = entry?.asOfDate || "";
      const fy = `FY${String(Number(String(asOfDate).slice(0, 4))).slice(-2)}`;
      return [fy, compactYahoo(entry?.reportedValue)];
    }));
    const value = basicMap.get(year) ?? dilutedMap.get(year);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  });
  const cfo = metric("annualOperatingCashFlow");
  const capex = metric("annualCapitalExpenditure");
  const receivables = metric("annualAccountsReceivable");
  const inventories = metric("annualInventory");
  const payables = metric("annualAccountsPayable");
  const ebitdaMargin = ratioRows((index) => revenue[index] > 0 ? (ebitda[index] / revenue[index]) * 100 : NaN);
  const patMargin = ratioRows((index) => revenue[index] > 0 ? (pat[index] / revenue[index]) * 100 : NaN);
  const roe = ratioRows((index) => equity[index] > 0 ? (pat[index] / equity[index]) * 100 : NaN);
  const roa = ratioRows((index) => totalAssets[index] > 0 ? (pat[index] / totalAssets[index]) * 100 : NaN);
  const debtEquity = ratioRows((index) => equity[index] > 0 ? debt[index] / equity[index] : NaN);
  const fcf = byIndex((index) => Number.isFinite(cfo[index]) && Number.isFinite(capex[index]) ? cfo[index] + capex[index] : NaN);
  const receivableDays = ratioRows((index) => revenue[index] > 0 ? (receivables[index] / revenue[index]) * 365 : NaN);
  const inventoryDays = ratioRows((index) => revenue[index] > 0 ? (inventories[index] / revenue[index]) * 365 : NaN);
  const payableDays = ratioRows((index) => revenue[index] > 0 ? (payables[index] / revenue[index]) * 365 : NaN);
  if (!revenue.some(Number.isFinite) && !pat.some(Number.isFinite)) return null;
  return {
    source: "Yahoo Finance annual fundamentals",
    url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/financials/`,
    available: true,
    latest: {
      period: years[0] || "latest annual year",
      revenue: revenue[0],
      pat: pat[0],
      ebitda: ebitda[0],
      ebitdaMargin: ebitdaMargin[0],
      patMargin: patMargin[0],
      roe: roe[0],
      roa: roa[0],
      debtEquity: debtEquity[0],
      debt: debt[0],
      cash: cash[0],
      shares: shares[0],
      fcf: fcf[0],
      receivableDays: receivableDays[0],
      inventoryDays: inventoryDays[0],
      payableDays: payableDays[0]
    },
    years,
    rows: {
      revenue,
      pat,
      ebitda,
      ebitdaMargin,
      patMargin,
      roe,
      roa,
      debtEquity,
      debt,
      cash,
      shares,
      fcf,
      totalAssets,
      receivableDays,
      inventoryDays,
      payableDays
    }
  };
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

async function sectorNews(ids = []) {
  const selected = (ids.length ? ids : companies.map((company) => company.id))
    .map((id) => companies.find((company) => company.id === id || company.nse === String(id).toUpperCase() || company.symbol === id))
    .filter(Boolean);
  const results = await Promise.allSettled(selected.map(async (meta) => {
    const rows = await companyNews(meta);
    return rows.map((row) => ({
      company: meta.name,
      symbol: meta.symbol,
      title: row.title,
      publisher: row.publisher || row.source || "Live news",
      date: row.date,
      link: row.link,
      summary: row.summary || row.title || "",
      source: row.source || "Live news"
    }));
  }));
  const seen = new Set();
  return results
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((row) => {
      const key = String(row.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 24);
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

function isTranscriptLike(row = {}) {
  const text = `${row.title || ""} ${row.category || ""} ${row.notes || ""} ${row.attachment || ""}`.toLowerCase();
  return [
    "transcript",
    "earnings call",
    "conference call",
    "investor call",
    "analyst",
    "investor presentation",
    "audio recording",
    "financial result",
    "press release"
  ].some((term) => text.includes(term));
}

function parseDate(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const match = String(value).match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!match) return 0;
  return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

const monthNames = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

function fiscalPeriodForDate(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const fy = month >= 3 ? year + 1 : year;
  if (month >= 3 && month <= 5) return `Q1 FY${String(fy).slice(-2)}`;
  if (month >= 6 && month <= 8) return `Q2 FY${String(fy).slice(-2)}`;
  if (month >= 9 && month <= 11) return `Q3 FY${String(fy).slice(-2)}`;
  return `Q4 FY${String(fy).slice(-2)}`;
}

function formatScheduleDate(date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, " ");
}

function scheduleKeywords(text = "") {
  const clean = String(text).toLowerCase();
  const isResultRelated = [
    "financial result",
    "financial results",
    "unaudited result",
    "audited result",
    "quarterly result",
    "results",
    "board meeting"
  ].some((term) => clean.includes(term));
  const isCallRelated = [
    "earnings call",
    "conference call",
    "investor call",
    "analyst call",
    "analysts/investors",
    "investor meet",
    "investors meet"
  ].some((term) => clean.includes(term));
  return { isResultRelated, isCallRelated, matches: isResultRelated || isCallRelated };
}

function extractFutureDates(text = "", base = new Date()) {
  const dates = [];
  const add = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return;
    const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    if (normalized >= today && !dates.some((item) => item.getTime() === normalized.getTime())) dates.push(normalized);
  };
  const source = String(text || "").replace(/\s+/g, " ");
  for (const match of source.matchAll(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/g)) {
    add(new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  }
  for (const match of source.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})[,\s]+(20\d{2})\b/g)) {
    const month = monthNames[match[2].toLowerCase()];
    if (month !== undefined) add(new Date(Number(match[3]), month, Number(match[1])));
  }
  for (const match of source.matchAll(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/g)) {
    const month = monthNames[match[1].toLowerCase()];
    if (month !== undefined) add(new Date(Number(match[3]), month, Number(match[2])));
  }
  return dates.sort((a, b) => a - b);
}

function scheduleCandidateFromRow(meta, row, kind = "filing") {
  const text = `${row.title || ""} ${row.category || ""} ${row.notes || ""} ${row.summary || ""}`;
  const flags = scheduleKeywords(text);
  if (!flags.matches) return null;
  const dates = extractFutureDates(text);
  if (!dates.length) return null;
  const date = dates[0];
  return {
    companyId: meta.id,
    company: meta.name,
    symbol: meta.nse || meta.symbol,
    callDate: formatScheduleDate(date),
    dateIso: date.toISOString(),
    period: fiscalPeriodForDate(date),
    eventType: flags.isCallRelated ? "Earnings call / investor meet" : "Results / board meeting",
    status: "Announced",
    source: row.category || row.publisher || row.source || (kind === "filing" ? "BSE filing" : "Live news"),
    title: row.title || "Schedule announcement",
    link: row.attachment || row.link || "https://www.bseindia.com/corporates/ann.html",
    refreshedAt: new Date().toISOString()
  };
}

async function upcomingSchedule(meta) {
  const key = `schedule:${meta.id}:${meta.symbol}:${meta.bse || ""}`;
  const cached = scheduleCache.get(key);
  if (cached && Date.now() - cached.time < SCHEDULE_TTL) return cached.data;
  const sources = await Promise.allSettled([
    meta.bse ? bseAnnouncements(meta.bse) : Promise.resolve([]),
    companyNews(meta)
  ]);
  const bse = sources[0].status === "fulfilled" ? sources[0].value : [];
  const news = sources[1].status === "fulfilled" ? sources[1].value : [];
  const candidates = [
    ...bse.map((row) => scheduleCandidateFromRow(meta, row, "filing")),
    ...news.map((row) => scheduleCandidateFromRow(meta, row, "news"))
  ].filter(Boolean).sort((a, b) => parseDate(a.dateIso) - parseDate(b.dateIso));
  const data = candidates[0] || {
    companyId: meta.id,
    company: meta.name,
    symbol: meta.nse || meta.symbol,
    callDate: "-",
    dateIso: null,
    period: "-",
    eventType: "-",
    status: "Not announced",
    source: "-",
    title: "No upcoming results/call date announced in latest BSE/Yahoo/news scan",
    link: meta.bse ? "https://www.bseindia.com/corporates/ann.html" : `https://finance.yahoo.com/quote/${meta.symbol}`,
    refreshedAt: new Date().toISOString()
  };
  scheduleCache.set(key, { time: Date.now(), data });
  return data;
}

async function transcriptCandidates(meta) {
  const key = `transcripts:${meta.id}`;
  const cached = transcriptCache.get(key);
  if (cached && Date.now() - cached.time < TRANSCRIPT_TTL) return cached.data;
  const [bse, news] = await Promise.allSettled([bseAnnouncements(meta.bse), companyNews(meta)]);
  const filings = (bse.status === "fulfilled" ? bse.value : []).filter(isTranscriptLike).map((row) => ({
    title: row.title,
    date: row.date,
    source: row.category || "BSE filing",
    link: row.attachment || "https://www.bseindia.com/corporates/ann.html",
    summary: row.notes || row.title || "",
    kind: "filing"
  }));
  const articles = (news.status === "fulfilled" ? news.value : []).filter(isTranscriptLike).map((row) => ({
    title: row.title,
    date: row.date,
    source: row.publisher || row.source || "News",
    link: row.link,
    summary: row.summary || row.title || "",
    kind: "news"
  }));
  const data = [...filings, ...articles]
    .filter((row) => row.title)
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 8);
  transcriptCache.set(key, { time: Date.now(), data });
  return data;
}

function deterministicTranscriptSummary(meta, latest, metrics) {
  const period = metrics?.period || "latest reported period";
  const metricBits = [];
  if (Number.isFinite(metrics?.revenue)) metricBits.push(`revenue Rs ${metrics.revenue}cr`);
  if (Number.isFinite(metrics?.ebitda)) metricBits.push(`EBITDA Rs ${metrics.ebitda}cr`);
  if (Number.isFinite(metrics?.ebitdaMargin)) metricBits.push(`EBITDA margin ${metrics.ebitdaMargin}%`);
  if (Number.isFinite(metrics?.pat)) metricBits.push(`PAT Rs ${metrics.pat}cr`);
  if (Number.isFinite(metrics?.patMargin)) metricBits.push(`PAT margin ${metrics.patMargin}%`);
  const metricText = metricBits.length ? `${period} verified metrics: ${metricBits.join(", ")}.` : `No verified FY metric row is available for ${meta.name} in the backend yet.`;
  return {
    title: `${meta.name} automatic earnings update`,
    callDate: latest?.date ? new Date(latest.date).toLocaleDateString("en-IN") : "Latest detected filing/news",
    period,
    refreshedAt: new Date().toISOString(),
    status: latest ? "updated-from-latest-source" : "no-new-transcript-detected",
    latestSource: latest || null,
    sections: [
      { heading: "Financial Performance", text: metricText },
      { heading: "Latest Filing / Transcript Signal", text: latest ? `${latest.source}: ${latest.title}. ${latest.summary || "Review the linked source for full management commentary."}` : "No fresh transcript-like filing was detected in the latest BSE/news scan. The app will keep checking automatically." },
      { heading: "Investor Watch Points", text: "Track order inflow, execution cadence, margin sustainability, receivable collection, inventory movement and management guidance changes versus the latest verified fiscal-year base." }
    ]
  };
}

async function transcriptSummary(meta) {
  const candidates = await transcriptCandidates(meta);
  const latest = candidates[0] || null;
  const metrics = auditedMetrics[meta.id] || {};
  return {
    meta,
    summary: deterministicTranscriptSummary(meta, latest, metrics),
    candidates,
    source: "BSE announcements, company/news feeds and audited metric cache"
  };
}

async function companyPayload(meta) {
  const [chart, richYahoo, simpleQuote, mcQuote, bse, news, moneycontrol, yahooTimeseries] = await Promise.allSettled([
    yahooChart(meta.symbol),
    yahooCompany(meta.symbol),
    yahooSimpleQuote(meta.symbol),
    moneycontrolQuote(meta),
    bseAnnouncements(meta.bse),
    companyNews(meta),
    moneycontrolFinancials(meta),
    yahooTimeseriesFinancials(meta.symbol)
  ]);
  const chartValue = chart.status === "fulfilled" ? chart.value : { meta: {}, points: [] };
  const yahooValue = richYahoo.status === "fulfilled" ? richYahoo.value : yahooFromChart(meta.symbol, chartValue);
  const simpleQuoteValue = simpleQuote.status === "fulfilled" ? simpleQuote.value : null;
  const moneycontrolQuoteValue = mcQuote.status === "fulfilled" ? mcQuote.value : null;
  if (simpleQuoteValue?.quote) {
    yahooValue.quote = {
      ...simpleQuoteValue.quote,
      ...Object.fromEntries(Object.entries(yahooValue.quote || {}).filter(([, value]) => value !== null && value !== undefined))
    };
    for (const [key, value] of Object.entries(simpleQuoteValue.quote)) {
      if ((yahooValue.quote[key] === null || yahooValue.quote[key] === undefined) && value !== null && value !== undefined) {
        yahooValue.quote[key] = value;
      }
    }
    yahooValue.source = yahooValue.source === "Yahoo Finance chart" ? "Yahoo Finance quote/chart" : yahooValue.source;
  }
  if (moneycontrolQuoteValue?.quote) {
    for (const [key, value] of Object.entries(moneycontrolQuoteValue.quote)) {
      if ((yahooValue.quote[key] === null || yahooValue.quote[key] === undefined) && value !== null && value !== undefined) {
        yahooValue.quote[key] = value;
      }
    }
    yahooValue.source = yahooValue.source === "Yahoo Finance chart" ? "Yahoo Finance chart + Moneycontrol quote" : yahooValue.source;
  }
  let moneycontrolValue = moneycontrol.status === "fulfilled" ? moneycontrol.value : { source: "Moneycontrol consolidated P&L", available: false, reason: moneycontrol.reason?.message || "Unavailable" };
  if (!moneycontrolValue?.available && moneycontrolQuoteValue?.overview?.revenue?.length) {
    const overviewYears = moneycontrolQuoteValue.overview.revenue.map((row) => row.year);
    const alignOverview = (key) => {
      const map = new Map((moneycontrolQuoteValue.overview[key] || []).map((row) => [row.year, row.value]));
      return overviewYears.map((year) => map.get(year) ?? null);
    };
    moneycontrolValue.source = "Moneycontrol stock quote financial overview";
    moneycontrolValue.url = moneycontrolQuoteValue.url;
    moneycontrolValue.available = true;
    moneycontrolValue.years = overviewYears;
    moneycontrolValue.latest = {
      period: overviewYears.at(-1) ? `FY${overviewYears.at(-1).slice(-2)}` : "latest consolidated year",
      revenue: moneycontrolQuoteValue.overview.revenue.at(-1)?.value ?? null,
      pat: moneycontrolQuoteValue.overview.pat.at(-1)?.value ?? null,
      patMargin: moneycontrolQuoteValue.overview.revenue.at(-1)?.value > 0
        ? (moneycontrolQuoteValue.overview.pat.at(-1)?.value / moneycontrolQuoteValue.overview.revenue.at(-1)?.value) * 100
        : null,
      roe: moneycontrolQuoteValue.overview.roe.at(-1)?.value ?? null,
      debtEquity: moneycontrolQuoteValue.overview.debtEquity.at(-1)?.value ?? null
    };
    const revenueRows = alignOverview("revenue");
    const patRows = alignOverview("pat");
    const patMarginRows = overviewYears.map((_, index) => revenueRows[index] > 0 && Number.isFinite(patRows[index]) ? Number(((patRows[index] / revenueRows[index]) * 100).toFixed(2)) : null);
    moneycontrolValue.rows = {
      ...(moneycontrolValue.rows || {}),
      revenue: revenueRows,
      pat: patRows,
      patMargin: patMarginRows,
      roe: alignOverview("roe"),
      debtEquity: alignOverview("debtEquity")
    };
  }
  if (!moneycontrolValue?.available) {
    const yahooHistory = yahooTimeseries.status === "fulfilled" && yahooTimeseries.value?.available
      ? yahooTimeseries.value
      : yahooFinancialHistory(yahooValue);
    if (yahooHistory?.available) moneycontrolValue = yahooHistory;
  }
  if (!Number.isFinite(yahooValue?.quote?.marketCap)) {
    const price = Number(yahooValue?.quote?.regularMarketPrice);
    const shares = Number(moneycontrolValue?.latest?.shares);
    if (Number.isFinite(price) && Number.isFinite(shares) && shares > 0) {
      yahooValue.quote.marketCap = price * shares;
    }
  }
  return {
    meta,
    yahoo: yahooValue,
    moneycontrol: moneycontrolValue,
    chart: chartValue.points,
    bse: bse.status === "fulfilled" ? bse.value : [],
    news: news.status === "fulfilled" ? news.value : [],
    refreshedAt: new Date().toISOString()
  };
}

function statementValue(row, keys = []) {
  for (const key of keys) {
    const value = row?.[key];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function sumStatementValues(row, keys = []) {
  const values = keys.map((key) => row?.[key]).filter(Number.isFinite);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

function fiscalYearFromStatement(row, index) {
  const endDate = Number(row?.endDate);
  if (Number.isFinite(endDate)) {
    const year = new Date(endDate * 1000).getUTCFullYear();
    if (Number.isFinite(year)) return `FY${String(year).slice(-2)}`;
  }
  return `FY${String(new Date().getFullYear() - index).slice(-2)}`;
}

function yahooFinancialHistory(yahooValue) {
  const financials = yahooValue?.financials || {};
  const income = Array.isArray(financials.incomeAnnual) ? financials.incomeAnnual : [];
  const balance = Array.isArray(financials.balanceAnnual) ? financials.balanceAnnual : [];
  const cashflow = Array.isArray(financials.cashflowAnnual) ? financials.cashflowAnnual : [];
  if (!income.length) return null;

  const years = income.map(fiscalYearFromStatement);
  const byIndex = (fn) => years.map((_, index) => {
    const value = fn(index);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  });
  const toCr = (value) => Number.isFinite(value) ? value / 1e7 : null;
  const revenue = byIndex((index) => toCr(statementValue(income[index], ["totalRevenue"])));
  const pat = byIndex((index) => toCr(statementValue(income[index], ["netIncome", "netIncomeCommonStockholders"])));
  const ebitda = byIndex((index) => toCr(statementValue(income[index], ["ebitda"]) ?? sumStatementValues(income[index], ["ebit", "reconciledDepreciation", "depreciationAndAmortization"])));
  const totalAssets = byIndex((index) => toCr(statementValue(balance[index], ["totalAssets"])));
  const equity = byIndex((index) => toCr(statementValue(balance[index], ["totalStockholderEquity", "stockholdersEquity"])));
  const totalDebt = byIndex((index) => toCr(sumStatementValues(balance[index], ["shortLongTermDebt", "currentDebt", "longTermDebt"])));
  const receivables = byIndex((index) => toCr(statementValue(balance[index], ["netReceivables", "accountsReceivable"])));
  const inventories = byIndex((index) => toCr(statementValue(balance[index], ["inventory"])));
  const payables = byIndex((index) => toCr(statementValue(balance[index], ["accountsPayable"])));
  const cfo = byIndex((index) => toCr(statementValue(cashflow[index], ["totalCashFromOperatingActivities", "operatingCashFlow"])));
  const capex = byIndex((index) => toCr(statementValue(cashflow[index], ["capitalExpenditures"])));
  const ratioRows = (fn) => years.map((_, index) => {
    const value = fn(index);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  });
  const ebitdaMargin = ratioRows((index) => revenue[index] > 0 ? (ebitda[index] / revenue[index]) * 100 : NaN);
  const patMargin = ratioRows((index) => revenue[index] > 0 ? (pat[index] / revenue[index]) * 100 : NaN);
  const roe = ratioRows((index) => equity[index] > 0 ? (pat[index] / equity[index]) * 100 : NaN);
  const roa = ratioRows((index) => totalAssets[index] > 0 ? (pat[index] / totalAssets[index]) * 100 : NaN);
  const debtEquity = ratioRows((index) => equity[index] > 0 ? totalDebt[index] / equity[index] : NaN);
  const fcf = byIndex((index) => Number.isFinite(cfo[index]) && Number.isFinite(capex[index]) ? cfo[index] + capex[index] : NaN);
  const receivableDays = ratioRows((index) => revenue[index] > 0 ? (receivables[index] / revenue[index]) * 365 : NaN);
  const inventoryDays = ratioRows((index) => revenue[index] > 0 ? (inventories[index] / revenue[index]) * 365 : NaN);
  const payableDays = ratioRows((index) => revenue[index] > 0 ? (payables[index] / revenue[index]) * 365 : NaN);

  const hasData = revenue.some(Number.isFinite) || pat.some(Number.isFinite);
  if (!hasData) return null;
  return {
    source: "Yahoo Finance annual financial statements",
    url: `https://finance.yahoo.com/quote/${encodeURIComponent(yahooValue?.quote?.symbol || "")}/financials/`,
    available: true,
    latest: {
      period: years[0] || "latest annual year",
      revenue: revenue[0],
      pat: pat[0],
      ebitda: ebitda[0],
      ebitdaMargin: ebitdaMargin[0],
      patMargin: patMargin[0],
      roe: roe[0],
      roa: roa[0],
      debtEquity: debtEquity[0],
      fcf: fcf[0],
      receivableDays: receivableDays[0],
      inventoryDays: inventoryDays[0],
      payableDays: payableDays[0]
    },
    years,
    rows: {
      revenue,
      pat,
      ebitda,
      ebitdaMargin,
      patMargin,
      roe,
      roa,
      debtEquity,
      fcf,
      totalAssets,
      receivableDays,
      inventoryDays,
      payableDays
    }
  };
}

function compactNumber(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function rupeesToCrores(value) {
  return Number.isFinite(value) ? value / 1e7 : null;
}

function resolvedFinancials(payload) {
  const audited = auditedMetrics[payload.meta.id] || {};
  const mc = payload.moneycontrol?.latest || {};
  const yf = payload.yahoo?.financials || {};
  const choose = (key, alternatives) => {
    if (Number.isFinite(audited[key])) return { value: audited[key], source: "Company filing / investor release", period: audited.period || "FY26" };
    for (const row of alternatives) {
      if (Number.isFinite(row.value)) return row;
    }
    return { value: null, source: "Unavailable", period: audited.period || mc.period || "latest" };
  };
  return {
    revenue: choose("revenue", [
      { value: mc.revenue ?? mc.operatingRevenue, source: "Moneycontrol consolidated P&L", period: mc.period || "latest consolidated year" },
      { value: rupeesToCrores(yf.revenue), source: "Yahoo Finance financialData", period: "Yahoo latest" }
    ]),
    pat: choose("pat", [
      { value: mc.pat, source: "Moneycontrol consolidated P&L", period: mc.period || "latest consolidated year" }
    ]),
    ebitda: choose("ebitda", [
      { value: rupeesToCrores(yf.ebitda), source: "Yahoo Finance financialData", period: "Yahoo latest" }
    ]),
    ebitdaMargin: choose("ebitdaMargin", []),
    grossMargin: choose("grossMargin", [
      { value: Number.isFinite(yf.grossMargins) ? yf.grossMargins * 100 : null, source: "Yahoo Finance financialData", period: "Yahoo latest" }
    ]),
    patMargin: choose("patMargin", [
      { value: Number.isFinite(yf.profitMargins) ? yf.profitMargins * 100 : null, source: "Yahoo Finance financialData", period: "Yahoo latest" }
    ])
  };
}

function payloadForAi(payload) {
  const q = payload.yahoo?.quote || {};
  const chart = payload.chart || [];
  const first = chart.find((point) => Number.isFinite(point.close));
  const last = [...chart].reverse().find((point) => Number.isFinite(point.close));
  const return1y = first?.close && last?.close ? ((last.close - first.close) / first.close) * 100 : null;
  return {
    id: payload.meta.id,
    name: payload.meta.name,
    symbol: payload.meta.symbol,
    segment: payload.meta.segment,
    audited: auditedMetrics[payload.meta.id] || null,
    financials: resolvedFinancials(payload),
    moneycontrol: payload.moneycontrol?.available ? {
      source: payload.moneycontrol.source,
      url: payload.moneycontrol.url,
      latest: payload.moneycontrol.latest
    } : null,
    quote: {
      price: q.regularMarketPrice ?? null,
      dayMovePct: q.regularMarketChangePercent ?? null,
      marketCap: q.marketCap ?? null,
      trailingPE: q.trailingPE ?? null,
      volume: q.volume ?? null,
      return1y: compactNumber(return1y),
      refreshedAt: payload.refreshedAt
    },
    latestNews: (payload.news || []).slice(0, 4).map((row) => ({
      date: row.date,
      title: row.title,
      publisher: row.publisher || row.source,
      link: row.link,
      summary: row.summary
    })),
    latestBse: (payload.bse || []).slice(0, 4).map((row) => ({
      date: row.date,
      title: row.title,
      category: row.category,
      attachment: row.attachment,
      notes: row.notes
    }))
  };
}

function resolveAiCompanies(prompt, selectedId, ids = []) {
  const text = String(prompt || "").toLowerCase();
  const all = text.includes("all companies") || text.includes("watchlist") || text.includes("peer") || text.includes("compare");
  if (all) return companies.filter((c) => !ids.length || ids.includes(c.id)).slice(0, 10);
  const mentioned = companies.filter((c) => [c.id, c.nse, c.symbol, c.name].some((value) => String(value || "").toLowerCase().replace(".ns", "").split(/\s+/).some((part) => part && text.includes(part))));
  if (mentioned.length) return mentioned.slice(0, 4);
  return companies.filter((c) => c.id === selectedId).slice(0, 1);
}

function extractResponseText(json) {
  if (json?.output_text) return json.output_text;
  const parts = [];
  for (const item of json?.output || []) {
    for (const content of item.content || []) {
      if (content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function financeAiMessages(prompt, context) {
  return [
    {
      role: "system",
      content: [
        "You are Finance AI, an expert listed-company financial reviewer.",
        "Use only the supplied Yahoo Finance, Moneycontrol consolidated P&L, BSE, news and audited metric context.",
        "Use company filing / investor release figures first. For metrics not available there, use Yahoo Finance or Moneycontrol consolidated data only.",
        "Mention fiscal years for every financial figure and state the source. Do not use standalone figures. Do not invent missing values.",
        "Answer in 3-6 concise analyst bullets with source/date cues where available.",
        "This is informational analysis, not investment advice."
      ].join(" ")
    },
    {
      role: "user",
      content: `User question: ${prompt}\n\nContext JSON:\n${JSON.stringify(context, null, 2)}`
    }
  ];
}

function extractChatCompletionText(json) {
  return String(json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || "").trim();
}

function compactPollinationsPrompt(prompt, context) {
  const rows = (context.companies || []).slice(0, 5).map((row) => {
    const f = row.financials || {};
    const news = row.latestNews?.[0];
    const bse = row.latestBse?.[0];
    return {
      name: row.name,
      symbol: row.symbol,
      price: row.quote?.price,
      dayMovePct: row.quote?.dayMovePct,
      revenue: f.revenue,
      pat: f.pat,
      ebitdaMargin: f.ebitdaMargin,
      latestNews: news ? { title: news.title, date: news.date } : null,
      latestBse: bse ? { title: bse.title, date: bse.date } : null
    };
  });
  return [
    "You are Finance AI. Answer in 3-6 concise analyst bullets.",
    "Use only the supplied context. Mention fiscal years and sources for financial figures. Do not invent missing data.",
    `Question: ${prompt}`,
    `Context: ${JSON.stringify({ generatedAt: context.generatedAt, companies: rows })}`
  ].join("\n");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAi(prompt, context) {
  if (!process.env.OPENAI_API_KEY) return null;
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      instructions: financeAiMessages(prompt, context)[0].content,
      input: financeAiMessages(prompt, context)[1].content,
      max_output_tokens: 900
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  return extractResponseText(await response.json());
}

async function callPollinations(prompt, context) {
  const messages = financeAiMessages(prompt, context);
  const body = JSON.stringify({
    model: POLLINATIONS_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 900
  });
  const endpoints = [];
  if (process.env.POLLINATIONS_API_KEY) {
    endpoints.push({
      kind: "chat",
      url: "https://gen.pollinations.ai/v1/chat/completions",
      headers: { authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}` }
    });
  }
  endpoints.push({ kind: "chat", url: "https://text.pollinations.ai/openai", headers: {} });
  endpoints.push({
    kind: "simple",
    url: `https://gen.pollinations.ai/text/${encodeURIComponent(compactPollinationsPrompt(prompt, context))}?model=${encodeURIComponent(POLLINATIONS_MODEL)}`,
    headers: {}
  });

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(endpoint.url, {
        method: endpoint.kind === "simple" ? "GET" : "POST",
        headers: {
          "accept": "application/json,text/plain,*/*",
          "user-agent": "Mozilla/5.0 FinanceAI/1.0",
          ...(endpoint.kind === "simple" ? {} : { "content-type": "application/json" }),
          ...endpoint.headers
        },
        ...(endpoint.kind === "simple" ? {} : { body })
      }, endpoint.kind === "simple" ? 8_000 : 12_000);
      if (!response.ok) throw new Error(`Pollinations ${response.status}: ${await response.text()}`);
      const contentType = response.headers.get("content-type") || "";
      const text = contentType.includes("application/json")
        ? extractChatCompletionText(await response.json())
        : (await response.text()).trim();
      if (text) return text;
      lastError = new Error("Pollinations returned an empty response");
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

function deterministicAiAnswer(prompt, context) {
  const question = String(prompt || "").toLowerCase();
  const rows = context.companies || [];
  const wantsNews = question.includes("news") || question.includes("latest");
  const wantsCall = question.includes("earnings call") || question.includes("transcript");
  const wantsCompare = question.includes("compare") || question.includes("peer") || rows.length > 1;
  if (wantsCall) {
    return rows.map((row) => {
      const source = context.transcripts?.[row.id]?.summary?.latestSource;
      const audited = row.audited;
      return `- ${row.name}: ${audited?.period || "Latest period"} company-filing metrics: revenue ${audited?.revenue ?? "not verified"}cr and PAT ${audited?.pat ?? "not verified"}cr. Latest transcript/filing signal: ${source ? `${source.date || "date unavailable"} - ${source.title}` : "no new transcript-like filing detected"}.`;
    }).join("\n");
  }
  if (wantsNews) {
    return rows.map((row) => {
      const news = row.latestNews?.[0];
      const filing = row.latestBse?.[0];
      return `- ${row.name}: latest Yahoo/news item: ${news ? `${news.date || "date unavailable"} - ${news.title}` : "none returned"}. Latest BSE item: ${filing ? `${filing.date || "date unavailable"} - ${filing.title}` : "none returned"}.`;
    }).join("\n");
  }
  if (wantsCompare) {
    return rows.map((row) => {
      const f = row.financials || {};
      return `- ${row.name}: ${f.revenue?.period || "Latest period"} revenue Rs ${f.revenue?.value ?? "--"}cr (${f.revenue?.source || "unavailable"}), PAT Rs ${f.pat?.value ?? "--"}cr (${f.pat?.source || "unavailable"}), EBITDA margin ${f.ebitdaMargin?.value ?? "--"}% (${f.ebitdaMargin?.source || "unavailable"}), live price Rs ${row.quote.price ?? "--"}, 1Y return ${row.quote.return1y ?? "--"}%.`;
    }).join("\n");
  }
  const row = rows[0];
  if (!row) return "No matching company context was available. Try a company name or select one from the watchlist.";
  const f = row.financials || {};
  return `- ${row.name}: live price Rs ${row.quote.price ?? "--"} with day move ${row.quote.dayMovePct ?? "--"}%.\n- ${f.revenue?.period || "Latest period"} consolidated metrics: revenue Rs ${f.revenue?.value ?? "--"}cr (${f.revenue?.source || "unavailable"}), PAT Rs ${f.pat?.value ?? "--"}cr (${f.pat?.source || "unavailable"}), EBITDA margin ${f.ebitdaMargin?.value ?? "--"}% (${f.ebitdaMargin?.source || "unavailable"}).\n- Latest news/BSE context is refreshed from Yahoo Finance, Google News RSS and BSE; financial fallback uses Moneycontrol consolidated P&L or Yahoo Finance only when company filing data is missing.`;
}

async function aiAnswer(body = {}) {
  const prompt = String(body.prompt || "").slice(0, 1200);
  const ids = Array.isArray(body.ids) ? body.ids : [];
  const selected = body.selectedId || ids[0] || companies[0].id;
  const selectedCompanies = resolveAiCompanies(prompt, selected, ids);
  const payloads = await Promise.all(selectedCompanies.map(companyPayload));
  const transcriptPairs = await Promise.all(selectedCompanies.map(async (meta) => [meta.id, await transcriptSummary(meta)]));
  const context = {
    generatedAt: new Date().toISOString(),
    dataSources: ["Company filings / investor releases", "Yahoo Finance quote/chart/search", "Moneycontrol consolidated P&L", "BSE announcements", "Google News RSS"],
    companies: payloads.map(payloadForAi),
    transcripts: Object.fromEntries(transcriptPairs)
  };
  let text = null;
  let mode = "deterministic";
  const providerErrors = [];
  try {
    text = await callOpenAi(prompt, context);
    if (text) mode = "openai";
  } catch (error) {
    providerErrors.push(`OpenAI: ${error.message}`);
  }
  if (!text) {
    try {
      text = await callPollinations(prompt, context);
      if (text) mode = "pollinations";
    } catch (error) {
      providerErrors.push(`Pollinations: ${error.message}`);
    }
  }
  if (!text) {
    const note = providerErrors.length ? `\n\nAI backend note: ${providerErrors.join(" | ")}. Used deterministic live-data fallback.` : "";
    text = `${deterministicAiAnswer(prompt, context)}${note}`;
  }
  return {
    answer: text,
    mode,
    refreshedAt: context.generatedAt,
    sources: context.companies.flatMap((row) => [
      ...(row.latestNews || []).slice(0, 2).map((item) => ({ company: row.name, type: "news", title: item.title, date: item.date, link: item.link })),
      ...(row.latestBse || []).slice(0, 2).map((item) => ({ company: row.name, type: "bse", title: item.title, date: item.date, link: item.attachment }))
    ])
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
    const id = url.searchParams.get("id");
    const symbol = url.searchParams.get("symbol");
    const bse = url.searchParams.get("bse") || "";
    const name = url.searchParams.get("name") || symbol;
    const segment = url.searchParams.get("segment") || "Custom watchlist company";
    const nse = url.searchParams.get("nse") || symbol?.replace(".NS", "");
    if (!symbol) return send(res, 400, { error: "symbol is required" });
    return send(res, 200, await companyPayload({ id: id || symbol.toLowerCase(), name, symbol, nse, bse, segment }));
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
  if (url.pathname === "/api/sector-news") {
    const ids = (url.searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean);
    return send(res, 200, {
      news: await sectorNews(ids),
      refreshedAt: new Date().toISOString()
    });
  }
  if (url.pathname === "/api/transcript-summary") {
    const id = url.searchParams.get("id") || "";
    const meta = companies.find((c) => c.id === id || c.symbol === id || c.nse === id.toUpperCase());
    if (!meta) return send(res, 404, { error: "Unknown company" });
    return send(res, 200, await transcriptSummary(meta));
  }
  if (url.pathname === "/api/transcripts") {
    const ids = (url.searchParams.get("ids") || companies.map((c) => c.id).join(",")).split(",").filter(Boolean);
    const selected = ids.map((id) => companies.find((c) => c.id === id || c.nse === id.toUpperCase())).filter(Boolean);
    const summaries = await Promise.all(selected.map(transcriptSummary));
    return send(res, 200, { summaries, refreshedAt: new Date().toISOString() });
  }
  if (url.pathname === "/api/call-schedule") {
    const ids = (url.searchParams.get("ids") || companies.map((c) => c.id).join(",")).split(",").filter(Boolean);
    const customRows = (url.searchParams.get("custom") || "")
      .split("|")
      .map((entry) => {
        const [id, symbol, bse, name, nse] = entry.split("~").map((part) => decodeURIComponent(part || ""));
        return symbol ? { id, symbol, bse, name: name || symbol, nse: nse || symbol.replace(".NS", ""), segment: "Custom watchlist company" } : null;
      })
      .filter(Boolean);
    const selected = ids
      .map((id) => companies.find((c) => c.id === id || c.nse === id.toUpperCase()) || customRows.find((c) => c.id === id))
      .filter(Boolean);
    const schedules = await Promise.all(selected.map(upcomingSchedule));
    return send(res, 200, { schedules, refreshedAt: new Date().toISOString() });
  }
  if (url.pathname === "/api/ai" && req.method === "POST") {
    return send(res, 200, await aiAnswer(await readJsonBody(req)));
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
  console.log(`Live finance tool running at http://localhost:${PORT}`);
});
