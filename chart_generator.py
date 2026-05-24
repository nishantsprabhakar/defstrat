"""
Generates matplotlib / plotly charts for the defence investor dashboard.
All matplotlib charts are saved as PNG bytes (BytesIO) for embedding in docx.
"""

import io
import textwrap
from typing import Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# ── Palette ───────────────────────────────────────────────────────────────────
PRIMARY = "#1a237e"
ACCENT = "#1565c0"
GREEN = "#2e7d32"
AMBER = "#f57f17"
RED = "#c62828"
LIGHT_BG = "#f5f7fa"
GRID = "#e0e0e0"
TEXT = "#212121"

SECTOR_PAL = [
    "#1a237e", "#283593", "#303f9f", "#3949ab", "#1565c0",
    "#0277bd", "#00838f", "#00695c", "#2e7d32", "#558b2f",
    "#f57f17", "#e65100",
]


def _fig_to_bytes(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _cr_label(val):
    """Format crore value → '₹1,234 Cr' or '₹1.2K Cr'."""
    if val is None:
        return "N/A"
    if val >= 100000:
        return f"₹{val/100000:.1f}L Cr"
    if val >= 1000:
        return f"₹{val/1000:.1f}K Cr"
    return f"₹{val:.0f} Cr"


# ── Individual company charts ─────────────────────────────────────────────────

def revenue_pat_bar(trend_df: pd.DataFrame, company_name: str) -> bytes:
    """Annual revenue vs PAT grouped bar chart."""
    if trend_df.empty:
        return _placeholder_bytes(f"No financial data for {company_name}")

    df = trend_df.dropna(subset=["revenue_cr", "pat_cr"])
    if df.empty:
        return _placeholder_bytes(f"No financial data for {company_name}")

    x = np.arange(len(df))
    width = 0.38

    fig, ax = plt.subplots(figsize=(9, 4.5), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    bars1 = ax.bar(x - width / 2, df["revenue_cr"], width, label="Revenue", color=PRIMARY, alpha=0.9)
    bars2 = ax.bar(x + width / 2, df["pat_cr"], width, label="PAT", color=GREEN, alpha=0.9)

    for bar in bars1:
        h = bar.get_height()
        if h and h > 0:
            ax.text(bar.get_x() + bar.get_width() / 2, h + h * 0.02,
                    _cr_label(h), ha="center", va="bottom", fontsize=7, color=TEXT)

    for bar in bars2:
        h = bar.get_height()
        if h and h > 0:
            ax.text(bar.get_x() + bar.get_width() / 2, h + h * 0.02,
                    _cr_label(h), ha="center", va="bottom", fontsize=7, color=TEXT)

    ax.set_xticks(x)
    ax.set_xticklabels(df["year"].tolist(), fontsize=9)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: _cr_label(v)))
    ax.set_title(f"{company_name} — Annual Revenue & PAT (₹ Cr)", fontsize=11, fontweight="bold", color=TEXT, pad=10)
    ax.legend(fontsize=9)
    ax.grid(axis="y", color=GRID, linewidth=0.7)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def quarterly_trend_line(qtrd: pd.DataFrame, company_name: str) -> bytes:
    """Quarterly revenue and PAT line chart."""
    if qtrd.empty:
        return _placeholder_bytes(f"No quarterly data for {company_name}")

    df = qtrd.dropna(subset=["revenue_cr"])

    fig, ax1 = plt.subplots(figsize=(9, 4), facecolor=LIGHT_BG)
    ax1.set_facecolor(LIGHT_BG)
    ax2 = ax1.twinx()

    x = range(len(df))
    ax1.plot(x, df["revenue_cr"], color=PRIMARY, marker="o", linewidth=2, markersize=5, label="Revenue")
    if "pat_cr" in df.columns:
        ax2.plot(x, df["pat_cr"], color=GREEN, marker="s", linewidth=2, markersize=5, label="PAT", linestyle="--")

    ax1.set_xticks(list(x))
    ax1.set_xticklabels(df["quarter"].str[:7].tolist(), rotation=30, ha="right", fontsize=8)
    ax1.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: _cr_label(v)))
    ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: _cr_label(v)))
    ax1.set_ylabel("Revenue (₹ Cr)", color=PRIMARY, fontsize=9)
    ax2.set_ylabel("PAT (₹ Cr)", color=GREEN, fontsize=9)

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, fontsize=9, loc="upper left")

    ax1.set_title(f"{company_name} — Quarterly Performance", fontsize=11, fontweight="bold", color=TEXT, pad=10)
    ax1.grid(axis="y", color=GRID, linewidth=0.7)
    ax1.spines["top"].set_visible(False)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def margin_waterfall(metrics: dict) -> bytes:
    """Simple waterfall: Revenue → EBITDA → EBIT → PAT."""
    vals = {
        "Revenue": metrics.get("revenue_cr"),
        "EBITDA": metrics.get("ebitda_cr"),
        "EBIT": metrics.get("ebit_cr"),
        "PAT": metrics.get("pat_cr"),
    }
    vals = {k: v for k, v in vals.items() if v is not None and v > 0}
    if len(vals) < 2:
        return _placeholder_bytes("Insufficient margin data")

    fig, ax = plt.subplots(figsize=(7, 4), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    keys = list(vals.keys())
    values = list(vals.values())
    colors = [PRIMARY, ACCENT, "#0277bd", GREEN][:len(keys)]

    bars = ax.bar(keys, values, color=colors, alpha=0.9, width=0.55)
    for bar, v in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, v + v * 0.02,
                _cr_label(v), ha="center", va="bottom", fontsize=9, fontweight="bold", color=TEXT)

    rev = vals.get("Revenue", 1)
    for k, v in vals.items():
        if k != "Revenue":
            margin = v / rev * 100
            idx = keys.index(k)
            ax.text(idx, v / 2, f"{margin:.1f}%", ha="center", va="center",
                    fontsize=9, color="white", fontweight="bold")

    ax.set_title(f"{metrics.get('short', '')} — Profitability Cascade (₹ Cr)", fontsize=11, fontweight="bold", color=TEXT)
    ax.set_ylabel("₹ Crores", fontsize=9)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: _cr_label(v)))
    ax.grid(axis="y", color=GRID, linewidth=0.7)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def shareholding_donut(metrics: dict) -> bytes:
    """Promoter / Institutional / Retail donut chart."""
    promoter = metrics.get("promoter_holding_pct")
    inst = metrics.get("institutional_holding_pct")

    if promoter is None and inst is None:
        return _placeholder_bytes("Shareholding data not available")

    promoter = promoter or 0
    inst = inst or 0
    retail = max(0, 100 - promoter - inst)

    labels = ["Promoter/Govt", "Institutional", "Public/Retail"]
    sizes = [promoter, inst, retail]
    colors = [PRIMARY, ACCENT, AMBER]
    non_zero = [(l, s, c) for l, s, c in zip(labels, sizes, colors) if s > 0]
    if not non_zero:
        return _placeholder_bytes("Shareholding data not available")

    labels, sizes, colors = zip(*non_zero)

    fig, ax = plt.subplots(figsize=(5.5, 4.5), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)
    wedges, texts, autotexts = ax.pie(
        sizes, labels=None, colors=colors,
        autopct="%1.1f%%", startangle=90,
        pctdistance=0.78, wedgeprops={"width": 0.55, "edgecolor": "white", "linewidth": 2},
    )
    for at in autotexts:
        at.set_fontsize(9)
        at.set_color("white")
        at.set_fontweight("bold")

    ax.legend(wedges, labels, loc="lower center", bbox_to_anchor=(0.5, -0.08),
              ncol=3, fontsize=9, frameon=False)
    ax.set_title(f"{metrics.get('short', '')} — Shareholding Pattern", fontsize=11, fontweight="bold", color=TEXT)
    fig.tight_layout()
    return _fig_to_bytes(fig)


