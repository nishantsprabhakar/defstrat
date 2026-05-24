"""
Generates IC-grade earnings briefings from yfinance data.
Output is structured as a Private Equity / Fund IC memo.
"""

from datetime import datetime
import pandas as pd
import numpy as np


def _safe(val, default=None):
    if val is None:
        return default
    if isinstance(val, float) and np.isnan(val):
        return default
    return val


def _cr(val):
    if val is None:
        return "N/A"
    v = val / 1e7
    if v >= 100000:
        return f"₹{v/100000:.1f}L Cr"
    if v >= 1000:
        return f"₹{v/1000:.1f}K Cr"
    return f"₹{v:,.0f} Cr"


def _pct(val):
    return f"{val:+.1f}%" if val is not None else "N/A"


def _row(label, df):
    matches = [r for r in df.index if label.lower() in str(r).lower()]
    return df.loc[matches[0]] if matches else None


def _get_val(row, col):
    if row is None:
        return None
    v = row.get(col)
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return float(v)


def build_earnings_briefing(raw_data: dict, meta: dict) -> dict:
    """
    Returns a structured IC earnings briefing dict with these keys:
        company, ticker, date_generated,
        latest_quarter, prior_quarter, prior_year_quarter,
        revenue_lq, revenue_pq, revenue_pyq,
        revenue_qoq, revenue_yoy,
        pat_lq, pat_pq, pat_pyq,
        pat_qoq, pat_yoy,
        ebitda_lq, ebitda_margin_lq, pat_margin_lq,
        eps_lq, eps_estimate, eps_surprise_pct,
        analyst_rating, analyst_target, analyst_count,
        recommendations_summary,
        annual_revenue_trend, annual_pat_trend, annual_roce_trend,
        order_book_signal,
        key_highlights (list of strings),
        management_commentary (list of strings),
        risks (list of strings),
        ic_verdict,
    """
    qf = raw_data.get("quarterly_financials", pd.DataFrame())
    qbs = raw_data.get("quarterly_balance_sheet", pd.DataFrame())
    qcf = raw_data.get("quarterly_cashflow", pd.DataFrame())
    af = raw_data.get("financials", pd.DataFrame())
    info = raw_data.get("info", {})
    rec = raw_data.get("recommendations", pd.DataFrame())

    result = {
        "company": meta["name"],
        "short": meta["short"],
        "ticker": meta["ticker"],
        "sub_sector": meta["sub_sector"],
        "description": meta["description"],
        "date_generated": datetime.now().strftime("%d %B %Y"),
    }

    # ── Quarterly P&L ─────────────────────────────────────────────────────────
    if not qf.empty and len(qf.columns) >= 2:
        cols = qf.columns.tolist()
        lq, pq = cols[0], cols[1]
        pyq = cols[4] if len(cols) > 4 else None

        result["latest_quarter"] = str(lq)[:10]
        result["prior_quarter"] = str(pq)[:10]
        result["prior_year_quarter"] = str(pyq)[:10] if pyq else "N/A"

        rev_row = _row("Total Revenue", qf)
        ni_row = _row("Net Income", qf)
        ebit_row = _row("EBIT", qf)
        if ebit_row is None:
            ebit_row = _row("Operating Income", qf)
        dep_row = _row("Depreciation", qcf) if not qcf.empty else None

        rev_lq = _get_val(rev_row, lq)
        rev_pq = _get_val(rev_row, pq)
        rev_pyq = _get_val(rev_row, pyq) if pyq else None

        pat_lq = _get_val(ni_row, lq)
        pat_pq = _get_val(ni_row, pq)
        pat_pyq = _get_val(ni_row, pyq) if pyq else None

        ebit_lq = _get_val(ebit_row, lq)
        dep_lq = _get_val(dep_row, lq) if dep_row is not None else None
        ebitda_lq = (ebit_lq + abs(dep_lq)) if ebit_lq and dep_lq else ebit_lq

        result["revenue_lq"] = _cr(rev_lq)
        result["revenue_pq"] = _cr(rev_pq)
        result["revenue_pyq"] = _cr(rev_pyq)
        result["pat_lq"] = _cr(pat_lq)
        result["pat_pq"] = _cr(pat_pq)
        result["pat_pyq"] = _cr(pat_pyq)
        result["ebitda_lq"] = _cr(ebitda_lq)

        # QoQ and YoY
        if rev_lq and rev_pq and rev_pq != 0:
            result["revenue_qoq"] = round((rev_lq - rev_pq) / abs(rev_pq) * 100, 1)
        else:
            result["revenue_qoq"] = None
        if rev_lq and rev_pyq and rev_pyq != 0:
            result["revenue_yoy"] = round((rev_lq - rev_pyq) / abs(rev_pyq) * 100, 1)
        else:
            result["revenue_yoy"] = None

        if pat_lq and pat_pq and pat_pq != 0:
            result["pat_qoq"] = round((pat_lq - pat_pq) / abs(pat_pq) * 100, 1)
        else:
            result["pat_qoq"] = None
        if pat_lq and pat_pyq and pat_pyq != 0:
            result["pat_yoy"] = round((pat_lq - pat_pyq) / abs(pat_pyq) * 100, 1)
        else:
            result["pat_yoy"] = None

        if rev_lq and rev_lq != 0:
            result["ebitda_margin_lq"] = round(ebitda_lq / rev_lq * 100, 1) if ebitda_lq else None
            result["pat_margin_lq"] = round(pat_lq / rev_lq * 100, 1) if pat_lq else None
        else:
            result["ebitda_margin_lq"] = None
            result["pat_margin_lq"] = None
    else:
        for k in ["latest_quarter", "prior_quarter", "prior_year_quarter",
                  "revenue_lq", "revenue_pq", "revenue_pyq", "revenue_qoq", "revenue_yoy",
                  "pat_lq", "pat_pq", "pat_pyq", "pat_qoq", "pat_yoy",
                  "ebitda_lq", "ebitda_margin_lq", "pat_margin_lq"]:
            result[k] = "N/A"

    # ── EPS vs estimate ───────────────────────────────────────────────────────
    result["eps_lq"] = _safe(info.get("trailingEps"))
    result["eps_estimate"] = _safe(info.get("forwardEps"))
    if result["eps_lq"] and result["eps_estimate"] and result["eps_estimate"] != 0:
        result["eps_surprise_pct"] = round(
            (result["eps_lq"] - result["eps_estimate"]) / abs(result["eps_estimate"]) * 100, 1
        )
    else:
        result["eps_surprise_pct"] = None

    # ── Analyst consensus ─────────────────────────────────────────────────────
    result["analyst_rating"] = _safe(info.get("recommendationKey", "N/A"), "N/A").upper()
    result["analyst_target"] = _safe(info.get("targetMeanPrice"))
    result["analyst_count"] = _safe(info.get("numberOfAnalystOpinions"))

    if not rec.empty and "period" in rec.columns:
        try:
            latest_rec = rec[rec["period"] == "0m"]
            if latest_rec.empty:
                latest_rec = rec.head(1)
            row = latest_rec.iloc[0]
            buys = int(row.get("strongBuy", 0) or 0) + int(row.get("buy", 0) or 0)
            holds = int(row.get("hold", 0) or 0)
            sells = int(row.get("sell", 0) or 0) + int(row.get("strongSell", 0) or 0)
            result["recommendations_summary"] = f"Buy: {buys}  |  Hold: {holds}  |  Sell: {sells}"
        except Exception:
            result["recommendations_summary"] = "N/A"
    else:
        result["recommendations_summary"] = "N/A"

    # ── Annual return metrics (ROCE proxy) ────────────────────────────────────
    annual_roce = []
    if not af.empty:
        for col in list(af.columns)[:4]:
            _ebit_row = _row("EBIT", af)
            if _ebit_row is None:
                _ebit_row = _row("Operating Income", af)
            ebit = _get_val(_ebit_row, col)
            equity_row = _row("Total Stockholder Equity", raw_data.get("balance_sheet", pd.DataFrame()))
            debt_row = _row("Total Debt", raw_data.get("balance_sheet", pd.DataFrame()))
            if ebit and equity_row is not None and debt_row is not None:
                eq = _get_val(equity_row, col)
                dt = _get_val(debt_row, col)
                if eq and dt and (eq + dt) > 0:
                    roce = ebit / (eq + dt) * 100
                    annual_roce.append({"year": str(col)[:4], "roce": round(roce, 1)})
    result["annual_roce_trend"] = annual_roce

    # Annual rev and PAT trend
    annual_rev, annual_pat = [], []
    if not af.empty:
        rev_r = _row("Total Revenue", af)
        ni_r = _row("Net Income", af)
        for col in list(af.columns)[:5]:
            rev = _get_val(rev_r, col)
            pat = _get_val(ni_r, col)
            annual_rev.append({"year": str(col)[:4], "value": round(rev / 1e7, 1) if rev else None})
            annual_pat.append({"year": str(col)[:4], "value": round(pat / 1e7, 1) if pat else None})
    result["annual_revenue_trend"] = annual_rev[::-1]
    result["annual_pat_trend"] = annual_pat[::-1]

    # ── IC Narrative sections ─────────────────────────────────────────────────
    highlights = []
    commentary = []
    risks = []

    rev_yoy = result.get("revenue_yoy")
    pat_yoy = result.get("pat_yoy")
    pat_margin = result.get("pat_margin_lq")
    ebitda_margin = result.get("ebitda_margin_lq")
    rev_qoq = result.get("revenue_qoq")
    current_price = _safe(info.get("currentPrice") or info.get("regularMarketPrice"))
    target = result.get("analyst_target")

    # Revenue commentary
    if isinstance(rev_yoy, (int, float)):
        direction = "grew" if rev_yoy > 0 else "declined"
        highlights.append(
            f"Revenue {direction} {abs(rev_yoy):.1f}% YoY to {result.get('revenue_lq', 'N/A')} "
            f"({result.get('latest_quarter', '')[:7]}), "
            f"{'beating' if rev_yoy > 10 else 'broadly in line with'} sector growth expectations."
        )
        if isinstance(rev_qoq, (int, float)):
            commentary.append(
                f"Sequential revenue {'uptick' if rev_qoq > 0 else 'moderation'} of "
                f"{abs(rev_qoq):.1f}% QoQ, "
                f"{'suggesting accelerating order execution' if rev_qoq > 5 else 'reflecting typical defence order timing volatility'}."
            )

    # PAT commentary
    if isinstance(pat_yoy, (int, float)):
        highlights.append(
            f"PAT {'expanded' if pat_yoy > 0 else 'contracted'} {abs(pat_yoy):.1f}% YoY to "
            f"{result.get('pat_lq', 'N/A')}, implying "
            f"{'positive operating leverage' if isinstance(rev_yoy, (int, float)) and pat_yoy > rev_yoy else 'margin pressure'}."
        )

    # Margin commentary
    if isinstance(ebitda_margin, (int, float)):
        margin_quality = "strong" if ebitda_margin > 20 else "moderate" if ebitda_margin > 12 else "thin"
        highlights.append(
            f"EBITDA margin of {ebitda_margin:.1f}% ({margin_quality} for the sub-sector). "
            f"PAT margin: {pat_margin:.1f}%." if isinstance(pat_margin, (int, float)) else
            f"EBITDA margin of {ebitda_margin:.1f}%."
        )

    # Analyst view
    rating = result.get("analyst_rating", "N/A")
    if rating not in ("N/A", "", None):
        upside = round((target - current_price) / current_price * 100, 1) if target and current_price and current_price > 0 else None
        upside_str = f", implying {upside:+.1f}% upside to CMP" if upside else ""
        commentary.append(
            f"Street consensus: {rating} with mean TP of ₹{target:.0f}{upside_str}. "
            f"{result.get('recommendations_summary', '')}."
        )

    # Defence-sector specific commentary
    commentary.append(
        f"{meta['short']} operates in {meta['sub_sector']}, a segment benefiting directly from "
        "India's ₹6.2L Cr defence budget (FY25), rising indigenisation mandates under Atmanirbhar Bharat, "
        "and the government's push to increase domestic procurement from 64% to 75%+ of capital budget."
    )
    commentary.append(
        "Order book visibility remains a key investor focus — defence companies typically carry "
        "book-to-bill ratios of 3–5x, providing multi-year revenue visibility."
    )

    # ROCE commentary
    if annual_roce:
        latest_roce = annual_roce[-1]["roce"] if annual_roce else None
        if latest_roce:
            roce_quality = "excellent" if latest_roce > 25 else "healthy" if latest_roce > 15 else "below-average"
            highlights.append(
                f"ROCE of {latest_roce:.1f}% ({roce_quality} relative to defence peer median of ~18%). "
                "Capital-light model with high IP content commands premium multiple."
            )

    # Risks
    risks.extend([
        "Programme delays and budget reallocation risk — defence procurement timelines in India can slip 12–36 months, "
        "directly impacting revenue recognition timing.",
        "Customer concentration: MoD/Armed Forces typically represent 80–95% of revenue, creating single-customer dependency.",
        "Working capital intensity — advance payments from MoD offset by milestone-based billing cycles create lumpy cash flows.",
        "Technology obsolescence and offset obligation requirements under DPP may dilute margins on large contracts.",
        "Valuation risk — defence sector trades at a significant premium (20–40% above Nifty midcap average P/E); "
        "any macro or rate shock could compress multiples disproportionately.",
    ])

    result["key_highlights"] = highlights
    result["management_commentary"] = commentary
    result["risks"] = risks

    # ── IC Verdict ────────────────────────────────────────────────────────────
    pe = _safe(info.get("trailingPE"))
    roe = _safe(info.get("returnOnEquity"))
    verdict_parts = []
    if pe and pe < 40:
        verdict_parts.append(f"Relative value at {pe:.1f}x P/E vs sector avg >60x.")
    elif pe:
        verdict_parts.append(f"Premium valuation at {pe:.1f}x P/E; requires sustained high growth to justify.")
    if roe:
        verdict_parts.append(f"ROE of {roe*100:.1f}% {'above' if roe > 0.18 else 'below'} our 18% hurdle.")
    if isinstance(rev_yoy, (int, float)):
        verdict_parts.append(f"Revenue growth of {rev_yoy:+.1f}% YoY — {'in line with' if 10 < rev_yoy < 25 else 'above' if rev_yoy >= 25 else 'below'} our base case.")

    result["ic_verdict"] = " ".join(verdict_parts) if verdict_parts else "Insufficient data for IC verdict."

    return result
