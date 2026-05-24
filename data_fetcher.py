"""Fetches financial and investor data for Indian defence companies."""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time
import logging

logger = logging.getLogger(__name__)


def _safe_val(val, default=None):
    """Return None-safe scalar value."""
    if val is None:
        return default
    if isinstance(val, (pd.Series, pd.DataFrame)):
        if val.empty:
            return default
        val = val.iloc[0] if isinstance(val, pd.Series) else val
    if isinstance(val, float) and np.isnan(val):
        return default
    return val


def fetch_company_data(ticker: str, period: str = "5y") -> dict:
    """
    Fetch all available investor data for a company.

    Returns a dict with keys:
        info, financials, balance_sheet, cashflow,
        quarterly_financials, quarterly_balance_sheet,
        quarterly_cashflow, history, institutional_holders,
        major_holders, dividends, splits, recommendations
    """
    try:
        stock = yf.Ticker(ticker)
        data = {}

        # Core info
        try:
            data["info"] = stock.info or {}
        except Exception:
            data["info"] = {}

        # Annual financials
        for key, attr in [
            ("financials", "financials"),
            ("balance_sheet", "balance_sheet"),
            ("cashflow", "cashflow"),
        ]:
            try:
                df = getattr(stock, attr)
                data[key] = df if df is not None and not df.empty else pd.DataFrame()
            except Exception:
                data[key] = pd.DataFrame()

        # Quarterly financials
        for key, attr in [
            ("quarterly_financials", "quarterly_financials"),
            ("quarterly_balance_sheet", "quarterly_balance_sheet"),
            ("quarterly_cashflow", "quarterly_cashflow"),
        ]:
            try:
                df = getattr(stock, attr)
                data[key] = df if df is not None and not df.empty else pd.DataFrame()
            except Exception:
                data[key] = pd.DataFrame()

        # Price history
        try:
            data["history"] = stock.history(period=period)
        except Exception:
            data["history"] = pd.DataFrame()

        # Holders
        for key, attr in [
            ("institutional_holders", "institutional_holders"),
            ("major_holders", "major_holders"),
        ]:
            try:
                df = getattr(stock, attr)
                data[key] = df if df is not None and not df.empty else pd.DataFrame()
            except Exception:
                data[key] = pd.DataFrame()

        # Dividends & splits
        try:
            data["dividends"] = stock.dividends
        except Exception:
            data["dividends"] = pd.Series(dtype=float)

        try:
            data["splits"] = stock.splits
        except Exception:
            data["splits"] = pd.Series(dtype=float)

        # Analyst recommendations
        try:
            data["recommendations"] = stock.recommendations
        except Exception:
            data["recommendations"] = pd.DataFrame()

        time.sleep(0.5)  # polite rate-limit
        return data

    except Exception as e:
        logger.error(f"Failed to fetch {ticker}: {e}")
        return {}


