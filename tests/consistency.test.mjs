import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const app = readFileSync(join(root, "public", "app.js"), "utf8");

function bodyOf(name) {
  const start = app.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const next = app.indexOf("\nfunction ", start + 1);
  return app.slice(start, next === -1 ? app.length : next);
}

const renderDetail = bodyOf("renderDetail");
const renderHistorical = bodyOf("renderHistorical");
const renderComparison = bodyOf("renderComparison");
const latestPeerMultipleRow = bodyOf("latestPeerMultipleRow");
const liveMetric = bodyOf("liveMetric");
const valuationMetrics = bodyOf("valuationMetrics");

assert.match(renderDetail, /valuationMetrics\(extra,\s*item\)/, "Charts detail card P/E must use valuationMetrics");
assert.match(renderHistorical, /valuationMetrics\(extra,\s*item\)/, "Historical table/chart must use valuationMetrics");
assert.match(renderComparison, /valuationMetrics\(extra,\s*item\)/, "Comparison table must use valuationMetrics");
assert.match(latestPeerMultipleRow, /valuationMetrics\(extra,\s*item\)/, "Latest peer multiples chart must use valuationMetrics");
assert.match(liveMetric, /key === "pe"\)\s*return valuationMetrics\(extra,\s*item\)\.rawPe/, "liveMetric P/E must use valuationMetrics");

assert.ok(
  valuationMetrics.indexOf("marketCap / patMetric.value") < valuationMetrics.indexOf("item?.yahoo?.quote?.trailingPE"),
  "P/E should prefer current market cap / filing PAT before Yahoo trailingPE fallback"
);

assert.doesNotMatch(app, /peerTrailingMultipleRows|peerMultipleYears|latestPeerMultipleTableRows|Company \/ latest FY basis|FY22-FY26 trailing peer comps/);
assert.doesNotMatch(app, /Rs \$\{compact\([^}]+\)\}crs|compact\(q\.volume\)|money\(q\.regularMarketChange\)/);
assert.match(app, /function normalizeDateLabel/);
assert.match(app, /function signedMoney/);
assert.match(app, /function volume/);

