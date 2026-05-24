"""
PE-grade investor report generator — .docx
Structured as a Private Equity / Fund IC Memorandum.
© Nishant Prabhakar
"""

import io
from datetime import datetime
from typing import Optional

from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import pandas as pd

# ── Brand colours ─────────────────────────────────────────────────────────────
NAVY      = RGBColor(0x0d, 0x11, 0x17)
DARK_BLUE = RGBColor(0x1f, 0x6f, 0xeb)
ACCENT    = RGBColor(0x58, 0xa6, 0xff)
GREEN_C   = RGBColor(0x3f, 0xb9, 0x50)
AMBER_C   = RGBColor(0xe3, 0xb3, 0x41)
RED_C     = RGBColor(0xf8, 0x51, 0x49)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT     = RGBColor(0xF6, 0xF8, 0xFA)
GREY      = RGBColor(0x57, 0x60, 0x6e)
TEXT_C    = RGBColor(0x1f, 0x23, 0x28)

COPYRIGHT = f"© {datetime.now().year} Nishant Prabhakar  ·  India Defence Investor Hub"
DISCLAIMER = (
    "This document is prepared for informational purposes only and does not constitute "
    "investment advice. Data sourced from public exchanges and Yahoo Finance. "
    "Past performance is not indicative of future results."
)


# ── XML helpers ───────────────────────────────────────────────────────────────

