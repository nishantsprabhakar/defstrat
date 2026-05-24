"""
Historical financial comparison across companies.
Produces matplotlib charts comparing multi-year trends.
"""

import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

PRIMARY   = "#58a6ff"
GREEN     = "#3fb950"
AMBER     = "#e3b341"
RED       = "#f85149"
PURPLE    = "#bc8cff"
TEAL      = "#39d353"
DARK_BG   = "#0d1117"
CARD_BG   = "#161b22"
BORDER    = "#30363d"
TEXT      = "#e6edf3"
MUTED     = "#8b949e"
GRID      = "#21262d"

PALETTE = [PRIMARY, GREEN, AMBER, PURPLE, TEAL, RED,
           "#ffa657", "#79c0ff", "#56d364", "#ff7b72"]


def _fig_to_bytes(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                facecolor=DARK_BG, edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _style_ax(ax, title=""):
    ax.set_facecolor(DARK_BG)
    ax.set_title(title, color=TEXT, fontsize=11, fontweight="bold", pad=10)
    ax.tick_params(colors=MUTED, labelsize=8)
    ax.xaxis.label.set_color(MUTED)
    ax.yaxis.label.set_color(MUTED)
    for spine in ax.spines.values():
        spine.set_color(BORDER)
    ax.grid(axis="y", color=GRID, linewidth=0.6, linestyle="--")


def _cr_label(val):
    if val is None:
        return "N/A"
    if val >= 100000:
        return f"₹{val/100000:.1f}L Cr"
    if val >= 1000:
        return f"₹{val/1000:.1f}K Cr"
    return f"₹{val:,.0f} Cr"


def _extract_annual_series(raw_data: dict, label: str, scale=1e7) -> dict:
    """Return {year: value_in_crores} from annual financials."""
    fins = raw_data.get("financials", pd.DataFrame())
    if fins.empty:
        return {}
    matches = [r for r in fins.index if label.lower() in str(r).lower()]
    if not matches:
        return {}
    row = fins.loc[matches[0]]
    result = {}
    for col in fins.columns:
        v = row.get(col)
        if v is not None and not (isinstance(v, float) and np.isnan(v)):
            result[str(col)[:4]] = round(float(v) / scale, 2)
    return result


def _compute_roce(raw_data: dict) -> dict:
    """ROCE = EBIT / (Equity + Debt) per year."""
    fins = raw_data.get("financials", pd.DataFrame())
    bs   = raw_data.get("balance_sheet", pd.DataFrame())
    if fins.empty or bs.empty:
        return {}

    def _row(label, df):
        m = [r for r in df.index if label.lower() in str(r).lower()]
        return df.loc[m[0]] if m else None

    ebit_row = _row("EBIT", fins)
    if ebit_row is None:
        ebit_row = _row("Operating Income", fins)
    eq_row = _row("Total Stockholder Equity", bs)
    if eq_row is None:
        eq_row = _row("Stockholders Equity", bs)
    dt_row   = _row("Total Debt", bs)

    result = {}
    for col in fins.columns:
        try:
            ebit = float(ebit_row.get(col)) if ebit_row is not None else None
            eq   = float(eq_row.get(col))   if eq_row   is not None else None
            dt   = float(dt_row.get(col))   if dt_row   is not None else None
            if ebit and eq and dt and (eq + dt) > 0:
                result[str(col)[:4]] = round(ebit / (eq + dt) * 100, 1)
        except Exception:
            continue
    return result


def _compute_fcf(raw_data: dict) -> dict:
    """FCF = Operating Cash Flow - Capex."""
    cf = raw_data.get("cashflow", pd.DataFrame())
    if cf.empty:
        return {}

    def _row(label):
        m = [r for r in cf.index if label.lower() in str(r).lower()]
        return cf.loc[m[0]] if m else None

    ocf_row = _row("Operating Cash Flow")
    if ocf_row is None:
        ocf_row = _row("Total Cash From Operating Activities")
    capex_row = _row("Capital Expenditure")
    if capex_row is None:
        capex_row = _row("Capital Expenditures")

    result = {}
    for col in cf.columns:
        try:
            ocf   = float(ocf_row.get(col))   if ocf_row   is not None else None
            capex = float(capex_row.get(col)) if capex_row is not None else None
            if ocf is not None and capex is not None:
                result[str(col)[:4]] = round((ocf + capex) / 1e7, 2)  # capex is negative
        except Exception:
            continue
    return result


# ── Comparison charts ─────────────────────────────────────────────────────────

def revenue_growth_comparison(all_metrics: list, all_raw: dict) -> bytes:
    """Multi-company revenue CAGR waterfall-style grouped bar."""
    companies = []
    for m in all_metrics:
        series = _extract_annual_series(all_raw.get(m["ticker"], {}), "Total Revenue")
        if len(series) >= 2:
            years = sorted(series.keys())
            vals = [float(series[y]) if series[y] is not None else np.nan for y in years]
            companies.append({"short": m["short"], "years": years, "vals": vals})

    if not companies:
        return _placeholder_bytes("No revenue history available")

    # Get common years
    all_years = sorted(set(y for c in companies for y in c["years"]))[-5:]

    fig, ax = plt.subplots(figsize=(12, 5), facecolor=DARK_BG)
    _style_ax(ax, "5-Year Revenue Trend Comparison (₹ Cr)")

    x = np.arange(len(all_years))
    width = 0.8 / max(len(companies), 1)

    for i, co in enumerate(companies):
        raw_vals = [co["vals"][co["years"].index(y)] if y in co["years"] else np.nan for y in all_years]
        vals = [float(v) if v is not None else np.nan for v in raw_vals]
        bars = ax.bar(x + i * width - (len(companies) - 1) * width / 2, vals,
                      width=width * 0.85, label=co["short"],
                      color=PALETTE[i % len(PALETTE)], alpha=0.9)

    ax.set_xticks(x)
    ax.set_xticklabels(all_years, color=MUTED, fontsize=9)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: _cr_label(v)))
    ax.legend(fontsize=8, facecolor=CARD_BG, edgecolor=BORDER, labelcolor=TEXT)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def roce_comparison_chart(all_metrics: list, all_raw: dict) -> bytes:
    """ROCE trend comparison — key PE return metric."""
    fig, ax = plt.subplots(figsize=(11, 5), facecolor=DARK_BG)
    _style_ax(ax, "Return on Capital Employed (ROCE %) — Historical")

    plotted = 0
    for i, m in enumerate(all_metrics):
        roce = _compute_roce(all_raw.get(m["ticker"], {}))
        if not roce:
            continue
        years = sorted(roce.keys())
        vals  = [roce[y] for y in years]
        ax.plot(years, vals, marker="o", linewidth=2, markersize=6,
                color=PALETTE[i % len(PALETTE)], label=m["short"])
        plotted += 1

    if not plotted:
        return _placeholder_bytes("ROCE data not available")

    ax.set_ylabel("ROCE (%)", color=MUTED)
    ax.legend(fontsize=8, facecolor=CARD_BG, edgecolor=BORDER, labelcolor=TEXT)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def margin_comparison_chart(all_metrics: list) -> bytes:
    """Grouped bar: EBITDA margin vs PAT margin for each company."""
    rows = [(m["short"], m.get("ebitda_margin"), m.get("pat_margin"))
            for m in all_metrics
            if m.get("ebitda_margin") or m.get("pat_margin")]
    if not rows:
        return _placeholder_bytes("Margin data not available")

    rows.sort(key=lambda x: x[1] or 0, reverse=True)
    names = [r[0] for r in rows]
    ebitda = [r[1] or 0 for r in rows]
    pat    = [r[2] or 0 for r in rows]

    x = np.arange(len(rows))
    width = 0.38

    fig, ax = plt.subplots(figsize=(11, 5), facecolor=DARK_BG)
    _style_ax(ax, "Margin Comparison — EBITDA vs PAT (%)")

    ax.bar(x - width / 2, ebitda, width, label="EBITDA Margin", color=PRIMARY, alpha=0.9)
    ax.bar(x + width / 2, pat,    width, label="PAT Margin",    color=GREEN,   alpha=0.9)

    for xi, (e, p) in zip(x, zip(ebitda, pat)):
        if e:
            ax.text(xi - width / 2, e + 0.3, f"{e:.1f}%", ha="center", fontsize=7.5, color=TEXT)
        if p:
            ax.text(xi + width / 2, p + 0.3, f"{p:.1f}%", ha="center", fontsize=7.5, color=TEXT)

    ax.set_xticks(x)
    ax.set_xticklabels(names, color=MUTED, fontsize=9)
    ax.set_ylabel("Margin (%)", color=MUTED)
    ax.legend(fontsize=9, facecolor=CARD_BG, edgecolor=BORDER, labelcolor=TEXT)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def fcf_conversion_chart(all_metrics: list, all_raw: dict) -> bytes:
    """FCF generation trend — critical PE metric."""
    fig, ax = plt.subplots(figsize=(11, 5), facecolor=DARK_BG)
    _style_ax(ax, "Free Cash Flow Generation (₹ Cr) — Historical")

    plotted = 0
    for i, m in enumerate(all_metrics):
        fcf = _compute_fcf(all_raw.get(m["ticker"], {}))
        if not fcf:
            continue
        years = sorted(fcf.keys())
        vals  = [fcf[y] for y in years]
        ax.plot(years, vals, marker="s", linewidth=2, markersize=5,
                color=PALETTE[i % len(PALETTE)], label=m["short"])
        plotted += 1

    if not plotted:
        return _placeholder_bytes("FCF data not available")

    ax.axhline(0, color=RED, linewidth=0.8, linestyle="--", alpha=0.6)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: _cr_label(v)))
    ax.set_ylabel("FCF (₹ Cr)", color=MUTED)
    ax.legend(fontsize=8, facecolor=CARD_BG, edgecolor=BORDER, labelcolor=TEXT)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def valuation_multiples_plotly(all_metrics: list):
    """Interactive multi-metric valuation comparison — Plotly."""
    rows = [m for m in all_metrics if m.get("pe_ratio") or m.get("ev_ebitda")]
    if not rows:
        return None

    fig = make_subplots(
        rows=1, cols=3,
        subplot_titles=["P/E Ratio (TTM)", "EV / EBITDA", "P/B Ratio"],
    )

    names  = [m["short"] for m in rows]
    pes    = [m.get("pe_ratio")  or 0 for m in rows]
    evs    = [m.get("ev_ebitda") or 0 for m in rows]
    pbs    = [m.get("pb_ratio")  or 0 for m in rows]
    colors = PALETTE[:len(rows)]

    fig.add_trace(go.Bar(x=names, y=pes, marker_color=colors, showlegend=False,
                         text=[f"{v:.1f}x" for v in pes], textposition="outside",
                         textfont=dict(color=TEXT, size=9)), row=1, col=1)
    fig.add_trace(go.Bar(x=names, y=evs, marker_color=colors, showlegend=False,
                         text=[f"{v:.1f}x" for v in evs], textposition="outside",
                         textfont=dict(color=TEXT, size=9)), row=1, col=2)
    fig.add_trace(go.Bar(x=names, y=pbs, marker_color=colors, showlegend=False,
                         text=[f"{v:.1f}x" for v in pbs], textposition="outside",
                         textfont=dict(color=TEXT, size=9)), row=1, col=3)

    fig.update_layout(
        title="Peer Valuation Multiples",
        paper_bgcolor=DARK_BG, plot_bgcolor=DARK_BG,
        font=dict(color=TEXT, size=11),
        height=420,
        margin=dict(t=60, b=20, l=20, r=20),
    )
    for axis in ["xaxis", "xaxis2", "xaxis3", "yaxis", "yaxis2", "yaxis3"]:
        fig.update_layout(**{axis: dict(gridcolor=GRID, tickfont=dict(color=MUTED))})
    return fig