# ── Sector-wide comparison charts ─────────────────────────────────────────────

def market_cap_bubble(all_metrics: list[dict]) -> bytes:
    """Bubble: x=PE, y=PAT margin, size=market cap."""
    rows = [
        m for m in all_metrics
        if m.get("market_cap_cr") and m.get("pe_ratio") and m.get("pat_margin")
    ]
    if not rows:
        return _placeholder_bytes("Insufficient comparative data")

    fig, ax = plt.subplots(figsize=(10, 6), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    for i, m in enumerate(rows):
        size = np.sqrt(m["market_cap_cr"]) * 0.6
        color = SECTOR_PAL[i % len(SECTOR_PAL)]
        ax.scatter(m["pe_ratio"], m["pat_margin"], s=size, color=color, alpha=0.75, edgecolors="white", linewidth=1.2)
        ax.annotate(
            m["short"], (m["pe_ratio"], m["pat_margin"]),
            fontsize=7.5, ha="center", va="bottom",
            xytext=(0, 6), textcoords="offset points", color=TEXT,
        )

    ax.set_xlabel("P/E Ratio (TTM)", fontsize=10)
    ax.set_ylabel("PAT Margin (%)", fontsize=10)
    ax.set_title("India Defence Sector — Valuation vs Profitability\n(bubble size ∝ Market Cap)", fontsize=12, fontweight="bold", color=TEXT)
    ax.grid(color=GRID, linewidth=0.7)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Market cap legend
    for mc, label in [(5000, "₹5K Cr"), (50000, "₹50K Cr"), (200000, "₹2L Cr")]:
        ax.scatter([], [], s=np.sqrt(mc) * 0.6, color="#9e9e9e", alpha=0.6, label=label)
    ax.legend(title="Market Cap", fontsize=8, title_fontsize=8, loc="lower right")
    fig.tight_layout()
    return _fig_to_bytes(fig)


def revenue_comparison_bar(all_metrics: list[dict]) -> bytes:
    """Horizontal bar — companies ranked by revenue."""
    rows = sorted(
        [m for m in all_metrics if m.get("revenue_cr")],
        key=lambda x: x["revenue_cr"],
    )
    if not rows:
        return _placeholder_bytes("No revenue data available")

    fig, ax = plt.subplots(figsize=(10, max(5, len(rows) * 0.55 + 1)), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    names = [r["short"] for r in rows]
    revs = [r["revenue_cr"] for r in rows]
    pats = [r.get("pat_cr") or 0 for r in rows]
    colors = [PRIMARY if r > 0 else RED for r in revs]

    y = np.arange(len(rows))
    ax.barh(y, revs, color=colors, alpha=0.85, height=0.5, label="Revenue")
    ax.barh(y, pats, color=GREEN, alpha=0.7, height=0.3, label="PAT")

    ax.set_yticks(y)
    ax.set_yticklabels(names, fontsize=9)
    for i, (rev, pat) in enumerate(zip(revs, pats)):
        ax.text(rev + rev * 0.01, i, _cr_label(rev), va="center", fontsize=8, color=TEXT)

    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: _cr_label(v)))
    ax.set_title("India Defence Companies — Revenue & PAT Comparison (₹ Cr)", fontsize=12, fontweight="bold", color=TEXT)
    ax.legend(fontsize=9)
    ax.grid(axis="x", color=GRID, linewidth=0.7)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def return_heatmap(all_metrics: list[dict]) -> bytes:
    """Heatmap: 1y & 5y price returns."""
    rows = [m for m in all_metrics if m.get("price_return_1y") or m.get("price_return_5y")]
    if not rows:
        return _placeholder_bytes("No return data available")

    names = [r["short"] for r in rows]
    r1y = [r.get("price_return_1y") or 0 for r in rows]
    r5y = [r.get("price_return_5y") or 0 for r in rows]

    data = np.array([r1y, r5y])

    fig, ax = plt.subplots(figsize=(max(8, len(rows) * 0.7), 3.5), facecolor=LIGHT_BG)
    im = ax.imshow(data, cmap="RdYlGn", aspect="auto", vmin=-50, vmax=300)

    ax.set_xticks(range(len(names)))
    ax.set_xticklabels(names, rotation=30, ha="right", fontsize=8.5)
    ax.set_yticks([0, 1])
    ax.set_yticklabels(["1Y Return", "5Y Return"], fontsize=9)

    for i in range(2):
        for j in range(len(names)):
            val = data[i, j]
            ax.text(j, i, f"{val:+.0f}%", ha="center", va="center",
                    fontsize=8, fontweight="bold",
                    color="white" if abs(val) > 80 else TEXT)

    plt.colorbar(im, ax=ax, shrink=0.8, label="Return (%)")
    ax.set_title("Price Return Heatmap — India Defence Sector", fontsize=12, fontweight="bold", color=TEXT)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def roe_roa_scatter(all_metrics: list[dict]) -> bytes:
    """ROE vs ROA scatter."""
    rows = [m for m in all_metrics if m.get("roe") and m.get("roa")]
    if not rows:
        return _placeholder_bytes("ROE/ROA data not available")

    fig, ax = plt.subplots(figsize=(8, 5.5), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    for i, m in enumerate(rows):
        color = SECTOR_PAL[i % len(SECTOR_PAL)]
        ax.scatter(m["roa"], m["roe"], s=120, color=color, alpha=0.85, edgecolors="white", linewidth=1.2, zorder=3)
        ax.annotate(m["short"], (m["roa"], m["roe"]), fontsize=8,
                    xytext=(5, 3), textcoords="offset points", color=TEXT)

    ax.axhline(0, color=GRID, linewidth=1)
    ax.axvline(0, color=GRID, linewidth=1)
    ax.set_xlabel("Return on Assets — ROA (%)", fontsize=10)
    ax.set_ylabel("Return on Equity — ROE (%)", fontsize=10)
    ax.set_title("ROE vs ROA — India Defence Companies", fontsize=12, fontweight="bold", color=TEXT)
    ax.grid(color=GRID, linewidth=0.7)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    return _fig_to_bytes(fig)


def sector_treemap_plotly(all_metrics: list[dict]):
    """Plotly treemap by market cap — returns plotly Figure."""
    rows = [m for m in all_metrics if m.get("market_cap_cr")]
    if not rows:
        return None

    df = pd.DataFrame([
        {
            "Company": m["short"],
            "Full Name": m["name"],
            "Sub-sector": m["sub_sector"],
            "Market Cap (₹ Cr)": m["market_cap_cr"],
            "PAT Margin (%)": m.get("pat_margin") or 0,
        }
        for m in rows
    ])

    fig = px.treemap(
        df,
        path=["Sub-sector", "Company"],
        values="Market Cap (₹ Cr)",
        color="PAT Margin (%)",
        color_continuous_scale=["#c62828", "#f57f17", "#2e7d32"],
        color_continuous_midpoint=10,
        title="India Defence Sector — Market Cap Treemap (colour = PAT Margin)",
        hover_data={"Full Name": True},
    )
    fig.update_layout(
        font=dict(family="Inter, Arial", size=12),
        paper_bgcolor=LIGHT_BG,
        margin=dict(t=50, l=10, r=10, b=10),
    )
    return fig


def price_history_plotly(hist: pd.DataFrame, company_name: str):
    """Candlestick + volume plotly chart."""
    if hist.empty:
        return None

    fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                        row_heights=[0.75, 0.25], vertical_spacing=0.03)

    fig.add_trace(
        go.Candlestick(
            x=hist.index, open=hist["Open"], high=hist["High"],
            low=hist["Low"], close=hist["Close"], name="Price",
            increasing_line_color=GREEN, decreasing_line_color=RED,
        ),
        row=1, col=1,
    )

    # 50-day MA
    ma50 = hist["Close"].rolling(50).mean()
    fig.add_trace(
        go.Scatter(x=hist.index, y=ma50, name="50-day MA",
                   line=dict(color=AMBER, width=1.5, dash="dot")),
        row=1, col=1,
    )

    colors = [GREEN if c >= o else RED for c, o in zip(hist["Close"], hist["Open"])]
    fig.add_trace(
        go.Bar(x=hist.index, y=hist["Volume"], name="Volume", marker_color=colors, opacity=0.6),
        row=2, col=1,
    )

    fig.update_layout(
        title=f"{company_name} — Price History",
        xaxis_rangeslider_visible=False,
        font=dict(family="Inter, Arial", size=11),
        paper_bgcolor=LIGHT_BG,
        plot_bgcolor=LIGHT_BG,
        legend=dict(orientation="h", y=1.02),
        height=500,
    )
    return fig


def _placeholder_bytes(msg: str) -> bytes:
    fig, ax = plt.subplots(figsize=(6, 2.5), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)
    ax.text(0.5, 0.5, msg, ha="center", va="center", fontsize=11, color="#757575",
            transform=ax.transAxes)
    ax.axis("off")
    return _fig_to_bytes(fig)
