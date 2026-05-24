"""
DefStrat AI — Multi-provider LLM analyst for the India defence sector.

Supported providers (all free):
  groq    — cloud, free signup at console.groq.com (no credit card)
  ollama  — local, no key needed (install from ollama.com)

Uses only `requests` — no extra packages required for Groq.
"""

import os
import requests

_SYSTEM = (
    "You are DefStrat AI, a senior PE/hedge-fund analyst specialising in the Indian listed "
    "defence sector. You have access to live financial and earnings data for all tracked companies. "
    "Answer questions concisely and with precision, as if writing for a global fund IC memo. "
    "Use ₹ Crores for Indian currency values. Reference specific data points. "
    "When comparing companies, use structured bullet points. "
    "Frame any stock-related commentary as analytical observations — not personal investment advice."
)

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]

DEFAULT_GROQ_MODEL  = "llama-3.3-70b-versatile"
DEFAULT_OLLAMA_MODEL = "llama3.2"
DEFAULT_OLLAMA_URL   = "http://localhost:11434"


def _safe(v, fmt=None):
    if v is None:
        return "N/A"
    if fmt == "cr":
        return f"₹{v:,.0f} Cr"
    if fmt == "pct":
        return f"{v:+.1f}%"
    if fmt == "x":
        return f"{v:.1f}x"
    return str(v)


def build_context(all_metrics: list, briefings: dict = None) -> str:
    lines = [
        "=== DEFSTRAT — INDIA LISTED DEFENCE SECTOR DATA ===",
        f"Companies tracked: {len(all_metrics)}",
    ]
    valid_mc = [m["market_cap_cr"] for m in all_metrics if m.get("market_cap_cr")]
    if valid_mc:
        lines.append(f"Combined market cap: ₹{sum(valid_mc):,.0f} Cr")

    lines.append("\n--- COMPANY SNAPSHOT ---")
    lines.append(
        f"{'Company':<22} {'MktCap':>10} {'Rev':>10} {'PAT':>9} "
        f"{'PAT%':>6} {'P/E':>7} {'ROE%':>7} {'1YRet':>7}"
    )
    for m in sorted(all_metrics, key=lambda x: x.get("market_cap_cr") or 0, reverse=True):
        lines.append(
            f"{m.get('short',''):<22} "
            f"{_safe(m.get('market_cap_cr'),'cr'):>10} "
            f"{_safe(m.get('revenue_cr'),'cr'):>10} "
            f"{_safe(m.get('pat_cr'),'cr'):>9} "
            f"{_safe(m.get('pat_margin'),'pct'):>6} "
            f"{_safe(m.get('pe_ratio'),'x'):>7} "
            f"{_safe(m.get('roe'),'pct'):>7} "
            f"{_safe(m.get('price_return_1y'),'pct'):>7}"
        )

    lines.append("\n--- VALUATION & GROWTH ---")
    for m in all_metrics:
        parts = [f"{m.get('short','')}:"]
        for k, l, f in [("pb_ratio","P/B","x"), ("ev_ebitda","EV/EBITDA","x"),
                        ("ebitda_margin","EBITDA%","pct"), ("debt_to_equity","D/E","x"),
                        ("revenue_growth_yoy","RevGrYoY","pct")]:
            if m.get(k):
                parts.append(f"{l} {_safe(m[k],f)}")
        lines.append("  " + "  |  ".join(parts))

    if briefings:
        lines.append("\n--- LATEST QUARTER EARNINGS ---")
        for ticker, b in briefings.items():
            if not b:
                continue
            lines.append(f"\n{b.get('company', ticker)}  [{b.get('latest_quarter','N/A')}]")
            lines.append(
                f"  Rev: {b.get('revenue_lq','N/A')}  QoQ:{b.get('revenue_qoq','N/A')}  "
                f"YoY:{b.get('revenue_yoy','N/A')}"
            )
            lines.append(
                f"  PAT: {b.get('pat_lq','N/A')}  YoY:{b.get('pat_yoy','N/A')}  "
                f"EBITDA%:{b.get('ebitda_margin_lq','N/A')}  PAT%:{b.get('pat_margin_lq','N/A')}"
            )
            lines.append(
                f"  Analyst: {b.get('analyst_rating','N/A')}  "
                f"Target:₹{b.get('analyst_target','N/A')}  "
                f"{b.get('recommendations_summary','')}"
            )
            if b.get("ic_verdict"):
                lines.append(f"  Verdict: {b['ic_verdict']}")
            for h in b.get("key_highlights", [])[:2]:
                lines.append(f"  • {h}")

    lines.append("\n=== END ===")
    return "\n".join(lines)


def _query_groq(question: str, context: str, api_key: str, model: str) -> str:
    if not api_key:
        return (
            "⚠️ Groq API key needed.\n\n"
            "1. Go to **console.groq.com** and create a free account (no credit card required).\n"
            "2. Click **API Keys → Create API Key**.\n"
            "3. Paste the key in the sidebar under **DefStrat AI Settings**."
        )
    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": f"Current data:\n\n{context}\n\n---\n\nQuestion: {question}"},
                ],
                "max_tokens": 1500,
                "temperature": 0.1,
            },
            timeout=30,
        )
        data = resp.json()
        if "choices" in data:
            return data["choices"][0]["message"]["content"]
        err = data.get("error", {})
        return f"⚠️ Groq error: {err.get('message', str(data))}"
    except requests.exceptions.ConnectionError:
        return "⚠️ Could not reach Groq API. Check your internet connection."
    except Exception as exc:
        return f"⚠️ Error: {exc}"


def _query_ollama(question: str, context: str, model: str, base_url: str) -> str:
    try:
        resp = requests.post(
            f"{base_url.rstrip('/')}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": f"Current data:\n\n{context}\n\n---\n\nQuestion: {question}"},
                ],
                "stream": False,
            },
            timeout=120,
        )
        data = resp.json()
        return data.get("message", {}).get("content", f"⚠️ Unexpected response: {data}")
    except requests.exceptions.ConnectionError:
        return (
            f"⚠️ Cannot connect to Ollama at {base_url}.\n\n"
            "Make sure Ollama is running (`ollama serve`) and you have pulled a model "
            f"(`ollama pull {model}`)."
        )
    except Exception as exc:
        return f"⚠️ Ollama error: {exc}"


def query(
    question: str,
    all_metrics: list,
    briefings: dict = None,
    provider: str = "groq",
    api_key: str = "",
    model: str = "",
    ollama_url: str = DEFAULT_OLLAMA_URL,
) -> str:
    context = build_context(all_metrics, briefings)

    if provider == "groq":
        return _query_groq(question, context, api_key, model or DEFAULT_GROQ_MODEL)
    elif provider == "ollama":
        return _query_ollama(question, context, model or DEFAULT_OLLAMA_MODEL, ollama_url)
    else:
        return "⚠️ Unknown provider."