def working_capital_chart(all_metrics: list, all_raw: dict) -> bytes:
    """Debtor days and inventory days comparison."""
    rows = []
    for m in all_metrics:
        raw = all_raw.get(m["ticker"], {})
        fins = raw.get("financials", pd.DataFrame())
        bs   = raw.get("balance_sheet", pd.DataFrame())
        if fins.empty or bs.empty:
            continue

        def _row(label, df):
            matches = [r for r in df.index if label.lower() in str(r).lower()]
            return df.loc[matches[0]] if matches else None

        try:
            cols = fins.columns.tolist()
            lc   = cols[0]
            rev_row  = _row("Total Revenue", fins)
            rec_row = _row("Net Receivable", bs)
            if rec_row is None:
                rec_row = _row("Accounts Receivable", bs)
            inv_row  = _row("Inventory", bs)
            cogs_row = _row("Cost Of Revenue", fins)
            if cogs_row is None:
                cogs_row = _row("Cost of Goods Sold", fins)

            rev  = float(rev_row.get(lc))  if rev_row  is not None else None
            rec  = float(rec_row.get(lc))  if rec_row  is not None else None
            inv  = float(inv_row.get(lc))  if inv_row  is not None else None
            cogs = float(cogs_row.get(lc)) if cogs_row is not None else None

            dso = round(rec  / rev  * 365, 0) if rec  and rev  and rev  > 0 else None
            dio = round(inv  / cogs * 365, 0) if inv  and cogs and cogs > 0 else None

            if dso or dio:
                rows.append({"short": m["short"], "dso": dso or 0, "dio": dio or 0})
        except Exception:
            continue

    if not rows:
        return _placeholder_bytes("Working capital data not available")

    names = [r["short"] for r in rows]
    dso   = [r["dso"]   for r in rows]
    dio   = [r["dio"]   for r in rows]
    x = np.arange(len(rows))
    width = 0.38

    fig, ax = plt.subplots(figsize=(10, 5), facecolor=DARK_BG)
    _style_ax(ax, "Working Capital Intensity — Debtor Days & Inventory Days")
    ax.bar(x - width / 2, dso, width, label="Debtor Days (DSO)", color=AMBER,  alpha=0.9)
    ax.bar(x + width / 2, dio, width, label="Inventory Days (DIO)", color=PURPLE, alpha=0.9)

    for xi, (d, i) in zip(x, zip(dso, dio)):
        if d:
            ax.text(xi - width / 2, d + 1, f"{d:.0f}d", ha="center", fontsize=8, color=TEXT)
        if i:
            ax.text(xi + width / 2, i + 1, f"{i:.0f}d", ha="center", fontsize=8, color=TEXT)

    ax.set_xticks(x)
    ax.set_xticklabels(names, color=MUTED, fontsize=9)
    ax.set_ylabel("Days", color=MUTED)
    ax.legend(fontsize=9, facecolor=CARD_BG, edgecolor=BORDER, labelcolor=TEXT)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def _placeholder_bytes(msg: str) -> bytes:
    fig, ax = plt.subplots(figsize=(8, 3), facecolor=DARK_BG)
    ax.set_facecolor(DARK_BG)
    ax.text(0.5, 0.5, msg, ha="center", va="center", fontsize=11,
            color=MUTED, transform=ax.transAxes)
    ax.axis("off")
    return _fig_to_bytes(fig)
