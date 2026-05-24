"""
DefStrat — India Defence Intelligence Platform
by Nishant Prabhakar
Run: streamlit run app.py
"""

import base64
import os
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="DefStrat — India Defence Intelligence",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── SEO: meta tags, Open Graph, Twitter Card, JSON-LD ─────────────────────────
_OG_IMAGE = "https://raw.githubusercontent.com/nishantsprabhakar/defstrat/main/logo.png"
st.markdown(f"""
<script>
(function() {{
  var H = document.head;
  [
    // Core SEO
    {{name:"description",        content:"DefStrat — real-time financial intelligence for India's listed defence sector. Track HAL, BEL, Bharat Forge, Paras Defence, GRSE and more with live valuations, earnings briefings and AI-powered analysis."}},
    {{name:"keywords",           content:"India defence stocks, HAL, BEL, Bharat Forge, Paras Defence, GRSE, Cochin Shipyard, defence sector India, Indian defence ETF, defence equity research"}},
    {{name:"author",             content:"Nishant Prabhakar"}},
    {{name:"robots",             content:"index, follow"}},
    {{name:"theme-color",        content:"#07090f"}},
    // Open Graph
    {{property:"og:type",        content:"website"}},
    {{property:"og:site_name",   content:"DefStrat"}},
    {{property:"og:title",       content:"DefStrat — India Defence Intelligence Platform"}},
    {{property:"og:description", content:"Real-time valuations, earnings briefings and AI analyst for the India listed defence sector. Built by Nishant Prabhakar."}},
    {{property:"og:image",       content:"{_OG_IMAGE}"}},
    {{property:"og:image:width", content:"1200"}},
    {{property:"og:image:alt",   content:"DefStrat logo — India Defence Intelligence Platform"}},
    {{property:"og:url",         content:window.location.href}},
    // Twitter Card
    {{name:"twitter:card",       content:"summary_large_image"}},
    {{name:"twitter:site",       content:"@nishantsprabhakar"}},
    {{name:"twitter:creator",    content:"@nishantsprabhakar"}},
    {{name:"twitter:title",      content:"DefStrat — India Defence Intelligence"}},
    {{name:"twitter:description",content:"Real-time valuations, earnings briefings and AI analyst for the India listed defence sector."}},
    {{name:"twitter:image",      content:"{_OG_IMAGE}"}},
  ].forEach(function(a) {{
    var m = document.createElement("meta");
    Object.keys(a).forEach(function(k) {{ m.setAttribute(k, a[k]); }});
    H.appendChild(m);
  }});

  // JSON-LD structured data (WebApplication + Person)
  var ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.text = JSON.stringify({{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "DefStrat",
    "url": window.location.href,
    "description": "Real-time financial intelligence platform for the India listed defence sector — valuations, earnings, AI analysis.",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web",
    "browserRequirements": "Requires JavaScript",
    "offers": {{"@type":"Offer","price":"0","priceCurrency":"USD"}},
    "author": {{
      "@type": "Person",
      "name": "Nishant Prabhakar",
      "url": "https://github.com/nishantsprabhakar"
    }},
    "image": "{_OG_IMAGE}",
    "keywords": "India defence stocks, HAL, BEL, Bharat Forge, equity research, defence sector"
  }});
  H.appendChild(ld);
}})();
</script>
""", unsafe_allow_html=True)

# ── Logo loader ───────────────────────────────────────────────────────────────
_LOGO_PATH = Path(__file__).parent / "logo.png"