def extract_key_metrics(data: dict, company_meta: dict) -> dict:
    """
    Derive a flat dict of key investor metrics from raw yfinance data.
    All monetary values in INR Crores (1 Cr = 10M INR).
    """
    info = data.get("info", {})
    fins = data.get("financials", pd.DataFrame())
    bs = data.get("balance_sheet", pd.DataFrame())
    cf = data.get("cashflow", pd.DataFrame())
    hist = data.get("history", pd.DataFrame())

    def cr(val):
        """Convert raw INR to Crores."""
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return None
        return round(val / 1e7, 2)

    def pct(val):
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return None
        return round(val * 100, 2)

    metrics = {
        "name": company_meta["name"],
        "short": company_meta["short"],
        "ticker": company_meta["ticker"],
        "sub_sector": company_meta["sub_sector"],
        "description": company_meta["description"],
        "fetched_at": datetime.now().isoformat(),
    }

    # Valuation
    metrics["market_cap_cr"] = cr(info.get("marketCap"))
    metrics["current_price"] = info.get("currentPrice") or info.get("regularMarketPrice")
    metrics["52w_high"] = info.get("fiftyTwoWeekHigh")
    metrics["52w_low"] = info.get("fiftyTwoWeekLow")
    metrics["pe_ratio"] = _safe_val(info.get("trailingPE"))
    metrics["pb_ratio"] = _safe_val(info.get("priceToBook"))
    metrics["ev_ebitda"] = _safe_val(info.get("enterpriseToEbitda"))
    metrics["beta"] = _safe_val(info.get("beta"))
    metrics["dividend_yield"] = pct(info.get("dividendYield"))
    metrics["eps_ttm"] = _safe_val(info.get("trailingEps"))

    # Profitability from annual financials
    if not fins.empty:
        cols = fins.columns.tolist()
        latest = cols[0] if cols else None
        prev = cols[1] if len(cols) > 1 else None

        def _row(label, df=fins):
            matches = [r for r in df.index if label.lower() in str(r).lower()]
            return df.loc[matches[0]] if matches else None

        rev_row = _row("Total Revenue")
        ebit_row = _row("EBIT")
        if ebit_row is None:
            ebit_row = _row("Operating Income")
        ni_row = _row("Net Income")

        if rev_row is not None and latest:
            metrics["revenue_cr"] = cr(_safe_val(rev_row.get(latest)))
            if prev:
                prev_rev = cr(_safe_val(rev_row.get(prev)))
                curr_rev = metrics["revenue_cr"]
                if prev_rev and curr_rev:
                    metrics["revenue_growth_yoy"] = round(
                        (curr_rev - prev_rev) / prev_rev * 100, 2
                    )

        if ni_row is not None and latest:
            metrics["pat_cr"] = cr(_safe_val(ni_row.get(latest)))

        if ebit_row is not None and latest:
            metrics["ebit_cr"] = cr(_safe_val(ebit_row.get(latest)))

        # EBITDA from cashflow
        dep_row = _row("Depreciation", cf) if not cf.empty else None
        if ebit_row is not None and dep_row is not None and latest:
            ebit = _safe_val(ebit_row.get(latest))
            dep = _safe_val(dep_row.get(latest))
            if ebit is not None and dep is not None:
                metrics["ebitda_cr"] = cr(ebit + abs(dep))

        # Margins
        rev = metrics.get("revenue_cr")
        if rev and rev > 0:
            if metrics.get("pat_cr") is not None:
                metrics["pat_margin"] = round(metrics["pat_cr"] / rev * 100, 2)
            if metrics.get("ebitda_cr") is not None:
                metrics["ebitda_margin"] = round(metrics["ebitda_cr"] / rev * 100, 2)

    # Balance sheet
    if not bs.empty:
        cols = bs.columns.tolist()
        latest = cols[0] if cols else None

        def _brow(label):
            matches = [r for r in bs.index if label.lower() in str(r).lower()]
            return bs.loc[matches[0]] if matches else None

        debt_row = _brow("Total Debt")
        if debt_row is None:
            debt_row = _brow("Long Term Debt")
        cash_row = _brow("Cash And Cash Equivalents")
        if cash_row is None:
            cash_row = _brow("Cash")
        eq_row = _brow("Total Stockholder Equity")
        if eq_row is None:
            eq_row = _brow("Stockholders Equity")

        if debt_row is not None and latest:
            metrics["total_debt_cr"] = cr(_safe_val(debt_row.get(latest)))
        if cash_row is not None and latest:
            metrics["cash_cr"] = cr(_safe_val(cash_row.get(latest)))
        if eq_row is not None and latest:
            metrics["equity_cr"] = cr(_safe_val(eq_row.get(latest)))

        if metrics.get("total_debt_cr") and metrics.get("equity_cr") and metrics["equity_cr"] > 0:
            metrics["debt_to_equity"] = round(
                metrics["total_debt_cr"] / metrics["equity_cr"], 2
            )

    # ROE / ROA from info
    metrics["roe"] = pct(info.get("returnOnEquity"))
    metrics["roa"] = pct(info.get("returnOnAssets"))

    # Price performance
    if not hist.empty and len(hist) > 1:
        hist = hist.sort_index()
        first_close = hist["Close"].iloc[0]
        last_close = hist["Close"].iloc[-1]
        metrics["price_return_5y"] = round(
            (last_close - first_close) / first_close * 100, 2
        )
        if len(hist) >= 252:
            ytd_start = hist["Close"].iloc[-252]
            metrics["price_return_1y"] = round(
                (last_close - ytd_start) / ytd_start * 100, 2
            )
        metrics["avg_volume"] = int(hist["Volume"].tail(30).mean())

    # Shareholding from major_holders
    mh = data.get("major_holders", pd.DataFrame())
    if not mh.empty:
        try:
            rows = mh.iloc[:, 0].tolist()
            labels = mh.iloc[:, 1].tolist()
            for i, label in enumerate(labels):
                lbl = str(label).lower()
                val = rows[i]
                if isinstance(val, str):
                    val = float(val.replace("%", ""))
                if "institution" in lbl:
                    metrics["institutional_holding_pct"] = round(float(val), 2)
                elif "insider" in lbl or "promoter" in lbl:
                    metrics["promoter_holding_pct"] = round(float(val), 2)
        except Exception:
            pass

    return metrics


