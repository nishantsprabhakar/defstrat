"""
India Defence Investor Dashboard — Streamlit app
Run: streamlit run app.py
"""

import io
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Page config (must be first Streamlit call) ────────────────────────────────
st.set_page_config(
    page_title="India Defence Investor Hub",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS (dark theme) ───────────────────────────────────────────────────
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

    /* ── dark backgrounds ── */
    .stApp, [data-testid="stAppViewContainer"] { background: #0d1117 !important; }
    [data-testid="stSidebar"] { background: #161b22 !important; border-right: 1px solid #30363d; }
    section[data-testid="stMain"] { background: #0d1117 !important; }

    /* ── metric cards ── */
    .metric-card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 12px;
    }
    .metric-label {
        font-size: 11px; color: #8b949e; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.6px;
    }
    .metric-value { font-size: 22px; color: #58a6ff; font-weight: 700; margin-top: 4px; }
    .metric-delta { font-size: 12px; margin-top: 2px; }

    /* ── section headers ── */
    .section-header {
        font-size: 17px; font-weight: 700; color: #58a6ff;
        border-bottom: 2px solid #21262d; padding-bottom: 6px; margin: 20px 0 12px;
    }

    /* ── company badges ── */
    .company-badge {
        background: #21262d; border: 1px solid #30363d;
        border-radius: 20px; padding: 4px 14px;
        font-size: 12px; color: #79c0ff; font-weight: 600; display: inline-block;
    }

    /* ── download buttons ── */
    div[data-testid="stDownloadButton"] > button {
        background: #1f6feb; color: white; border-radius: 8px; border: none;
        padding: 8px 20px; font-weight: 600; font-size: 14px;
    }
    div[data-testid="stDownloadButton"] > button:hover { background: #388bfd; }

    /* ── copyright bar ── */
    .copyright-bar {
        text-align: center; color: #484f58; font-size: 12px;
        padding: 18px 0 8px; border-top: 1px solid #21262d; margin-top: 32px;
    }
    .copyright-bar a { color: #58a6ff; text-decoration: none; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Imports (deferred so config runs first) ───────────────────────────────────
from companies import DEFENCE_COMPANIES
import data_fetcher as df_mod
import chart_generator as cg
import docx_exporter as dx
import excel_exporter as ex


# ── Helpers ────────────────────────────────────────────────────────────────────

def _cr(val):
    if val is None:
        return "—"
    if val >= 100000:
        return f"₹{val/100000:.1f}L Cr"
    if val >= 1000:
        return f"₹{val/1000:.1f}K Cr"
    return f"₹{val:,.0f} Cr"


def _pct(val):
    return f"{val:+.1f}%" if val is not None else "—"


def _ratio(val):
    return f"{val:.2f}x" if val is not None else "—"


def _color_pct(val):
    if val is None:
        return "—"
    color = "#2e7d32" if val >= 0 else "#c62828"
    return f'<span style="color:{color};font-weight:600">{val:+.1f}%</span>'


def metric_card(col, label, value, delta=None):
    delta_html = ""
    if delta is not None:
        color = "#2e7d32" if (isinstance(delta, (int, float)) and delta >= 0) else "#c62828"
        if isinstance(delta, str):
            delta_html = f'<div class="metric-delta" style="color:{color}">▲ {delta}</div>'
        else:
            arrow = "▲" if delta >= 0 else "▼"
            delta_html = f'<div class="metric-delta" style="color:{color}">{arrow} {abs(delta):.1f}%</div>'
    html = (
        '<div class="metric-card">'
        f'<div class="metric-label">{label}</div>'
        f'<div class="metric-value">{value}</div>'
        f'{delta_html}'
        '</div>'
    )
    col.html(html)


@st.cache_data(ttl=3600, show_spinner=False)
def load_company(ticker: str) -> dict:
    return df_mod.fetch_company_data(ticker)


@st.cache_data(ttl=3600, show_spinner=False)
def load_all_companies(tickers: tuple) -> dict:
    result = {}
    for t in tickers:
        result[t] = df_mod.fetch_company_data(t)
    return result


# ── Session state init ─────────────────────────────────────────────────────────
if "custom_companies" not in st.session_state:
    st.session_state.custom_companies = []


# ── Sidebar ────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## 🛡️ India Defence Investor Hub")
    st.markdown("---")

    mode = st.radio(
        "View",
        ["🏠 Sector Overview", "🏢 Company Deep-Dive"],
        index=0,
    )

    st.markdown("---")

    # ── Add custom company ──
    with st.expander("➕ Add a Company", expanded=False):
        with st.form("add_company_form", clear_on_submit=True):
            new_name   = st.text_input("Full Company Name", placeholder="e.g. HAL")
            new_short  = st.text_input("Short / Ticker Label", placeholder="e.g. HAL")
            new_ticker = st.text_input("NSE Ticker (Yahoo Finance format)", placeholder="e.g. HAL.NS")
            new_sector = st.text_input("Sub-sector", placeholder="e.g. Aircraft Manufacturing")
            new_desc   = st.text_area("Description (optional)", placeholder="Brief company description")
            submitted  = st.form_submit_button("Add Company")

        if submitted:
            if new_name and new_ticker:
                ticker_clean = new_ticker.strip().upper()
                if not ticker_clean.endswith(".NS") and not ticker_clean.endswith(".BO"):
                    ticker_clean += ".NS"
                duplicate = any(
                    c["ticker"] == ticker_clean
                    for c in DEFENCE_COMPANIES + st.session_state.custom_companies
                )
                if duplicate:
                    st.warning(f"{ticker_clean} is already in the list.")
                else:
                    st.session_state.custom_companies.append({
                        "name": new_name.strip(),
                        "short": new_short.strip() or new_ticker.split(".")[0].upper(),
                        "ticker": ticker_clean,
                        "bse_code": "",
                        "sector": "Aerospace & Defence",
                        "sub_sector": new_sector.strip() or "Defence",
                        "description": new_desc.strip() or f"{new_name.strip()} — user-added company.",
                    })
                    st.success(f"Added {new_name.strip()}")
                    st.cache_data.clear()
            else:
                st.error("Company name and ticker are required.")

    # Remove custom companies
    if st.session_state.custom_companies:
        with st.expander("🗑️ Remove Added Companies", expanded=False):
            to_remove = st.multiselect(
                "Select to remove",
                options=[c["name"] for c in st.session_state.custom_companies],
            )
            if st.button("Remove Selected") and to_remove:
                st.session_state.custom_companies = [
                    c for c in st.session_state.custom_companies
                    if c["name"] not in to_remove
                ]
                st.cache_data.clear()
                st.rerun()

    st.markdown("---")

    # Build combined company list (default + user-added)
    all_companies = DEFENCE_COMPANIES + st.session_state.custom_companies

    if mode == "🏢 Company Deep-Dive":
        company_names = {c["name"]: c for c in all_companies}
        selected_name = st.selectbox("Select Company", list(company_names.keys()))
        selected_meta = company_names[selected_name]
    else:
        selected_meta = None

    st.markdown("---")
    st.caption(f"Data via Yahoo Finance · {datetime.now().strftime('%d %b %Y')}")
    st.caption(f"{len(all_companies)} companies tracked · Values in INR Crores")


# ═══════════════════════════════════════════════════════════════════════════════
#  SECTOR OVERVIEW
# ═══════════════════════════════════════════════════════════════════════════════

if mode == "🏠 Sector Overview":
    st.markdown("# 🛡️ India Listed Defence Sector")
    st.markdown(
        f"**{len(all_companies)} companies** · Aerospace, Electronics, "
        "Shipbuilding, Missiles, Drones & more"
    )

    tickers = tuple(c["ticker"] for c in all_companies)

    with st.spinner("Fetching data for all companies…"):
        all_raw = load_all_companies(tickers)

    all_metrics = []
    progress = st.progress(0)
    for i, meta in enumerate(all_companies):
        raw = all_raw.get(meta["ticker"], {})
        if raw:
            m = df_mod.extract_key_metrics(raw, meta)
            all_metrics.append(m)
        progress.progress((i + 1) / len(all_companies))
    progress.empty()

    if not all_metrics:
        st.error("Could not fetch data. Check your internet connection.")
        st.stop()

    # ── Top KPI row ──
    valid_mc = [m["market_cap_cr"] for m in all_metrics if m.get("market_cap_cr")]
    total_mc = sum(valid_mc) if valid_mc else None
    avg_pe = sum(m["pe_ratio"] for m in all_metrics if m.get("pe_ratio")) / max(
        1, sum(1 for m in all_metrics if m.get("pe_ratio"))
    )
    best_ret = max((m.get("price_return_1y") or -999) for m in all_metrics)
    best_ret_co = next((m["short"] for m in all_metrics if m.get("price_return_1y") == best_ret), "—")

    st.html('<div class="section-header">Sector Snapshot</div>')
    c1, c2, c3, c4 = st.columns(4)
    metric_card(c1, "Combined Market Cap", _cr(total_mc))
    metric_card(c2, "Companies Tracked", str(len(all_metrics)))
    metric_card(c3, "Sector Avg P/E", f"{avg_pe:.1f}x")
    metric_card(c4, "Best 1Y Return", f"{best_ret:+.0f}% ({best_ret_co})")

    # ── Sector charts ──
    st.html('<div class="section-header">Sector Charts</div>')

    tab_charts, tab_table = st.tabs(["📊 Charts", "📋 Comparison Table"])

    with tab_charts:
        col_l, col_r = st.columns(2)

        with col_l:
            st.subheader("Revenue & PAT Comparison")
            rev_chart_bytes = cg.revenue_comparison_bar(all_metrics)
            st.image(rev_chart_bytes, use_container_width=True)

        with col_r:
            st.subheader("Valuation vs Profitability")
            bubble_bytes = cg.market_cap_bubble(all_metrics)
            st.image(bubble_bytes, use_container_width=True)

        col_l2, col_r2 = st.columns(2)
        with col_l2:
            st.subheader("Price Return Heatmap")
            heatmap_bytes = cg.return_heatmap(all_metrics)
            st.image(heatmap_bytes, use_container_width=True)

        with col_r2:
            st.subheader("ROE vs ROA")
            roe_bytes = cg.roe_roa_scatter(all_metrics)
            st.image(roe_bytes, use_container_width=True)

        # Plotly treemap
        st.subheader("Market Cap Treemap")
        treemap = cg.sector_treemap_plotly(all_metrics)
        if treemap:
            st.plotly_chart(treemap, use_container_width=True)

    with tab_table:
        table_rows = []
        for m in sorted(all_metrics, key=lambda x: x.get("market_cap_cr") or 0, reverse=True):
            table_rows.append({
                "Company": m["short"],
                "Sub-sector": m.get("sub_sector", ""),
                "Mkt Cap": _cr(m.get("market_cap_cr")),
                "Revenue": _cr(m.get("revenue_cr")),
                "PAT": _cr(m.get("pat_cr")),
                "PAT Margin": _pct(m.get("pat_margin")),
                "P/E": f"{m['pe_ratio']:.1f}x" if m.get("pe_ratio") else "—",
                "ROE": _pct(m.get("roe")),
                "D/E": _ratio(m.get("debt_to_equity")),
                "1Y Return": _pct(m.get("price_return_1y")),
                "5Y Return": _pct(m.get("price_return_5y")),
            })
        st.dataframe(pd.DataFrame(table_rows), use_container_width=True, hide_index=True)

    # ── Downloads ──
    st.html('<div class="section-header">Downloads</div>')
    dl_col1, dl_col2 = st.columns(2)

    with dl_col1:
        with st.spinner("Preparing Word report…"):
            chart_bytes_map = {
                "revenue_comparison": cg.revenue_comparison_bar(all_metrics),
                "market_cap_bubble": cg.market_cap_bubble(all_metrics),
                "return_heatmap": cg.return_heatmap(all_metrics),
                "roe_roa_scatter": cg.roe_roa_scatter(all_metrics),
            }
            docx_bytes = dx.build_sector_docx(all_metrics, chart_bytes_map)
        st.download_button(
            "📄 Download Sector Report (.docx)",
            data=docx_bytes,
            file_name=f"india_defence_sector_{datetime.now().strftime('%Y%m%d')}.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    with dl_col2:
        with st.spinner("Preparing Excel workbook…"):
            excel_bytes = ex.build_sector_excel(all_metrics, all_raw)
        st.download_button(
            "📊 Download Sector Financials (.xlsx)",
            data=excel_bytes,
            file_name=f"india_defence_financials_{datetime.now().strftime('%Y%m%d')}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    st.html(
        '<div class="copyright-bar">'
        f'© {datetime.now().year} Nishant Prabhakar &nbsp;·&nbsp; '
        'India Defence Investor Hub &nbsp;·&nbsp; '
        'Data via Yahoo Finance — for informational use only'
        '</div>'
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  COMPANY DEEP-DIVE
# ═══════════════════════════════════════════════════════════════════════════════

else:
    meta = selected_meta
    st.markdown(f"# {meta['name']}")
    st.html(
        f'<span class="company-badge">{meta["sub_sector"]}</span> &nbsp; '
        f'<span class="company-badge">NSE: {meta["ticker"].replace(".NS","")}</span>'
    )
    st.markdown(f"*{meta['description']}*")
    st.markdown("---")

    with st.spinner(f"Fetching data for {meta['short']}…"):
        raw = load_company(meta["ticker"])

    if not raw:
        st.error("Could not load data. Check ticker or internet connection.")
        st.stop()

    metrics = df_mod.extract_key_metrics(raw, meta)
    trend_df = df_mod.build_revenue_trend(raw)
    quarterly_df = df_mod.build_quarterly_trend(raw)

    # ── KPI cards ──
    st.html('<div class="section-header">Key Metrics</div>')
    cols = st.columns(5)
    kpis = [
        ("Market Cap", _cr(metrics.get("market_cap_cr")), None),
        ("P/E (TTM)", f"{metrics['pe_ratio']:.1f}x" if metrics.get("pe_ratio") else "—", None),
        ("Revenue", _cr(metrics.get("revenue_cr")), metrics.get("revenue_growth_yoy")),
        ("PAT Margin", _pct(metrics.get("pat_margin")), None),
        ("ROE", _pct(metrics.get("roe")), None),
    ]
    for col, (label, value, delta) in zip(cols, kpis):
        metric_card(col, label, value, delta)

    cols2 = st.columns(5)
    kpis2 = [
        ("EPS (TTM)", f"₹{metrics['eps_ttm']}" if metrics.get("eps_ttm") else "—", None),
        ("P/B Ratio", _ratio(metrics.get("pb_ratio")), None),
        ("D/E Ratio", _ratio(metrics.get("debt_to_equity")), None),
        ("1Y Return", _pct(metrics.get("price_return_1y")), None),
        ("Div Yield", _pct(metrics.get("dividend_yield")), None),
    ]
    for col, (label, value, delta) in zip(cols2, kpis2):
        metric_card(col, label, value, delta)

    # ── Charts ──
    st.html('<div class="section-header">Charts</div>')

    tab1, tab2, tab3, tab4 = st.tabs(
        ["📈 Price History", "💰 Financials", "🔄 Margins", "🧑‍🤝‍🧑 Shareholding"]
    )

    with tab1:
        hist = raw.get("history", pd.DataFrame())
        if not hist.empty:
            price_fig = cg.price_history_plotly(hist, meta["name"])
            if price_fig:
                st.plotly_chart(price_fig, use_container_width=True)
        else:
            st.info("Price history not available.")

    with tab2:
        c_left, c_right = st.columns(2)
        with c_left:
            st.subheader("Annual Revenue & PAT")
            bar_bytes = cg.revenue_pat_bar(trend_df, meta["name"])
            st.image(bar_bytes, use_container_width=True)
        with c_right:
            st.subheader("Quarterly Trend")
            qtr_bytes = cg.quarterly_trend_line(quarterly_df, meta["name"])
            st.image(qtr_bytes, use_container_width=True)

        if not trend_df.empty:
            st.markdown("**Annual Data**")
            st.dataframe(trend_df, use_container_width=True, hide_index=True)

    with tab3:
        margin_bytes = cg.margin_waterfall(metrics)
        st.image(margin_bytes, use_container_width=True)

        st.markdown("**Margin Summary**")
        margin_data = {
            "Metric": ["Revenue", "EBITDA", "EBIT", "PAT"],
            "Value (₹ Cr)": [
                _cr(metrics.get("revenue_cr")),
                _cr(metrics.get("ebitda_cr")),
                _cr(metrics.get("ebit_cr")),
                _cr(metrics.get("pat_cr")),
            ],
            "Margin %": [
                "100%",
                _pct(metrics.get("ebitda_margin")),
                "—",
                _pct(metrics.get("pat_margin")),
            ],
        }
        st.dataframe(pd.DataFrame(margin_data), use_container_width=True, hide_index=True)

    with tab4:
        col_d, col_t = st.columns(2)
        with col_d:
            sh_bytes = cg.shareholding_donut(metrics)
            st.image(sh_bytes, use_container_width=True)
        with col_t:
            sh_data = {
                "Holder Type": ["Promoter / Govt", "Institutional", "Public / Retail"],
                "Holding %": [
                    _pct(metrics.get("promoter_holding_pct")),
                    _pct(metrics.get("institutional_holding_pct")),
                    _pct(
                        max(
                            0,
                            100
                            - (metrics.get("promoter_holding_pct") or 0)
                            - (metrics.get("institutional_holding_pct") or 0),
                        )
                    ),
                ],
            }
            st.dataframe(pd.DataFrame(sh_data), use_container_width=True, hide_index=True)

            mh = raw.get("institutional_holders", pd.DataFrame())
            if not mh.empty:
                st.markdown("**Top Institutional Holders**")
                st.dataframe(mh.head(10), use_container_width=True, hide_index=True)

    # ── Downloads ──
    st.html('<div class="section-header">Downloads</div>')
    dl_c1, dl_c2 = st.columns(2)

    with dl_c1:
        with st.spinner("Generating Word report…"):
            chart_map = {
                "revenue_pat_bar": cg.revenue_pat_bar(trend_df, meta["name"]),
                "quarterly_trend": cg.quarterly_trend_line(quarterly_df, meta["name"]),
                "margin_waterfall": cg.margin_waterfall(metrics),
                "shareholding_donut": cg.shareholding_donut(metrics),
            }
            docx_bytes = dx.build_company_docx(metrics, chart_map, trend_df, quarterly_df, raw.get("financials", pd.DataFrame()))
        st.download_button(
            f"📄 Download {meta['short']} Report (.docx)",
            data=docx_bytes,
            file_name=f"{meta['short'].lower()}_investor_report_{datetime.now().strftime('%Y%m%d')}.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    with dl_c2:
        with st.spinner("Generating Excel workbook…"):
            excel_bytes = ex.build_company_excel(metrics, raw, trend_df, quarterly_df)
        st.download_button(
            f"📊 Download {meta['short']} Financials (.xlsx)",
            data=excel_bytes,
            file_name=f"{meta['short'].lower()}_financials_{datetime.now().strftime('%Y%m%d')}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    st.html(
        '<div class="copyright-bar">'
        f'© {datetime.now().year} Nishant Prabhakar &nbsp;·&nbsp; '
        'India Defence Investor Hub &nbsp;·&nbsp; '
        'Data via Yahoo Finance — for informational use only'
        '</div>'
    )