def _set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def _cell_borders(cell, color="D0D7DE"):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ["top", "left", "bottom", "right"]:
        b = OxmlElement(f"w:{side}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), "4")
        b.set(qn("w:space"), "0")
        b.set(qn("w:color"), color)
        tcBorders.append(b)
    tcPr.append(tcBorders)


def _hr(doc, color="1F6FEB"):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    pPr.append(pBdr)
    return p


def _set_margins(doc, top=2, bottom=2, left=2.5, right=2.5):
    for sec in doc.sections:
        sec.top_margin    = Cm(top)
        sec.bottom_margin = Cm(bottom)
        sec.left_margin   = Cm(left)
        sec.right_margin  = Cm(right)


# ── Typography helpers ────────────────────────────────────────────────────────

def _p(doc, text="", size=10, bold=False, italic=False,
       color=None, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=4):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after  = Pt(space_after)
    if text:
        run = p.add_run(text)
        run.font.size   = Pt(size)
        run.font.bold   = bold
        run.font.italic = italic
        if color:
            run.font.color.rgb = color
    return p


def _h1(doc, text: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run(text.upper())
    run.font.size  = Pt(11)
    run.font.bold  = True
    run.font.color.rgb = DARK_BLUE
    run.font.all_caps  = True
    _hr(doc)
    return p


def _h2(doc, text: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after  = Pt(3)
    run = p.add_run(text)
    run.font.size  = Pt(10)
    run.font.bold  = True
    run.font.color.rgb = TEXT_C
    return p


def _bullet(doc, text: str, level=0):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after  = Pt(3)
    p.paragraph_format.left_indent  = Pt(18 + level * 12)
    run = p.add_run(text)
    run.font.size = Pt(9.5)
    return p


def _cr(val):
    if val is None:
        return "—"
    if isinstance(val, str):
        return val
    if val >= 100000:
        return f"₹{val/100000:.1f}L Cr"
    if val >= 1000:
        return f"₹{val/1000:.1f}K Cr"
    return f"₹{val:,.0f} Cr"


def _pct(val):
    if val is None:
        return "—"
    if isinstance(val, str):
        return val
    return f"{val:.1f}%"


def _ratio(val, suffix="x"):
    if val is None:
        return "—"
    if isinstance(val, str):
        return val
    return f"{val:.1f}{suffix}"


def _delta_color(val):
    if isinstance(val, (int, float)):
        return GREEN_C if val >= 0 else RED_C
    return TEXT_C


# ── KV metric table ───────────────────────────────────────────────────────────

def _kv_table(doc, rows: list, cols=2):
    """
    rows: list of (label, value) tuples.
    Creates a compact borderless 2-column KV table, cols pairs per row.
    """
    ncols = cols * 2
    tbl = doc.add_table(rows=0, cols=ncols)
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT

    # Set column widths
    for cell in tbl.columns[0].cells if tbl.rows else []:
        pass

    for i in range(0, len(rows), cols):
        tr = tbl.add_row()
        for j in range(cols):
            if i + j >= len(rows):
                break
            label, value = rows[i + j]
            lc = tr.cells[j * 2]
            vc = tr.cells[j * 2 + 1]

            lc.text = str(label)
            lc.paragraphs[0].runs[0].font.size  = Pt(8.5)
            lc.paragraphs[0].runs[0].font.color.rgb = GREY
            lc.paragraphs[0].runs[0].font.bold  = False
            _set_cell_bg(lc, "F6F8FA")
            _cell_borders(lc)

            vc.text = str(value) if value is not None else "—"
            vc.paragraphs[0].runs[0].font.size  = Pt(9)
            vc.paragraphs[0].runs[0].font.bold  = True
            vc.paragraphs[0].runs[0].font.color.rgb = TEXT_C
            _set_cell_bg(vc, "FFFFFF")
            _cell_borders(vc)
    return tbl


def _data_table(doc, headers: list, data: list, header_bg="0D1117"):
    """Full data table with header row and alternating stripes."""
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT

    hdr = tbl.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = str(h)
        _set_cell_bg(cell, header_bg)
        run = cell.paragraphs[0].runs[0]
        run.font.color.rgb = WHITE
        run.font.bold  = True
        run.font.size  = Pt(8.5)
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    for row_idx, row_data in enumerate(data):
        tr = tbl.add_row()
        bg = "F6F8FA" if row_idx % 2 == 0 else "FFFFFF"
        for i, val in enumerate(row_data):
            cell = tr.cells[i]
            cell.text = str(val) if val is not None else "—"
            _set_cell_bg(cell, bg)
            _cell_borders(cell)
            run = cell.paragraphs[0].runs[0]
            run.font.size = Pt(8.5)
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    return tbl


def _add_chart(doc, chart_bytes: bytes, width_inches=6.0):
    if chart_bytes:
        doc.add_picture(io.BytesIO(chart_bytes), width=Inches(width_inches))


# ── Cover page ────────────────────────────────────────────────────────────────

def _cover(doc, company_name: str, report_type: str, sub_sector: str = ""):
    # Navy cover block
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(60)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run("INDIA DEFENCE SECTOR")
    run.font.size  = Pt(9)
    run.font.bold  = True
    run.font.color.rgb = ACCENT
    run.font.all_caps  = True

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(company_name)
    run.font.size  = Pt(28)
    run.font.bold  = True
    run.font.color.rgb = NAVY

    if sub_sector:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(16)
        run = p.add_run(sub_sector)
        run.font.size  = Pt(12)
        run.font.color.rgb = GREY

    _hr(doc, "1F6FEB")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    run = p.add_run(report_type)
    run.font.size  = Pt(16)
    run.font.bold  = True
    run.font.color.rgb = DARK_BLUE

    doc.add_paragraph()
    p = _p(doc, f"Prepared: {datetime.now().strftime('%d %B %Y')}", size=10, color=GREY)
    _p(doc, COPYRIGHT, size=9, italic=True, color=GREY)

    doc.add_paragraph()
    _p(doc, DISCLAIMER, size=8, italic=True, color=GREY)
    doc.add_page_break()


# ── Executive summary box ─────────────────────────────────────────────────────

def _exec_summary(doc, metrics: dict, briefing: dict):
    _h1(doc, "01 · Executive Summary")

    # Headline stats strip
    price = metrics.get("current_price")
    mktcap = metrics.get("market_cap_cr")
    pe     = metrics.get("pe_ratio")
    target = briefing.get("analyst_target")
    rating = briefing.get("analyst_rating", "N/A")

    upside = None
    if target and price and price > 0:
        upside = round((target - price) / price * 100, 1)

    summary_kv = [
        ("Market Cap",       _cr(mktcap)),
        ("CMP",              f"₹{price:,.0f}" if price else "—"),
        ("P/E (TTM)",        _ratio(pe)),
        ("Analyst Rating",   rating),
        ("Consensus TP",     f"₹{target:,.0f}" if target else "—"),
        ("Implied Upside",   f"{upside:+.1f}%" if upside else "—"),
        ("52W High / Low",   f"₹{metrics.get('52w_high') or '—'} / ₹{metrics.get('52w_low') or '—'}"),
        ("EPS (TTM)",        f"₹{metrics.get('eps_ttm') or '—'}"),
    ]
    _kv_table(doc, summary_kv, cols=2)
    doc.add_paragraph()

    # IC Verdict
    verdict = briefing.get("ic_verdict", "")
    if verdict:
        _h2(doc, "IC Verdict")
        _p(doc, verdict, size=10, italic=True, color=DARK_BLUE)

    # Key highlights
    highlights = briefing.get("key_highlights", [])
    if highlights:
        _h2(doc, "Key Highlights")
        for h in highlights:
            _bullet(doc, h)


# ── Investment thesis ─────────────────────────────────────────────────────────

def _investment_thesis(doc, meta: dict, metrics: dict, briefing: dict):
    _h1(doc, "02 · Investment Thesis & Business Overview")

    _h2(doc, "Business Description")
    _p(doc, meta.get("description", ""), size=10)
    doc.add_paragraph()

    _h2(doc, "Sector Tailwinds")
    tailwinds = [
        "India's defence budget at ₹6.2L Cr (FY25), growing at ~13% CAGR over five years — "
        "one of the world's largest defence spends.",
        "Indigenisation mandate: Government targeting 75%+ of capital procurement from domestic suppliers "
        "by FY26, up from ~60% in FY22 — directly benefiting listed defence PSUs and private players.",
        "Positive List of 509+ defence items banned from import, forcing MoD procurement from domestic OEMs.",
        "iDEX, Technology Development Fund (TDF), and DRDO spin-offs creating a commercial pipeline for "
        "private defence players.",
        f"{meta['short']} in {meta['sub_sector']} — a sub-segment with structurally expanding TAM due to "
        "modernisation of Indian armed forces across all three services.",
    ]
    for t in tailwinds:
        _bullet(doc, t)
    doc.add_paragraph()

    _h2(doc, "Company-Specific Investment Case")
    commentary = briefing.get("management_commentary", [])
    for c in commentary:
        _bullet(doc, c)


# ── Financial deep-dive ───────────────────────────────────────────────────────

def _financial_deepdive(doc, metrics: dict, trend_df: pd.DataFrame,
                        quarterly_df: pd.DataFrame, charts: dict):
    _h1(doc, "03 · Financial Analysis")

    # P&L summary
    _h2(doc, "Profit & Loss — Annual")
    pl_kv = [
        ("Revenue (FY Latest)",    _cr(metrics.get("revenue_cr"))),
        ("Revenue Growth (YoY)",   _pct(metrics.get("revenue_growth_yoy"))),
        ("EBITDA",                 _cr(metrics.get("ebitda_cr"))),
        ("EBITDA Margin",          _pct(metrics.get("ebitda_margin"))),
        ("EBIT",                   _cr(metrics.get("ebit_cr"))),
        ("PAT",                    _cr(metrics.get("pat_cr"))),
        ("PAT Margin",             _pct(metrics.get("pat_margin"))),
        ("EPS (TTM)",              f"₹{metrics.get('eps_ttm') or '—'}"),
    ]
    _kv_table(doc, pl_kv, cols=2)
    doc.add_paragraph()

    # Balance sheet strength
    _h2(doc, "Balance Sheet Strength")
    bs_kv = [
        ("Total Debt",             _cr(metrics.get("total_debt_cr"))),
        ("Cash & Equivalents",     _cr(metrics.get("cash_cr"))),
        ("Net Debt",               _cr((metrics.get("total_debt_cr") or 0) - (metrics.get("cash_cr") or 0)) if metrics.get("total_debt_cr") is not None else "—"),
        ("Total Equity",           _cr(metrics.get("equity_cr"))),
        ("Debt / Equity",          _ratio(metrics.get("debt_to_equity"))),
        ("Beta",                   _ratio(metrics.get("beta"), "")),
    ]
    _kv_table(doc, bs_kv, cols=2)
    doc.add_paragraph()

    # Return metrics
    _h2(doc, "Return Metrics")
    ret_kv = [
        ("ROE",       _pct(metrics.get("roe"))),
        ("ROA",       _pct(metrics.get("roa"))),
        ("Div Yield", _pct(metrics.get("dividend_yield"))),
        ("P/B Ratio", _ratio(metrics.get("pb_ratio"))),
    ]
    _kv_table(doc, ret_kv, cols=2)
    doc.add_paragraph()

    # Revenue / PAT trend chart
    if "revenue_pat_bar" in charts and charts["revenue_pat_bar"]:
        _h2(doc, "Revenue & PAT Trend")
        _add_chart(doc, charts["revenue_pat_bar"])
        doc.add_paragraph()

    # Margin waterfall
    if "margin_waterfall" in charts and charts["margin_waterfall"]:
        _h2(doc, "Profitability Cascade (Revenue → EBITDA → EBIT → PAT)")
        _add_chart(doc, charts["margin_waterfall"])
        doc.add_paragraph()

    # Quarterly chart
    if "quarterly_trend" in charts and charts["quarterly_trend"]:
        _h2(doc, "Quarterly Performance Trend (Last 8 Quarters)")
        _add_chart(doc, charts["quarterly_trend"])
        doc.add_paragraph()

    # Annual trend table
    if not trend_df.empty:
        _h2(doc, "5-Year Annual Financial Summary (₹ Cr)")
        _add_df_as_table(doc, trend_df)
        doc.add_paragraph()

    # Quarterly table
    if not quarterly_df.empty:
        _h2(doc, "Quarterly Performance (₹ Cr)")
        _add_df_as_table(doc, quarterly_df)


# ── Valuation section ─────────────────────────────────────────────────────────

def _valuation(doc, metrics: dict, briefing: dict, all_metrics: list):
    _h1(doc, "04 · Valuation & Peer Benchmarking")

    _h2(doc, "Current Trading Multiples")
    val_kv = [
        ("P/E (TTM)",    _ratio(metrics.get("pe_ratio"))),
        ("Forward P/E",  _ratio(metrics.get("ev_ebitda"))),
        ("EV/EBITDA",    _ratio(metrics.get("ev_ebitda"))),
        ("P/B",          _ratio(metrics.get("pb_ratio"))),
        ("Market Cap",   _cr(metrics.get("market_cap_cr"))),
        ("Beta",         _ratio(metrics.get("beta"), "")),
    ]
    _kv_table(doc, val_kv, cols=2)
    doc.add_paragraph()

    # Analyst consensus
    _h2(doc, "Analyst Consensus")
    analyst_kv = [
        ("Rating",           briefing.get("analyst_rating", "N/A")),
        ("Mean Target Price",f"₹{briefing.get('analyst_target'):,.0f}" if briefing.get("analyst_target") else "—"),
        ("No. of Analysts",  str(briefing.get("analyst_count") or "N/A")),
        ("Buy/Hold/Sell",    briefing.get("recommendations_summary", "N/A")),
    ]
    _kv_table(doc, analyst_kv, cols=2)
    doc.add_paragraph()

    # Peer comparison table
    if all_metrics and len(all_metrics) > 1:
        _h2(doc, "Peer Comparison")
        headers = ["Company", "Mkt Cap", "Revenue", "PAT Margin", "P/E", "EV/EBITDA", "ROE", "D/E"]
        data = []
        for m in sorted(all_metrics, key=lambda x: x.get("market_cap_cr") or 0, reverse=True):
            data.append([
                m["short"],
                _cr(m.get("market_cap_cr")),
                _cr(m.get("revenue_cr")),
                _pct(m.get("pat_margin")),
                _ratio(m.get("pe_ratio")),
                _ratio(m.get("ev_ebitda")),
                _pct(m.get("roe")),
                _ratio(m.get("debt_to_equity")),
            ])
        _data_table(doc, headers, data)
        doc.add_paragraph()

    # Price performance
    _h2(doc, "Price Performance")
    price_kv = [
        ("1-Year Return",  _pct(metrics.get("price_return_1y"))),
        ("5-Year Return",  _pct(metrics.get("price_return_5y"))),
        ("52-Week High",   f"₹{metrics.get('52w_high') or '—'}"),
        ("52-Week Low",    f"₹{metrics.get('52w_low') or '—'}"),
        ("Avg 30d Volume", f"{metrics.get('avg_volume', '—'):,}" if metrics.get('avg_volume') else "—"),
        ("Beta",           _ratio(metrics.get("beta"), "")),
    ]
    _kv_table(doc, price_kv, cols=2)


# ── Earnings briefing section ─────────────────────────────────────────────────

def _earnings_section(doc, briefing: dict):
    _h1(doc, "05 · Latest Earnings Briefing")

    # Quarter header
    lq = briefing.get("latest_quarter", "N/A")
    _h2(doc, f"Quarter: {lq}")

    # QoQ / YoY performance table
    headers = ["Metric", "Latest Qtr", "Prior Qtr", "PY Qtr", "QoQ Δ", "YoY Δ"]
    data = [
        ["Revenue", briefing.get("revenue_lq"), briefing.get("revenue_pq"),
         briefing.get("revenue_pyq"),
         _pct(briefing.get("revenue_qoq")), _pct(briefing.get("revenue_yoy"))],
        ["PAT",     briefing.get("pat_lq"),     briefing.get("pat_pq"),
         briefing.get("pat_pyq"),
         _pct(briefing.get("pat_qoq")),     _pct(briefing.get("pat_yoy"))],
        ["EBITDA",  briefing.get("ebitda_lq"),  "—", "—", "—", "—"],
        ["EBITDA Margin", _pct(briefing.get("ebitda_margin_lq")), "—", "—", "—", "—"],
        ["PAT Margin",    _pct(briefing.get("pat_margin_lq")),    "—", "—", "—", "—"],
    ]
    _data_table(doc, headers, data)
    doc.add_paragraph()

    # EPS vs estimate
    _h2(doc, "EPS vs Consensus Estimate")
    eps_kv = [
        ("Reported EPS (TTM)",  f"₹{briefing.get('eps_lq') or '—'}"),
        ("Forward EPS Est.",    f"₹{briefing.get('eps_estimate') or '—'}"),
        ("EPS Beat / Miss",     f"{briefing.get('eps_surprise_pct'):+.1f}%" if isinstance(briefing.get("eps_surprise_pct"), (int, float)) else "N/A"),
    ]
    _kv_table(doc, eps_kv, cols=2)
    doc.add_paragraph()

    # IC commentary
    _h2(doc, "IC Commentary")
    for c in briefing.get("management_commentary", []):
        _bullet(doc, c)


# ── Risk section ──────────────────────────────────────────────────────────────

def _risk_section(doc, briefing: dict, metrics: dict):
    _h1(doc, "06 · Key Risks & Mitigants")

    risks = briefing.get("risks", [])
    risk_mitigant_pairs = [
        (risks[0] if len(risks) > 0 else "Programme delay risk.",
         "Diversified programme portfolio and healthy order backlog provide partial buffer; "
         "milestone-based billing reduces P&L impact of individual slippages."),
        (risks[1] if len(risks) > 1 else "Customer concentration risk.",
         "Rising export ambitions and dual-use commercial revenues reduce dependency; "
         "Government's long-term defence policy provides structural demand floor."),
        (risks[2] if len(risks) > 2 else "Working capital intensity.",
         "Defence companies typically receive 10–20% advance payments, partly offsetting WC stress; "
         "strong balance sheet provides liquidity cushion."),
        (risks[3] if len(risks) > 3 else "Technology risk.",
         "Established R&D partnerships with DRDO and DPSUs mitigate; "
         "proprietary IP reduces commoditisation risk."),
        (risks[4] if len(risks) > 4 else "Valuation risk.",
         f"D/E of {_ratio(metrics.get('debt_to_equity'))} and "
         f"cash position of {_cr(metrics.get('cash_cr'))} provide balance sheet resilience during market stress."),
    ]

    headers = ["Risk Factor", "Mitigant"]
    data = [[r, m] for r, m in risk_mitigant_pairs]
    _data_table(doc, headers, data)


# ── Shareholding section ──────────────────────────────────────────────────────

def _shareholding_section(doc, metrics: dict, raw_data: dict, charts: dict):
    _h1(doc, "07 · Shareholding & Governance")

    promoter = metrics.get("promoter_holding_pct")
    inst     = metrics.get("institutional_holding_pct")
    retail   = max(0, 100 - (promoter or 0) - (inst or 0))

    sh_kv = [
        ("Promoter / Govt",    _pct(promoter)),
        ("Institutional",      _pct(inst)),
        ("Public / Retail",    _pct(retail)),
        ("Div Yield",          _pct(metrics.get("dividend_yield"))),
    ]
    _kv_table(doc, sh_kv, cols=2)
    doc.add_paragraph()

    if "shareholding_donut" in charts and charts["shareholding_donut"]:
        _add_chart(doc, charts["shareholding_donut"], width_inches=4.5)
        doc.add_paragraph()

    inst_holders = raw_data.get("institutional_holders", pd.DataFrame())
    if not inst_holders.empty:
        _h2(doc, "Top Institutional Holders")
        cols = inst_holders.columns.tolist()[:4]
        headers = [str(c) for c in cols]
        data = []
        for _, row in inst_holders.head(10).iterrows():
            data.append([str(row[c])[:60] for c in cols])
        _data_table(doc, headers, data)


# ── Appendix ──────────────────────────────────────────────────────────────────

def _appendix(doc, annual_fins: pd.DataFrame, annual_bs: pd.DataFrame,
               annual_cf: pd.DataFrame):
    _h1(doc, "Appendix · Full Financial Statements")

    if not annual_fins.empty:
        _h2(doc, "A1 · Annual Income Statement")
        _add_raw_df(doc, annual_fins)
        doc.add_paragraph()

    if not annual_bs.empty:
        _h2(doc, "A2 · Annual Balance Sheet")
        _add_raw_df(doc, annual_bs)
        doc.add_paragraph()

    if not annual_cf.empty:
        _h2(doc, "A3 · Annual Cash Flow Statement")
        _add_raw_df(doc, annual_cf)


def _add_raw_df(doc: Document, df: pd.DataFrame):
    if df.empty:
        return
    cols = ["Item"] + [str(c)[:10] for c in df.columns.tolist()[:5]]
    data = []
    for label, row in df.iterrows():
        vals = []
        for col in df.columns[:5]:
            v = row.get(col)
            if v is None or (isinstance(v, float) and __import__("numpy").isnan(v)):
                vals.append("—")
            else:
                vals.append(f"₹{v/1e7:,.1f} Cr" if abs(v) > 1e5 else str(round(v, 2)))
        data.append([str(label)[:50]] + vals)
    _data_table(doc, cols, data, header_bg="0D1117")


def _add_df_as_table(doc: Document, df: pd.DataFrame):
    if df.empty:
        return
    cols = df.columns.tolist()
    data = []
    for _, row in df.iterrows():
        data.append([str(row[c]) if row[c] is not None else "—" for c in cols])
    _data_table(doc, [str(c) for c in cols], data)


def _footer_note(doc):
    _hr(doc, "30363d")
    doc.add_paragraph()
    p = _p(doc, f"{COPYRIGHT}  ·  {DISCLAIMER}", size=7.5, italic=True, color=GREY)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC ENTRY POINTS
# ═══════════════════════════════════════════════════════════════════════════════

def build_company_docx(
    metrics: dict,
    chart_bytes: dict,
    trend_df: pd.DataFrame,
    quarterly_df: pd.DataFrame,
    annual_fins: pd.DataFrame,
    briefing: dict = None,
    all_metrics: list = None,
    raw_data: dict = None,
) -> bytes:
    """Full PE-grade single-company IC memorandum."""
    if briefing is None:
        briefing = {}
    if all_metrics is None:
        all_metrics = [metrics]
    if raw_data is None:
        raw_data = {}

    doc = Document()
    _set_margins(doc)

    _cover(doc, metrics.get("name", "Company"),
           "Investment Committee Memorandum",
           metrics.get("sub_sector", ""))
    _exec_summary(doc, metrics, briefing)
    doc.add_page_break()
    _investment_thesis(doc, metrics, metrics, briefing)
    doc.add_page_break()
    _financial_deepdive(doc, metrics, trend_df, quarterly_df, chart_bytes)
    doc.add_page_break()
    _valuation(doc, metrics, briefing, all_metrics)
    doc.add_page_break()
    _earnings_section(doc, briefing)
    doc.add_page_break()
    _risk_section(doc, briefing, metrics)
    doc.add_page_break()
    _shareholding_section(doc, metrics, raw_data, chart_bytes)
    doc.add_page_break()
    _appendix(doc,
              annual_fins,
              raw_data.get("balance_sheet", pd.DataFrame()),
              raw_data.get("cashflow", pd.DataFrame()))
    _footer_note(doc)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


def build_sector_docx(all_metrics: list, chart_bytes: dict,
                      briefings: dict = None) -> bytes:
    """Sector-wide IC report with peer benchmarking and all company snapshots."""
    if briefings is None:
        briefings = {}

    doc = Document()
    _set_margins(doc)

    _cover(doc, "India Listed Defence Sector",
           "Sector Investment Review — IC Briefing Pack",
           "Aerospace · Electronics · Shipbuilding · Missiles · Drones")

    # ── Sector overview ──
    _h1(doc, "01 · Sector Overview")
    valid_mc = [m["market_cap_cr"] for m in all_metrics if m.get("market_cap_cr")]
    total_mc = sum(valid_mc) if valid_mc else None
    avg_pe   = sum(m["pe_ratio"] for m in all_metrics if m.get("pe_ratio")) / max(
               1, sum(1 for m in all_metrics if m.get("pe_ratio")))

    sector_kv = [
        ("Total Market Cap",      _cr(total_mc)),
        ("Companies Covered",     str(len(all_metrics))),
        ("Sector Avg P/E",        f"{avg_pe:.1f}x"),
        ("India Defence Budget",  "₹6.2L Cr (FY25)"),
        ("Budget Growth (5Y CAGR)","~13%"),
        ("Indigenisation Target", "75% by FY26"),
    ]
    _kv_table(doc, sector_kv, cols=2)
    doc.add_paragraph()

    # Macro context
    _h2(doc, "Macro Context")
    bullets = [
        "India is the world's 4th largest military spender; defence budget has grown 13% CAGR over FY20–25.",
        "Government's Positive List now bans 509+ defence items from import, creating a captive domestic demand pool.",
        "DPP 2020 introduced 'Aatmanirbhar Bharat' categories — essentially mandating 50–60% minimum domestic content.",
        "Defence exports surged to ₹21,083 Cr (FY24) vs ₹686 Cr (FY14) — a 30x increase in a decade.",
        "Listed Indian defence universe has re-rated 3–10x in market cap over FY20–24, reflecting structural shift.",
    ]
    for b in bullets:
        _bullet(doc, b)

    # Sector charts
    doc.add_page_break()
    _h1(doc, "02 · Sector Charts")

    for key, caption in [
        ("revenue_comparison",  "Revenue & PAT Comparison (₹ Cr)"),
        ("market_cap_bubble",   "Valuation vs Profitability (Bubble = Market Cap)"),
        ("return_heatmap",      "1Y & 5Y Price Return Heatmap"),
        ("roe_roa_scatter",     "ROE vs ROA — Return Quality"),
        ("roce_comparison",     "ROCE Trend — Historical"),
        ("margin_comparison",   "EBITDA & PAT Margin Comparison"),
        ("fcf_chart",           "Free Cash Flow Generation"),
        ("working_capital",     "Working Capital Intensity (DSO & DIO)"),
    ]:
        if key in chart_bytes and chart_bytes[key]:
            _h2(doc, caption)
            _add_chart(doc, chart_bytes[key], width_inches=6.2)
            doc.add_paragraph()

    # Peer comparison table
    doc.add_page_break()
    _h1(doc, "03 · Full Peer Comparison")
    headers = ["Company", "Sub-sector", "Mkt Cap", "Revenue", "PAT",
               "PAT Mgn", "EBITDA Mgn", "P/E", "EV/EBITDA", "ROE", "D/E", "1Y Rtn"]
    data = []
    for m in sorted(all_metrics, key=lambda x: x.get("market_cap_cr") or 0, reverse=True):
        data.append([
            m["short"], m.get("sub_sector", ""),
            _cr(m.get("market_cap_cr")), _cr(m.get("revenue_cr")), _cr(m.get("pat_cr")),
            _pct(m.get("pat_margin")), _pct(m.get("ebitda_margin")),
            _ratio(m.get("pe_ratio")), _ratio(m.get("ev_ebitda")),
            _pct(m.get("roe")), _ratio(m.get("debt_to_equity")),
            _pct(m.get("price_return_1y")),
        ])
    _data_table(doc, headers, data)
    doc.add_paragraph()

    # Individual company snapshots
    doc.add_page_break()
    _h1(doc, "04 · Company Snapshots")
    for m in all_metrics:
        _h2(doc, f"{m['name']} ({m['short']})")
        briefing = briefings.get(m["ticker"], {})
        snap_kv = [
            ("Market Cap",     _cr(m.get("market_cap_cr"))),
            ("Revenue",        _cr(m.get("revenue_cr"))),
            ("PAT",            _cr(m.get("pat_cr"))),
            ("PAT Margin",     _pct(m.get("pat_margin"))),
            ("P/E",            _ratio(m.get("pe_ratio"))),
            ("ROE",            _pct(m.get("roe"))),
            ("Rating",         briefing.get("analyst_rating", "N/A")),
            ("1Y Return",      _pct(m.get("price_return_1y"))),
        ]
        _kv_table(doc, snap_kv, cols=2)
        ic_verdict = briefing.get("ic_verdict", "")
        if ic_verdict:
            _p(doc, f"IC Note: {ic_verdict}", size=9, italic=True, color=GREY,
               space_before=4, space_after=8)
        _hr(doc, "30363d")

    # Earnings highlights
    doc.add_page_break()
    _h1(doc, "05 · Latest Earnings Highlights")
    for m in all_metrics:
        briefing = briefings.get(m["ticker"], {})
        if not briefing:
            continue
        _h2(doc, f"{m['short']} — {briefing.get('latest_quarter', 'N/A')}")
        qkv = [
            ("Revenue",       briefing.get("revenue_lq", "N/A")),
            ("YoY Δ",         _pct(briefing.get("revenue_yoy"))),
            ("PAT",           briefing.get("pat_lq", "N/A")),
            ("PAT YoY Δ",     _pct(briefing.get("pat_yoy"))),
            ("EBITDA Margin", _pct(briefing.get("ebitda_margin_lq"))),
            ("PAT Margin",    _pct(briefing.get("pat_margin_lq"))),
        ]
        _kv_table(doc, qkv, cols=2)
        highlights = briefing.get("key_highlights", [])
        for h in highlights[:3]:
            _bullet(doc, h)
        doc.add_paragraph()

    _footer_note(doc)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