def build_revenue_trend(data: dict) -> pd.DataFrame:
    """Return annual revenue, PAT, EBITDA trend as a DataFrame."""
    fins = data.get("financials", pd.DataFrame())
    cf = data.get("cashflow", pd.DataFrame())
    if fins.empty:
        return pd.DataFrame()

    def _row(label, df=fins):
        matches = [r for r in df.index if label.lower() in str(r).lower()]
        return df.loc[matches[0]] if matches else None

    rev_row = _row("Total Revenue")
    ni_row = _row("Net Income")
    ebit_row = _row("EBIT")
    if ebit_row is None:
        ebit_row = _row("Operating Income")
    dep_row = _row("Depreciation", cf) if not cf.empty else None

    records = []
    for col in fins.columns:
        try:
            year = str(col)[:4]
            rev = _safe_val(rev_row.get(col)) if rev_row is not None else None
            ni = _safe_val(ni_row.get(col)) if ni_row is not None else None
            ebit = _safe_val(ebit_row.get(col)) if ebit_row is not None else None
            dep = _safe_val(dep_row.get(col)) if dep_row is not None else None
            ebitda = ebit + abs(dep) if ebit and dep else None
            records.append(
                {
                    "year": year,
                    "revenue_cr": round(rev / 1e7, 2) if rev else None,
                    "pat_cr": round(ni / 1e7, 2) if ni else None,
                    "ebitda_cr": round(ebitda / 1e7, 2) if ebitda else None,
                }
            )
        except Exception:
            continue

    df = pd.DataFrame(records).sort_values("year")
    return df


def build_quarterly_trend(data: dict) -> pd.DataFrame:
    """Return last 8 quarters of revenue and PAT."""
    fins = data.get("quarterly_financials", pd.DataFrame())
    if fins.empty:
        return pd.DataFrame()

    def _row(label):
        matches = [r for r in fins.index if label.lower() in str(r).lower()]
        return fins.loc[matches[0]] if matches else None

    rev_row = _row("Total Revenue")
    ni_row = _row("Net Income")

    records = []
    for col in list(fins.columns)[:8]:
        try:
            qtr = str(col)[:10]
            rev = _safe_val(rev_row.get(col)) if rev_row is not None else None
            ni = _safe_val(ni_row.get(col)) if ni_row is not None else None
            records.append(
                {
                    "quarter": qtr,
                    "revenue_cr": round(rev / 1e7, 2) if rev else None,
                    "pat_cr": round(ni / 1e7, 2) if ni else None,
                }
            )
        except Exception:
            continue

    df = pd.DataFrame(records).sort_values("quarter")
    return df