def _logo_html(height: int = 56, bg: bool = False) -> str:
    if _LOGO_PATH.exists():
        with open(_LOGO_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        container_style = (
            "display:inline-flex;flex-direction:column;align-items:center;"
            "background:#ffffff;border-radius:10px;padding:8px 14px 7px;"
        ) if bg else (
            "display:inline-flex;flex-direction:column;align-items:center;"
        )
        byline_color = "#1a2840" if bg else "#4a6080"
        return (
            f'<div style="{container_style}">'
            f'<img src="data:image/png;base64,{b64}" '
            f'style="height:{height}px;width:auto;object-fit:contain;display:block;" />'
            f'<div style="font-family:Inter,Arial,sans-serif;font-size:10px;'
            f'font-weight:600;color:{byline_color};letter-spacing:1.2px;'
            f'text-transform:uppercase;margin-top:5px;white-space:nowrap;">'
            f'by Nishant Prabhakar</div>'
            f'</div>'
        )
    # Fallback SVG — shield + bar chart + jet silhouette
    return f"""
<svg width="{int(height*4.8)}" height="{height}" viewBox="0 0 280 58"
     xmlns="http://www.w3.org/2000/svg" style="display:block">
  <defs>
    <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e4fff"/>
      <stop offset="100%" stop-color="#00d4ff"/>
    </linearGradient>
  </defs>
  <path d="M6,7 L34,3 L62,7 L62,34 Q62,52 34,59 Q6,52 6,34 Z"
        fill="#060f22" stroke="url(#sg)" stroke-width="2"/>
  <path d="M16,13 L34,9 L52,13 L52,32 Q52,46 34,52 Q16,46 16,32 Z"
        fill="none" stroke="#1e6fff" stroke-width="0.8" opacity="0.5"/>
  <rect x="24" y="42" width="6" height="10" fill="#00d4ff" rx="1" opacity="0.9"/>
  <rect x="33" y="35" width="6" height="17" fill="#1e6fff" rx="1" opacity="0.9"/>
  <rect x="42" y="27" width="6" height="25" fill="#00d4ff" rx="1" opacity="0.9"/>
  <path d="M20,46 Q34,38 58,28" fill="none" stroke="#00d4ff" stroke-width="1.8" opacity="0.5"/>
  <g transform="translate(63,6) rotate(-38)">
    <path d="M0,0 L22,0 Q26,0 28,2 Q26,4 22,4 L0,4 Z" fill="#4a7aff" opacity="0.9"/>
    <path d="M6,-5 L20,2 L6,4 Z" fill="#00d4ff" opacity="0.85"/>
    <path d="M6,4 L20,2 L6,9 Z" fill="#00d4ff" opacity="0.85"/>
    <path d="M-2,-3 L8,2 L-2,4 Z" fill="#4a7aff" opacity="0.7"/>
    <path d="M-2,4 L8,2 L-2,7 Z" fill="#4a7aff" opacity="0.7"/>
  </g>
  <text x="96" y="33" font-family="Inter,Arial,sans-serif" font-weight="900"
        font-size="26" fill="#e8f0ff" letter-spacing="0.5">Def</text>
  <text x="135" y="33" font-family="Inter,Arial,sans-serif" font-weight="300"
        font-size="26" fill="#7aa8ff" letter-spacing="0.5">Strat</text>
  <line x1="96" y1="43" x2="118" y2="43" stroke="#1e3a60" stroke-width="1"/>
  <text x="121" y="46" font-family="Inter,Arial,sans-serif" font-size="10"
        fill="#4a6080" letter-spacing="0.4">by Nishant Prabhakar</text>
  <line x1="240" y1="43" x2="262" y2="43" stroke="#1e3a60" stroke-width="1"/>
</svg>"""

# ── Military dark theme CSS ───────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');

:root {
  --void:    #04070f;
  --bg:      #07090f;
  --card:    #0b0f1a;
  --card2:   #0e1422;
  --border:  #141e30;
  --border2: #1a2840;
  --blue:    #1e6fff;
  --cyan:    #00d4ff;
  --green:   #00e676;
  --amber:   #ffab40;
  --red:     #ff1744;
  --purple:  #7c4dff;
  --text:    #d4e4ff;
  --dim:     #4a6080;
  --mono:    'JetBrains Mono', monospace;
}

/* ── base ── */
html, body, [class*="css"] {
  font-family: 'Inter', sans-serif !important;
  color: var(--text) !important;
}
.stApp, [data-testid="stAppViewContainer"],
section[data-testid="stMain"] { background: var(--bg) !important; }
[data-testid="stSidebar"] {
  background: var(--void) !important;
  border-right: 1px solid var(--border2) !important;
}

/* ── hide default Streamlit chrome ── */
#MainMenu, footer, header { visibility: hidden; }
[data-testid="stDecoration"] { display: none; }

/* ── top banner ── */
.ds-banner {
  background: linear-gradient(135deg, #04070f 0%, #07102a 40%, #04070f 100%);
  border-bottom: 2px solid var(--border2);
  border-left: 4px solid var(--cyan);
  padding: 16px 28px;
  display: flex; align-items: center; gap: 0;
  margin-bottom: 24px;
  min-height: 96px;
  box-shadow: 0 4px 24px rgba(0,212,255,0.06);
}
.ds-banner-title {
  font-size: 11px; font-weight: 600; color: var(--dim);
  text-transform: uppercase; letter-spacing: 2px;
}
.ds-banner-sub {
  font-size: 11px; color: var(--dim); letter-spacing: 0.5px;
}

/* ── section headers ── */
.sec-hdr {
  font-size: 11px; font-weight: 700; color: var(--cyan);
  text-transform: uppercase; letter-spacing: 2.5px;
  border-bottom: 1px solid var(--border2);
  padding-bottom: 8px; margin: 24px 0 14px;
  display: flex; align-items: center; gap: 8px;
}
.sec-hdr::before {
  content: ""; width: 3px; height: 14px;
  background: linear-gradient(to bottom, var(--cyan), var(--blue));
  border-radius: 2px; display: inline-block;
}

/* ── metric cards ── */
.kpi-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.kpi-card {
  flex: 1; min-width: 130px;
  background: var(--card);
  border: 1px solid var(--border2);
  border-top: 2px solid var(--blue);
  border-radius: 8px;
  padding: 14px 16px;
  position: relative; overflow: hidden;
}
.kpi-card::after {
  content: ""; position: absolute; top: 0; right: 0;
  width: 40px; height: 40px;
  background: radial-gradient(circle at top right, rgba(30,111,255,0.08), transparent);
}
.kpi-label {
  font-size: 9px; font-weight: 700; color: var(--dim);
  text-transform: uppercase; letter-spacing: 1.8px; margin-bottom: 6px;
}
.kpi-val {
  font-family: var(--mono); font-size: 20px;
  font-weight: 600; color: var(--cyan);
}
.kpi-delta { font-family: var(--mono); font-size: 12px; margin-top: 4px; }
.kpi-delta.up   { color: var(--green); }
.kpi-delta.down { color: var(--red); }

/* ── data cards (IC memos etc.) ── */
.data-card {
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 18px 22px;
  margin-bottom: 14px;
}

/* ── IC KV strip ── */
.ic-kv { display: flex; gap: 16px; flex-wrap: wrap; margin: 12px 0; }
.ic-kv-item {
  background: var(--card2); border: 1px solid var(--border);
  border-radius: 6px; padding: 8px 14px; text-align: center; min-width: 82px;
}
.ic-kv-label {
  font-size: 9px; font-weight: 700; color: var(--dim);
  text-transform: uppercase; letter-spacing: 1.2px;
}
.ic-kv-val {
  font-family: var(--mono); font-size: 15px;
  font-weight: 600; color: var(--cyan); margin-top: 3px;
}
.ic-kv-val.pos { color: var(--green); }
.ic-kv-val.neg { color: var(--red); }

/* ── verdict box ── */
.verdict {
  background: rgba(0,230,118,0.06);
  border: 1px solid rgba(0,230,118,0.3);
  border-left: 3px solid var(--green);
  border-radius: 6px; padding: 10px 16px; margin: 12px 0;
  color: var(--green); font-size: 13px; font-weight: 600;
}

/* ── IC text ── */
.ic-bullet { color: var(--text); font-size: 13px; line-height: 1.7; margin: 3px 0; }
.ic-comment { color: var(--dim); font-size: 12px; line-height: 1.6; margin: 3px 0; }
.ic-risk { color: var(--amber); font-size: 12px; line-height: 1.6; margin: 3px 0; }

/* ── analyst badges ── */
.badge {
  display: inline-block; border-radius: 4px;
  padding: 2px 10px; font-size: 11px; font-weight: 700;
  font-family: var(--mono); letter-spacing: 0.5px;
}
.badge-buy  { background: rgba(0,230,118,0.12); border:1px solid var(--green); color:var(--green); }
.badge-hold { background: rgba(255,171,64,0.12); border:1px solid var(--amber); color:var(--amber); }
.badge-sell { background: rgba(255,23,68,0.12);  border:1px solid var(--red);   color:var(--red); }
.badge-na   { background: rgba(74,96,128,0.12);  border:1px solid var(--dim);   color:var(--dim); }

/* ── AI response ── */
.ai-box {
  background: linear-gradient(135deg, #080f1e 0%, #0a0f1a 100%);
  border: 1px solid var(--border2);
  border-left: 3px solid var(--cyan);
  border-radius: 8px; padding: 20px 24px; margin-top: 16px;
}
.ai-box-label {
  font-size: 9px; font-weight: 700; color: var(--cyan);
  text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 14px;
  display: flex; align-items: center; gap: 8px;
}
.ai-box-body {
  font-size: 14px; color: var(--text); line-height: 1.8;
  white-space: pre-wrap; font-family: 'Inter', sans-serif;
}

/* ── download buttons ── */
div[data-testid="stDownloadButton"] > button {
  background: linear-gradient(135deg, #0d2a5e, #1e4fff) !important;
  color: #e8f0ff !important; border: 1px solid #2a5fff !important;
  border-radius: 6px !important; font-weight: 600 !important;
  font-size: 13px !important; letter-spacing: 0.3px !important;
  padding: 8px 20px !important; width: 100% !important;
  transition: all 0.2s !important;
}
div[data-testid="stDownloadButton"] > button:hover {
  background: linear-gradient(135deg, #1a3a7a, #2a5fff) !important;
  border-color: #4a7fff !important;
}

/* ── primary buttons ── */
div[data-testid="stButton"] > button[kind="primary"] {
  background: linear-gradient(135deg, #0d2a5e, #1e4fff) !important;
  color: #e8f0ff !important; border: 1px solid #2a5fff !important;
  border-radius: 6px !important; font-weight: 600 !important;
}

/* ── secondary / expand buttons ── */
div[data-testid="stButton"] > button[kind="secondary"] {
  background: var(--card2) !important; color: var(--dim) !important;
  border: 1px solid var(--border2) !important; border-radius: 4px !important;
  font-size: 11px !important; padding: 3px 10px !important;
}
div[data-testid="stButton"] > button[kind="secondary"]:hover {
  border-color: var(--cyan) !important; color: var(--cyan) !important;
}

/* ── tabs ── */
[data-testid="stTabs"] [role="tablist"] {
  background: var(--card) !important;
  border-radius: 8px 8px 0 0;
  border: 1px solid var(--border2);
  border-bottom: none;
  padding: 4px 8px 0;
  gap: 2px;
}
[data-testid="stTabs"] [role="tab"] {
  color: var(--dim) !important; font-size: 12px !important;
  font-weight: 600 !important; letter-spacing: 0.5px !important;
  padding: 8px 16px !important; border-radius: 6px 6px 0 0 !important;
}
[data-testid="stTabs"] [role="tab"][aria-selected="true"] {
  color: var(--cyan) !important;
  background: var(--bg) !important;
  border-bottom: 2px solid var(--cyan) !important;
}
[data-testid="stTabContent"] {
  border: 1px solid var(--border2) !important;
  border-top: none !important;
  border-radius: 0 0 8px 8px !important;
  padding: 20px !important;
  background: var(--bg) !important;
}

/* ── tables ── */
[data-testid="stDataFrame"] {
  border: 1px solid var(--border2) !important;
  border-radius: 8px !important; overflow: hidden !important;
}
[data-testid="stDataFrame"] th {
  background: var(--card2) !important; color: var(--cyan) !important;
  font-size: 11px !important; text-transform: uppercase !important;
  letter-spacing: 1px !important;
}

/* ── inputs ── */
[data-testid="stTextInput"] input,
[data-testid="stTextArea"] textarea,
[data-testid="stSelectbox"] > div {
  background: var(--card) !important;
  border: 1px solid var(--border2) !important;
  color: var(--text) !important; border-radius: 6px !important;
}
[data-testid="stTextInput"] input:focus,
[data-testid="stTextArea"] textarea:focus {
  border-color: var(--cyan) !important;
  box-shadow: 0 0 0 1px var(--cyan) !important;
}

/* ── sidebar ── */
[data-testid="stSidebar"] label { color: var(--dim) !important; font-size: 11px !important; }
[data-testid="stSidebar"] .stRadio label { color: var(--text) !important; font-size: 13px !important; }
[data-testid="stSidebar"] .stExpander { border-color: var(--border2) !important; }

/* ── expanders ── */
[data-testid="stExpander"] {
  border: 1px solid var(--border2) !important;
  border-radius: 8px !important;
  background: var(--card) !important;
}
[data-testid="stExpander"] summary {
  color: var(--text) !important; font-weight: 600 !important;
}

/* ── progress bar ── */
[data-testid="stProgressBar"] > div { background: var(--card) !important; }
[data-testid="stProgressBar"] > div > div {
  background: linear-gradient(to right, var(--blue), var(--cyan)) !important;
}

/* ── copyright ── */
.footer {
  text-align: center; font-size: 11px; color: var(--border2);
  padding: 20px 0 8px; margin-top: 40px;
  border-top: 1px solid var(--border);
  font-family: var(--mono);
}

/* ── quick buttons ── */
.quick-btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }

/* ── company badge ── */
.co-badge {
  display: inline-block;
  background: var(--card2); border: 1px solid var(--border2);
  border-radius: 20px; padding: 3px 14px;
  font-size: 11px; color: var(--cyan); font-weight: 600;
}

/* ── status dot ── */
.dot-live { display:inline-block; width:6px; height:6px; border-radius:50%;
  background:var(--green); margin-right:6px; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
</style>
""", unsafe_allow_html=True)

# ── Deferred imports ──────────────────────────────────────────────────────────
from companies import DEFENCE_COMPANIES
import data_fetcher as df_mod
import chart_generator as cg
import docx_exporter as dx
import excel_exporter as ex
import earnings_summary as es
import historical_analysis as ha
import llm_analyst as llm


# ── Zoom dialog ───────────────────────────────────────────────────────────────
@st.dialog("Chart — Full Size", width="large")
def _zoom_modal(img_bytes: bytes):
    st.image(img_bytes, use_container_width=True)


def zoomable_image(img_bytes: bytes, key: str):
    st.image(img_bytes, use_container_width=True)
    if st.button("⤢ Expand", key=f"zoom_{key}", type="secondary"):
        _zoom_modal(img_bytes)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cr(val):
    if val is None: return "—"
    if val >= 100000: return f"₹{val/100000:.1f}L Cr"
    if val >= 1000:   return f"₹{val/1000:.1f}K Cr"
    return f"₹{val:,.0f} Cr"

def _pct(val):
    return f"{val:+.1f}%" if val is not None else "—"

def _ratio(val):
    return f"{val:.2f}x" if val is not None else "—"

def _pct_str(val):
    if not isinstance(val, (int, float)): return "N/A"
    return f"{val:+.1f}%"

def _pct_class(val):
    if not isinstance(val, (int, float)): return "ic-kv-val"
    return "ic-kv-val pos" if val >= 0 else "ic-kv-val neg"

def _num(v):
    return v if isinstance(v, (int, float)) else None

def kpi_card(col, label: str, value: str, delta=None):
    delta_html = ""
    if delta is not None and isinstance(delta, (int, float)):
        cls  = "up" if delta >= 0 else "down"
        arrow = "▲" if delta >= 0 else "▼"
        delta_html = f'<div class="kpi-delta {cls}">{arrow} {abs(delta):.1f}%</div>'
    col.html(
        '<div class="kpi-card">'
        f'<div class="kpi-label">{label}</div>'
        f'<div class="kpi-val">{value}</div>'
        f'{delta_html}'
        '</div>'
    )

def sec_header(title: str):
    st.html(f'<div class="sec-hdr">{title}</div>')

def _badge(rating: str) -> str:
    if not rating or rating in ("N/A", "NONE", ""):
        return '<span class="badge badge-na">N/A</span>'
    r = rating.upper()
    if "BUY" in r:
        return f'<span class="badge badge-buy">{r}</span>'
    if "HOLD" in r or "NEUTRAL" in r:
        return f'<span class="badge badge-hold">{r}</span>'
    if "SELL" in r or "REDUCE" in r or "UNDER" in r:
        return f'<span class="badge badge-sell">{r}</span>'
    return f'<span class="badge badge-na">{r}</span>'

def render_ic_memo(briefing: dict):
    verdict = briefing.get("ic_verdict", "")
    if verdict and verdict != "Insufficient data for IC verdict.":
        st.html(f'<div class="verdict">⚖ IC Verdict — {verdict}</div>')

    rev_lq   = briefing.get("revenue_lq",      "N/A")
    rev_qoq  = briefing.get("revenue_qoq")
    rev_yoy  = briefing.get("revenue_yoy")
    pat_lq   = briefing.get("pat_lq",           "N/A")
    pat_yoy  = briefing.get("pat_yoy")
    ebitda_m = briefing.get("ebitda_margin_lq")
    pat_m    = briefing.get("pat_margin_lq")
    rating   = briefing.get("analyst_rating",   "N/A")
    target   = briefing.get("analyst_target")
    eps_surp = briefing.get("eps_surprise_pct")

    kv_items = [
        ("Revenue",     rev_lq,                                                            None),
        ("Rev YoY",     _pct_str(rev_yoy),                                                 _num(rev_yoy)),
        ("Rev QoQ",     _pct_str(rev_qoq),                                                 _num(rev_qoq)),
        ("PAT",         pat_lq,                                                            None),
        ("PAT YoY",     _pct_str(pat_yoy),                                                 _num(pat_yoy)),
        ("EBITDA Mgn",  f"{ebitda_m:.1f}%" if isinstance(ebitda_m,(int,float)) else "N/A", None),
        ("PAT Mgn",     f"{pat_m:.1f}%"    if isinstance(pat_m,(int,float))    else "N/A", None),
        ("EPS Surp.",   _pct_str(eps_surp),                                                _num(eps_surp)),
    ]
    kv_html = '<div class="ic-kv">'
    for label, val, num in kv_items:
        cls = _pct_class(num) if num is not None else "ic-kv-val"
        kv_html += (
            f'<div class="ic-kv-item">'
            f'<div class="ic-kv-label">{label}</div>'
            f'<div class="{cls}">{val}</div>'
            f'</div>'
        )
    kv_html += '</div>'
    st.html(kv_html)

    a_line = f'Consensus: {_badge(rating)}'
    if target:
        a_line += f'&nbsp;&nbsp;Target: <span style="color:#e8f0ff;font-family:var(--mono)">₹{target:.0f}</span>'
    a_line += f'&nbsp;&nbsp;<span style="color:var(--dim);font-size:12px">{briefing.get("recommendations_summary","")}</span>'
    st.html(f'<div style="margin:10px 0 14px;font-size:13px">{a_line}</div>')

    highlights = briefing.get("key_highlights", [])
    if highlights:
        st.markdown("**Highlights**")
        for h in highlights:
            st.html(f'<div class="ic-bullet">▸ {h}</div>')

    commentary = briefing.get("management_commentary", [])
    if commentary:
        st.markdown("**Commentary**")
        for c in commentary:
            st.html(f'<div class="ic-comment">◦ {c}</div>')

    risks = briefing.get("risks", [])
    if risks:
        with st.expander("⚠ Key Risks", expanded=False):
            for r in risks:
                st.html(f'<div class="ic-risk">⚡ {r}</div>')

    roce = briefing.get("annual_roce_trend", [])
    if roce:
        roce_str = "  ›  ".join(f"{r['year']}: {r['roce']:.1f}%" for r in roce)
        st.html(f'<div style="font-size:11px;color:var(--dim);margin-top:8px;font-family:var(--mono)">ROCE: {roce_str}</div>')


@st.cache_data(ttl=3600, show_spinner=False)
def load_company(ticker: str) -> dict:
    return df_mod.fetch_company_data(ticker)

@st.cache_data(ttl=3600, show_spinner=False)
def load_all_companies(tickers: tuple) -> dict:
    return {t: df_mod.fetch_company_data(t) for t in tickers}


# ── Session state ─────────────────────────────────────────────────────────────
_SS_DEFAULTS = {
    "custom_companies": [],
    "ai_response":      "",
    "co_ai_response":   "",
    "ds_provider":      "groq",
    "ds_api_key":       os.environ.get("ANTHROPIC_API_KEY", ""),
    "ds_groq_key":      os.environ.get("GROQ_API_KEY", ""),
    "ds_groq_model":    "llama-3.3-70b-versatile",
    "ds_ollama_url":    "http://localhost:11434",
    "ds_ollama_model":  "llama3.2",
}
for k, v in _SS_DEFAULTS.items():
    if k not in st.session_state:
        st.session_state[k] = v


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.html(
        f'<div style="padding:12px 4px 10px 4px">{_logo_html(64, bg=True)}</div>'
    )
    st.html('<div style="height:1px;background:var(--border2);margin:4px 0 12px 0"></div>')

    mode = st.radio(
        "", ["🏠  Sector Overview", "🏢  Company Deep-Dive"], index=0,
        label_visibility="collapsed",
    )

    st.html('<div style="height:1px;background:var(--border);margin:10px 0"></div>')

    # ── AI Settings ──
    with st.expander("🤖  AI Settings", expanded=False):
        provider = st.selectbox(
            "Provider",
            ["groq", "ollama"],
            index=["groq","ollama"].index(st.session_state.ds_provider),
            format_func=lambda x: {
                "groq":   "Groq — Free  (console.groq.com)",
                "ollama": "Ollama — Local  (no key needed)",
            }[x],
        )
        st.session_state.ds_provider = provider

        if provider == "groq":
            gkey = st.text_input(
                "Groq API Key", value=st.session_state.ds_groq_key,
                type="password", placeholder="gsk_...",
                help="Free at console.groq.com — no credit card required",
            )
            st.session_state.ds_groq_key = gkey
            st.session_state.ds_groq_model = st.selectbox(
                "Model", llm.GROQ_MODELS,
                index=llm.GROQ_MODELS.index(st.session_state.ds_groq_model)
                      if st.session_state.ds_groq_model in llm.GROQ_MODELS else 0,
            )
            if gkey:
                st.success("Key set ✓", icon="🔑")
            else:
                st.caption("👆 Get your free key at [console.groq.com](https://console.groq.com)")
        else:
            st.session_state.ds_ollama_url = st.text_input(
                "Ollama URL", value=st.session_state.ds_ollama_url,
            )
            st.session_state.ds_ollama_model = st.text_input(
                "Model name", value=st.session_state.ds_ollama_model,
                placeholder="llama3.2",
            )
            st.caption("Run `ollama serve` and `ollama pull llama3.2` to start.")

    # ── Add company ──
    with st.expander("➕  Add Company", expanded=False):
        with st.form("add_co", clear_on_submit=True):
            nn = st.text_input("Company name", placeholder="e.g. HAL")
            ns = st.text_input("Short name",   placeholder="e.g. HAL")
            nt = st.text_input("NSE ticker",   placeholder="e.g. HAL.NS")
            nc = st.text_input("Sub-sector",   placeholder="e.g. Aircraft")
            nd = st.text_area("Description",   placeholder="Optional")
            if st.form_submit_button("Add", use_container_width=True):
                if nn and nt:
                    tc = nt.strip().upper()
                    if not tc.endswith((".NS", ".BO")): tc += ".NS"
                    existing = [c["ticker"] for c in DEFENCE_COMPANIES + st.session_state.custom_companies]
                    if tc in existing:
                        st.warning(f"{tc} already tracked.")
                    else:
                        st.session_state.custom_companies.append({
                            "name": nn.strip(), "short": ns.strip() or tc.split(".")[0],
                            "ticker": tc, "bse_code": "",
                            "sector": "Aerospace & Defence",
                            "sub_sector": nc.strip() or "Defence",
                            "description": nd.strip() or f"{nn.strip()} — user-added.",
                        })
                        st.success(f"Added {nn.strip()}")
                        st.cache_data.clear()
                else:
                    st.error("Name and ticker required.")

    if st.session_state.custom_companies:
        with st.expander("🗑  Remove Companies", expanded=False):
            rm = st.multiselect("", [c["name"] for c in st.session_state.custom_companies],
                                label_visibility="collapsed")
            if st.button("Remove selected", use_container_width=True) and rm:
                st.session_state.custom_companies = [
                    c for c in st.session_state.custom_companies if c["name"] not in rm
                ]
                st.cache_data.clear()
                st.rerun()

    all_companies = DEFENCE_COMPANIES + st.session_state.custom_companies

    if "Deep-Dive" in mode:
        st.html('<div style="height:1px;background:var(--border2);margin:10px 0"></div>')
        co_map = {c["name"]: c for c in all_companies}
        selected_name = st.selectbox("", list(co_map.keys()), label_visibility="collapsed")
        selected_meta = co_map[selected_name]
    else:
        selected_meta = None

    st.html('<div style="height:1px;background:var(--border);margin:10px 0"></div>')
    st.html(
        f'<div style="font-size:10px;color:var(--dim);line-height:1.8">'
        f'<span class="dot-live"></span>LIVE  ·  {datetime.now().strftime("%d %b %Y  %H:%M")}<br>'
        f'{len(all_companies)} companies  ·  Values in ₹ Cr'
        f'</div>'
    )


# ─────────────────────────────────────────────────────────────────────────────
#  SECTOR OVERVIEW
# ─────────────────────────────────────────────────────────────────────────────

def _manage_panel(all_companies: list):
    """Manage companies and API keys — full-width dedicated panel."""

    # ── AI / LLM Settings ────────────────────────────────────────────────────
    sec_header("🤖  AI Analyst Settings")
    st.html(
        '<div style="font-size:12px;color:var(--dim);margin-bottom:16px">'
        'Configure the LLM provider for the DefStrat AI Analyst. '
        'Groq is completely free — no credit card required.</div>'
    )

    cfg1, cfg2 = st.columns([1, 2])
    with cfg1:
        provider = st.selectbox(
            "LLM Provider",
            ["groq", "ollama"],
            index=["groq","ollama"].index(st.session_state.ds_provider),
            format_func=lambda x: {
                "groq":   "☁️  Groq  — Free cloud  (Llama 3.3 70B)",
                "ollama": "💻  Ollama  — Local, no key needed",
            }[x],
            key="mgmt_provider_sel",
        )
        if provider != st.session_state.ds_provider:
            st.session_state.ds_provider = provider
            st.rerun()

    with cfg2:
        if st.session_state.ds_provider == "groq":
            c1, c2 = st.columns([3, 2])
            with c1:
                gkey = st.text_input(
                    "Groq API Key",
                    value=st.session_state.ds_groq_key,
                    type="password",
                    placeholder="gsk_...",
                    help="Free at console.groq.com — no credit card required",
                    key="mgmt_groq_key",
                )
                if gkey != st.session_state.ds_groq_key:
                    st.session_state.ds_groq_key = gkey
            with c2:
                mdl = st.selectbox(
                    "Model",
                    llm.GROQ_MODELS,
                    index=llm.GROQ_MODELS.index(st.session_state.ds_groq_model)
                          if st.session_state.ds_groq_model in llm.GROQ_MODELS else 0,
                    key="mgmt_groq_model",
                )
                if mdl != st.session_state.ds_groq_model:
                    st.session_state.ds_groq_model = mdl

            if st.session_state.ds_groq_key:
                st.success("API key saved  ✓", icon="🔑")
            else:
                st.html(
                    '<div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.25);'
                    'border-radius:6px;padding:10px 14px;font-size:12px;color:#4a8fcc;margin-top:8px">'
                    '1. Go to <strong>console.groq.com</strong><br>'
                    '2. Create a free account (no credit card)<br>'
                    '3. API Keys → Create API Key → paste above'
                    '</div>'
                )
        else:
            c1, c2 = st.columns(2)
            with c1:
                url = st.text_input(
                    "Ollama URL",
                    value=st.session_state.ds_ollama_url,
                    key="mgmt_ollama_url",
                )
                if url != st.session_state.ds_ollama_url:
                    st.session_state.ds_ollama_url = url
            with c2:
                mdl = st.text_input(
                    "Model",
                    value=st.session_state.ds_ollama_model,
                    placeholder="llama3.2",
                    key="mgmt_ollama_model",
                )
                if mdl != st.session_state.ds_ollama_model:
                    st.session_state.ds_ollama_model = mdl
            st.html(
                '<div style="font-size:11px;color:var(--dim);margin-top:6px">'
                'Run <code style="color:var(--cyan)">ollama serve</code> in terminal, '
                'then <code style="color:var(--cyan)">ollama pull llama3.2</code> to download the model.'
                '</div>'
            )

    st.html('<div style="height:1px;background:var(--border2);margin:24px 0"></div>')

    # ── Company Universe ──────────────────────────────────────────────────────
    sec_header("🏢  Company Universe")

    # Current companies table
    st.markdown(f"**{len(all_companies)} companies tracked**")
    default_tickers = {c["ticker"] for c in DEFENCE_COMPANIES}
    tbl_rows = []
    for c in all_companies:
        tbl_rows.append({
            "Company":     c["name"],
            "Short":       c["short"],
            "NSE Ticker":  c["ticker"],
            "Sub-sector":  c.get("sub_sector",""),
            "Type":        "Default" if c["ticker"] in default_tickers else "Custom",
        })
    st.dataframe(pd.DataFrame(tbl_rows), use_container_width=True, hide_index=True)

    st.html('<div style="height:1px;background:var(--border);margin:20px 0"></div>')

    # Add company
    st.markdown("##### ➕  Add Company")
    ac1, ac2, ac3, ac4 = st.columns(4)
    with ac1:
        nn = st.text_input("Company Name",  placeholder="e.g. Hindustan Aeronautics",   key="mgmt_name")
    with ac2:
        ns = st.text_input("Short Label",   placeholder="e.g. HAL",                     key="mgmt_short")
    with ac3:
        nt = st.text_input("NSE Ticker",    placeholder="e.g. HAL.NS",                  key="mgmt_ticker")
    with ac4:
        nc = st.text_input("Sub-sector",    placeholder="e.g. Aircraft Manufacturing",  key="mgmt_sector")
    nd = st.text_input("Description (optional)", placeholder="Brief company overview",  key="mgmt_desc")

    if st.button("➕  Add to Universe", type="primary", key="mgmt_add_btn", use_container_width=False):
        if nn and nt:
            tc = nt.strip().upper()
            if not tc.endswith((".NS", ".BO")):
                tc += ".NS"
            existing = [c["ticker"] for c in DEFENCE_COMPANIES + st.session_state.custom_companies]
            if tc in existing:
                st.warning(f"{tc} is already in the universe.")
            else:
                st.session_state.custom_companies.append({
                    "name":        nn.strip(),
                    "short":       ns.strip() or tc.split(".")[0],
                    "ticker":      tc,
                    "bse_code":    "",
                    "sector":      "Aerospace & Defence",
                    "sub_sector":  nc.strip() or "Defence",
                    "description": nd.strip() or f"{nn.strip()} — user-added.",
                })
                st.success(f"✓  {nn.strip()} added. Refresh data to include in analysis.")
                st.cache_data.clear()
                st.rerun()
        else:
            st.error("Company name and NSE ticker are required.")

    # Remove company
    custom = st.session_state.custom_companies
    if custom:
        st.html('<div style="height:1px;background:var(--border);margin:16px 0"></div>')
        st.markdown("##### 🗑️  Remove Custom Companies")
        to_rm = st.multiselect(
            "Select companies to remove",
            options=[c["name"] for c in custom],
            key="mgmt_remove_ms",
        )
        if st.button("Remove Selected", key="mgmt_rm_btn", type="secondary") and to_rm:
            st.session_state.custom_companies = [
                c for c in custom if c["name"] not in to_rm
            ]
            st.cache_data.clear()
            st.success(f"Removed {', '.join(to_rm)}.")
            st.rerun()
    else:
        st.html('<div style="font-size:12px;color:var(--dim);margin-top:8px">No custom companies added yet.</div>')


def _ai_panel(panel_key: str, all_metrics: list, briefings: dict):
    """Reusable AI query panel."""
    sec_header("DefStrat AI Analyst")
    st.html(
        '<div style="font-size:12px;color:var(--dim);margin-bottom:16px">'
        'Ask any question about company financials, valuations, earnings, or comparisons. '
        'All data is live — powered by '
        f'{"Groq (Llama 3.3)" if st.session_state.ds_provider=="groq" else "Ollama (local)"}.'
        '</div>'
    )

    provider = st.session_state.ds_provider
    ready = (provider == "ollama") or bool(st.session_state.ds_groq_key)

    if not ready:
        st.html(
            '<div style="background:rgba(255,171,64,0.06);border:1px solid rgba(255,171,64,0.3);'
            'border-left:3px solid var(--amber);border-radius:6px;padding:12px 16px;'
            'color:var(--amber);font-size:13px">'
            '⚡ Groq API key needed — it\'s free. '
            'Sign up at <strong>console.groq.com</strong> (no credit card) then paste your key '
            'in <strong>AI Settings</strong> in the sidebar.'
            '</div>'
        )

    # Quick questions
    qs = [
        "Which company has the highest ROCE?",
        "Compare all companies by PAT margin",
        "Best P/E relative to growth?",
        "IC verdict summary — all companies",
    ]
    cols = st.columns(4)
    for i, (c, q) in enumerate(zip(cols, qs)):
        if c.button(q, key=f"{panel_key}_qq_{i}", use_container_width=True, type="secondary"):
            st.session_state[f"{panel_key}_prefill"] = q

    prefill = st.session_state.pop(f"{panel_key}_prefill", "")
    q_text = st.text_area(
        "Question", value=prefill, height=80, key=f"{panel_key}_q",
        label_visibility="collapsed",
        placeholder="e.g. Compare Zen Technologies vs Data Patterns on valuation and margin quality…",
    )

    c1, c2 = st.columns([4, 1])
    with c1:
        ask = st.button("🚀  Ask DefStrat AI", key=f"{panel_key}_ask",
                        type="primary", use_container_width=True)
    with c2:
        if st.button("Clear", key=f"{panel_key}_clr", use_container_width=True):
            st.session_state[f"{panel_key}_resp"] = ""
            st.rerun()

    if f"{panel_key}_resp" not in st.session_state:
        st.session_state[f"{panel_key}_resp"] = ""

    if ask and q_text:
        if not ready:
            st.session_state[f"{panel_key}_resp"] = (
                "⚠️ Set your Groq API key in the sidebar first (free at console.groq.com)."
            )
        else:
            with st.spinner("Analysing…"):
                st.session_state[f"{panel_key}_resp"] = llm.query(
                    question    = q_text,
                    all_metrics = all_metrics,
                    briefings   = briefings,
                    provider    = provider,
                    api_key     = st.session_state.ds_groq_key,
                    model       = st.session_state.ds_groq_model if provider == "groq" else st.session_state.ds_ollama_model,
                    ollama_url  = st.session_state.ds_ollama_url,
                )

    if st.session_state[f"{panel_key}_resp"]:
        st.html(
            '<div class="ai-box">'
            '<div class="ai-box-label">🎯 DEFSTRAT AI RESPONSE</div>'
            f'<div class="ai-box-body">{st.session_state[f"{panel_key}_resp"]}</div>'
            '</div>'
        )


if "Overview" in mode:
    # ── Header ──
    st.html(
        '<div class="ds-banner">'
        + _logo_html(68, bg=True) +
        '<div style="margin-left:16px">'
        '<div class="ds-banner-title">India Defence Intelligence</div>'
        '<div class="ds-banner-sub">'
        f'Sector overview  ·  {len(all_companies)} companies  ·  '
        f'<span class="dot-live"></span>Live data'
        '</div>'
        '</div>'
        '</div>'
    )

    tickers = tuple(c["ticker"] for c in all_companies)
    with st.spinner("Scanning market data…"):
        all_raw = load_all_companies(tickers)

    all_metrics = []
    prog = st.progress(0)
    for i, meta in enumerate(all_companies):
        raw = all_raw.get(meta["ticker"], {})
        if raw:
            all_metrics.append(df_mod.extract_key_metrics(raw, meta))
        prog.progress((i+1)/len(all_companies))
    prog.empty()

    if not all_metrics:
        st.error("No data. Check internet connection.")
        st.stop()

    briefings = {}
    for m in all_companies:
        r = all_raw.get(m["ticker"], {})
        if r:
            briefings[m["ticker"]] = es.build_earnings_briefing(r, m)

    # ── KPI bar ──
    valid_mc = [m["market_cap_cr"] for m in all_metrics if m.get("market_cap_cr")]
    total_mc = sum(valid_mc) if valid_mc else None
    valid_pe = [m["pe_ratio"] for m in all_metrics if m.get("pe_ratio")]
    avg_pe   = sum(valid_pe)/len(valid_pe) if valid_pe else None
    best_ret = max((m.get("price_return_1y") or -999) for m in all_metrics)
    best_co  = next((m["short"] for m in all_metrics if m.get("price_return_1y") == best_ret), "—")

    sec_header("Sector Snapshot")
    k1, k2, k3, k4, k5 = st.columns(5)
    kpi_card(k1, "Combined Market Cap", _cr(total_mc))
    kpi_card(k2, "Companies Tracked",   str(len(all_metrics)))
    kpi_card(k3, "Sector Avg P/E",      f"{avg_pe:.1f}x" if avg_pe else "N/A")
    kpi_card(k4, "Best 1Y Return",      f"{best_ret:+.0f}%  {best_co}")
    valid_roe = [m["roe"] for m in all_metrics if m.get("roe")]
    avg_roe   = sum(valid_roe)/len(valid_roe) if valid_roe else None
    kpi_card(k5, "Sector Avg ROE",      f"{avg_roe:.1f}%" if avg_roe else "N/A")

    # ── Tabs ──
    t1, t2, t3, t4, t5, t6 = st.tabs([
        "📊  Charts",
        "📈  Historical",
        "📋  Earnings",
        "🔢  Comparison",
        "🤖  DefStrat AI",
        "⚙️  Manage",
    ])

    with t1:
        sec_header("Sector Charts")
        cl, cr = st.columns(2)
        with cl:
            st.markdown("##### Revenue & PAT")
            zoomable_image(cg.revenue_comparison_bar(all_metrics), "rev_cmp")
        with cr:
            st.markdown("##### Valuation vs Profitability")
            zoomable_image(cg.market_cap_bubble(all_metrics),       "bubble")

        cl2, cr2 = st.columns(2)
        with cl2:
            st.markdown("##### 1Y Price Return Heatmap")
            zoomable_image(cg.return_heatmap(all_metrics), "heatmap")
        with cr2:
            st.markdown("##### ROE vs ROA")
            zoomable_image(cg.roe_roa_scatter(all_metrics), "roe_roa")

        st.markdown("##### Market Cap Treemap")
        fig = cg.sector_treemap_plotly(all_metrics)
        if fig:
            st.plotly_chart(fig, use_container_width=True)

    with t2:
        sec_header("Historical Analysis — 5-Year PE-Grade Metrics")

        st.markdown("##### Revenue Growth Trajectory")
        zoomable_image(ha.revenue_growth_comparison(all_metrics, all_raw), "rev_growth")

        c1, c2 = st.columns(2)
        with c1:
            st.markdown("##### Return on Capital Employed (ROCE)")
            zoomable_image(ha.roce_comparison_chart(all_metrics, all_raw), "roce")
        with c2:
            st.markdown("##### EBITDA vs PAT Margins")
            zoomable_image(ha.margin_comparison_chart(all_metrics), "margins")

        st.markdown("##### Free Cash Flow Generation")
        zoomable_image(ha.fcf_conversion_chart(all_metrics, all_raw), "fcf")

        st.markdown("##### Peer Valuation Multiples")
        vfig = ha.valuation_multiples_plotly(all_metrics)
        if vfig:
            st.plotly_chart(vfig, use_container_width=True)

        st.markdown("##### Working Capital — Debtor & Inventory Days")
        zoomable_image(ha.working_capital_chart(all_metrics, all_raw), "wc")

    with t3:
        sec_header("IC Earnings Briefings — Latest Quarter")
        st.html('<div style="font-size:12px;color:var(--dim);margin-bottom:16px">Structured IC-grade summaries with QoQ/YoY comparisons, analyst consensus, and IC verdict.</div>')
        for m in all_companies:
            b = briefings.get(m["ticker"])
            if not b:
                continue
            lq = b.get("latest_quarter", "N/A")
            with st.expander(f"{m['name']}  ·  {lq}", expanded=False):
                st.html(
                    f'<div style="font-size:15px;font-weight:700;color:#e8f0ff">{m["name"]}</div>'
                    f'<div style="font-size:11px;color:var(--dim);margin-top:3px">'
                    f'{m["sub_sector"]}  ·  NSE:{m["ticker"].replace(".NS","")}  ·  Q: {lq}'
                    f'</div>'
                )
                render_ic_memo(b)

    with t4:
        sec_header("Peer Comparison Table")
        rows = []
        for m in sorted(all_metrics, key=lambda x: x.get("market_cap_cr") or 0, reverse=True):
            rows.append({
                "Company":    m["short"],
                "Sub-sector": m.get("sub_sector",""),
                "Mkt Cap":    _cr(m.get("market_cap_cr")),
                "Revenue":    _cr(m.get("revenue_cr")),
                "PAT":        _cr(m.get("pat_cr")),
                "PAT%":       _pct(m.get("pat_margin")),
                "P/E":        f"{m['pe_ratio']:.1f}x" if m.get("pe_ratio") else "—",
                "ROE":        _pct(m.get("roe")),
                "D/E":        _ratio(m.get("debt_to_equity")),
                "1Y Ret":     _pct(m.get("price_return_1y")),
                "5Y Ret":     _pct(m.get("price_return_5y")),
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        with st.expander("⚙  Manage Companies", expanded=False):
            st.caption(f"Tracking **{len(all_metrics)}** companies. Use sidebar controls to add/remove.")

    with t5:
        _ai_panel("sector", all_metrics, briefings)

    with t6:
        _manage_panel(all_companies)

    # ── Downloads ──
    sec_header("Downloads")
    dl1, dl2 = st.columns(2)
    with dl1:
        with st.spinner("Building report…"):
            cbm = {
                "revenue_comparison": cg.revenue_comparison_bar(all_metrics),
                "market_cap_bubble":  cg.market_cap_bubble(all_metrics),
                "return_heatmap":     cg.return_heatmap(all_metrics),
                "roe_roa_scatter":    cg.roe_roa_scatter(all_metrics),
                "revenue_growth":     ha.revenue_growth_comparison(all_metrics, all_raw),
                "roce_comparison":    ha.roce_comparison_chart(all_metrics, all_raw),
                "margin_comparison":  ha.margin_comparison_chart(all_metrics),
                "fcf_chart":          ha.fcf_conversion_chart(all_metrics, all_raw),
            }
            docx_b = dx.build_sector_docx(all_metrics, cbm, briefings=briefings)
        st.download_button("📄  Sector Report (.docx)", data=docx_b,
            file_name=f"defstrat_sector_{datetime.now():%Y%m%d}.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            use_container_width=True)
    with dl2:
        with st.spinner("Building workbook…"):
            xl_b = ex.build_sector_excel(all_metrics, all_raw)
        st.download_button("📊  Sector Financials (.xlsx)", data=xl_b,
            file_name=f"defstrat_sector_{datetime.now():%Y%m%d}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True)

    st.html(
        f'<div class="footer">'
        f'DEFSTRAT  ·  INDIA DEFENCE INTELLIGENCE  ·  '
        f'© {datetime.now().year} NISHANT PRABHAKAR  ·  '
        f'DATA VIA YAHOO FINANCE — FOR INFORMATIONAL USE ONLY'
        f'</div>'
    )


# ─────────────────────────────────────────────────────────────────────────────
#  COMPANY DEEP-DIVE
# ─────────────────────────────────────────────────────────────────────────────

else:
    meta = selected_meta

    st.html(
        '<div class="ds-banner">'
        + _logo_html(68, bg=True) +
        '<div style="margin-left:16px">'
        f'<div class="ds-banner-title">Company Deep-Dive</div>'
        f'<div class="ds-banner-sub">{meta["name"]}  ·  {meta["sub_sector"]}</div>'
        '</div>'
        '</div>'
    )

    st.html(
        f'<span class="co-badge">{meta["sub_sector"]}</span>&nbsp;'
        f'<span class="co-badge">NSE: {meta["ticker"].replace(".NS","")}</span>'
    )
    st.markdown(f"*{meta['description']}*")

    with st.spinner(f"Scanning {meta['short']}…"):
        raw = load_company(meta["ticker"])

    if not raw:
        st.error("No data. Check ticker/internet.")
        st.stop()

    metrics      = df_mod.extract_key_metrics(raw, meta)
    trend_df     = df_mod.build_revenue_trend(raw)
    quarterly_df = df_mod.build_quarterly_trend(raw)
    briefing     = es.build_earnings_briefing(raw, meta)

    # ── KPIs ──
    sec_header("Key Metrics")
    r1 = st.columns(5)
    for col, (lbl, val, dlt) in zip(r1, [
        ("Market Cap",  _cr(metrics.get("market_cap_cr")),                                  None),
        ("P/E (TTM)",   f"{metrics['pe_ratio']:.1f}x" if metrics.get("pe_ratio") else "—",  None),
        ("Revenue",     _cr(metrics.get("revenue_cr")),                                     metrics.get("revenue_growth_yoy")),
        ("PAT Margin",  _pct(metrics.get("pat_margin")),                                    None),
        ("ROE",         _pct(metrics.get("roe")),                                           None),
    ]):
        kpi_card(col, lbl, val, dlt)

    r2 = st.columns(5)
    for col, (lbl, val, dlt) in zip(r2, [
        ("EPS (TTM)",  f"₹{metrics['eps_ttm']}" if metrics.get("eps_ttm") else "—", None),
        ("P/B",        _ratio(metrics.get("pb_ratio")),                              None),
        ("D/E",        _ratio(metrics.get("debt_to_equity")),                        None),
        ("1Y Return",  _pct(metrics.get("price_return_1y")),                         None),
        ("Div Yield",  _pct(metrics.get("dividend_yield")),                          None),
    ]):
        kpi_card(col, lbl, val, dlt)

    # ── Tabs ──
    sec_header("Analysis")
    ta, tb, tc, td, te, tf = st.tabs([
        "📈  Price",
        "💰  Financials",
        "🔄  Margins",
        "🏦  Shareholding",
        "📋  IC Brief",
        "🤖  AI",
    ])

    with ta:
        hist = raw.get("history", pd.DataFrame())
        if not hist.empty:
            fig = cg.price_history_plotly(hist, meta["name"])
            if fig: st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Price history unavailable.")

    with tb:
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("##### Annual Revenue & PAT")
            zoomable_image(cg.revenue_pat_bar(trend_df, meta["name"]),          "co_rev")
        with c2:
            st.markdown("##### Quarterly Trend")
            zoomable_image(cg.quarterly_trend_line(quarterly_df, meta["name"]), "co_qtr")
        if not trend_df.empty:
            st.markdown("**Annual Data (₹ Cr)**")
            st.dataframe(trend_df, use_container_width=True, hide_index=True)

    with tc:
        zoomable_image(cg.margin_waterfall(metrics), "co_margin")
        st.dataframe(pd.DataFrame({
            "Metric":      ["Revenue","EBITDA","EBIT","PAT"],
            "Value (₹ Cr)":[_cr(metrics.get("revenue_cr")), _cr(metrics.get("ebitda_cr")),
                            _cr(metrics.get("ebit_cr")),    _cr(metrics.get("pat_cr"))],
            "Margin %":    ["100%", _pct(metrics.get("ebitda_margin")), "—", _pct(metrics.get("pat_margin"))],
        }), use_container_width=True, hide_index=True)

    with td:
        c1, c2 = st.columns(2)
        with c1:
            zoomable_image(cg.shareholding_donut(metrics), "co_sh")
        with c2:
            st.dataframe(pd.DataFrame({
                "Holder":   ["Promoter / Govt","Institutional","Public"],
                "Holding":  [
                    _pct(metrics.get("promoter_holding_pct")),
                    _pct(metrics.get("institutional_holding_pct")),
                    _pct(max(0, 100 - (metrics.get("promoter_holding_pct") or 0)
                               - (metrics.get("institutional_holding_pct") or 0))),
                ],
            }), use_container_width=True, hide_index=True)
            mh = raw.get("institutional_holders", pd.DataFrame())
            if not mh.empty:
                st.markdown("**Top Institutional Holders**")
                st.dataframe(mh.head(10), use_container_width=True, hide_index=True)

    with te:
        sec_header("IC Earnings Briefing — Latest Quarter")
        lq  = briefing.get("latest_quarter",   "N/A")
        pq  = briefing.get("prior_quarter",    "N/A")
        pyq = briefing.get("prior_year_quarter","N/A")
        st.html(
            f'<div style="font-size:15px;font-weight:700;color:#e8f0ff">{meta["name"]}</div>'
            f'<div style="font-size:11px;color:var(--dim);margin-top:3px">'
            f'{meta["sub_sector"]}  ·  NSE:{meta["ticker"].replace(".NS","")}  ·  '
            f'LQ:{lq}  PQ:{pq}  PYQ:{pyq}</div>'
        )
        render_ic_memo(briefing)

        rt = briefing.get("annual_revenue_trend", [])
        pt = briefing.get("annual_pat_trend",     [])
        if rt and pt:
            st.markdown("**Annual Trend (₹ Cr)**")
            st.dataframe(pd.DataFrame([
                {"Year": r["year"], "Revenue": r.get("value"), "PAT": p.get("value")}
                for r, p in zip(rt, pt)
            ]), use_container_width=True, hide_index=True)

    with tf:
        tickers_all = tuple(c["ticker"] for c in all_companies)
        all_raw_p   = load_all_companies(tickers_all)
        all_m_p     = [df_mod.extract_key_metrics(all_raw_p[c["ticker"]], c)
                       for c in all_companies if all_raw_p.get(c["ticker"])]
        briefings_p = {c["ticker"]: es.build_earnings_briefing(all_raw_p[c["ticker"]], c)
                       for c in all_companies if all_raw_p.get(c["ticker"])}
        # Company-specific quick questions override
        co_qs = [
            f"Investment case for {meta['short']}",
            f"{meta['short']} vs sector on margins",
            f"Key risks for {meta['short']}",
            f"Valuation — is {meta['short']} cheap or expensive?",
        ]
        sec_header("DefStrat AI Analyst")
        st.html(
            f'<div style="font-size:12px;color:var(--dim);margin-bottom:16px">'
            f'Ask anything about {meta["name"]} or compare it to sector peers.</div>'
        )

        provider = st.session_state.ds_provider
        ready = (provider == "ollama") or bool(st.session_state.ds_groq_key)
        if not ready:
            st.html(
                '<div style="background:rgba(255,171,64,0.06);border:1px solid rgba(255,171,64,0.3);'
                'border-left:3px solid var(--amber);border-radius:6px;padding:12px 16px;'
                'color:var(--amber);font-size:13px">'
                '⚡ Set a free Groq key in the sidebar to use AI features.</div>'
            )

        qcols = st.columns(4)
        for i, (qc, qq) in enumerate(zip(qcols, co_qs)):
            if qc.button(qq, key=f"co_qq_{i}", use_container_width=True, type="secondary"):
                st.session_state["co_prefill"] = qq

        prefill = st.session_state.pop("co_prefill", "")
        co_q = st.text_area("", value=prefill, height=80, key="co_q_input",
                            label_visibility="collapsed",
                            placeholder=f"e.g. How does {meta['short']} compare to peers on ROCE and FCF?")

        c1, c2 = st.columns([4, 1])
        with c1:
            co_ask = st.button("🚀  Ask DefStrat AI", type="primary",
                               use_container_width=True, key="co_ask_btn")
        with c2:
            if st.button("Clear", key="co_clr_btn", use_container_width=True):
                st.session_state.co_ai_response = ""
                st.rerun()

        if co_ask and co_q and ready:
            with st.spinner("Analysing…"):
                st.session_state.co_ai_response = llm.query(
                    question    = co_q,
                    all_metrics = all_m_p,
                    briefings   = briefings_p,
                    provider    = provider,
                    api_key     = st.session_state.ds_groq_key,
                    model       = st.session_state.ds_groq_model if provider=="groq" else st.session_state.ds_ollama_model,
                    ollama_url  = st.session_state.ds_ollama_url,
                )

        if st.session_state.co_ai_response:
            st.html(
                '<div class="ai-box"><div class="ai-box-label">🎯 DEFSTRAT AI RESPONSE</div>'
                f'<div class="ai-box-body">{st.session_state.co_ai_response}</div></div>'
            )

    # ── Downloads ──
    sec_header("Downloads")
    d1, d2 = st.columns(2)
    with d1:
        with st.spinner("Building report…"):
            cmap = {
                "revenue_pat_bar":    cg.revenue_pat_bar(trend_df, meta["name"]),
                "quarterly_trend":    cg.quarterly_trend_line(quarterly_df, meta["name"]),
                "margin_waterfall":   cg.margin_waterfall(metrics),
                "shareholding_donut": cg.shareholding_donut(metrics),
            }
            _rp    = load_all_companies(tuple(c["ticker"] for c in all_companies))
            _mp    = [df_mod.extract_key_metrics(_rp[c["ticker"]], c)
                      for c in all_companies if _rp.get(c["ticker"])]
            doc_b  = dx.build_company_docx(
                metrics, cmap, trend_df, quarterly_df,
                raw.get("financials", pd.DataFrame()),
                briefing=briefing, all_metrics=_mp, raw_data=raw,
            )
        st.download_button(f"📄  {meta['short']} Report (.docx)", data=doc_b,
            file_name=f"defstrat_{meta['short'].lower()}_{datetime.now():%Y%m%d}.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            use_container_width=True)
    with d2:
        with st.spinner("Building workbook…"):
            xl_b = ex.build_company_excel(metrics, raw, trend_df, quarterly_df)
        st.download_button(f"📊  {meta['short']} Financials (.xlsx)", data=xl_b,
            file_name=f"defstrat_{meta['short'].lower()}_{datetime.now():%Y%m%d}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True)

    st.html(
        f'<div class="footer">'
        f'DEFSTRAT  ·  INDIA DEFENCE INTELLIGENCE  ·  '
        f'© {datetime.now().year} NISHANT PRABHAKAR  ·  '
        f'DATA VIA YAHOO FINANCE — FOR INFORMATIONAL USE ONLY'
        f'</div>'
    )
