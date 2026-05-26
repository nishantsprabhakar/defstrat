const defaults = ["zentec", "ideaforge", "mtar", "datapatterns", "azad", "aequs", "paras", "astra"];
const storeKey = "defence-dashboard-watchlist-v1";

const els = {
  refreshBtn: document.querySelector("#refreshBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  companySearch: document.querySelector("#companySearch"),
  addManualBtn: document.querySelector("#addManualBtn"),
  searchResults: document.querySelector("#searchResults"),
  marketStatus: document.querySelector("#marketStatus"),
  refreshStamp: document.querySelector("#refreshStamp"),
  companyCount: document.querySelector("#companyCount"),
  avgMove: document.querySelector("#avgMove"),
  filingCount: document.querySelector("#filingCount"),
  watchlist: document.querySelector("#watchlist"),
  cards: document.querySelector("#cards"),
  selectedName: document.querySelector("#selectedName"),
  selectedCodes: document.querySelector("#selectedCodes"),
  selectedPrice: document.querySelector("#selectedPrice"),
  selectedMove: document.querySelector("#selectedMove"),
  chart: document.querySelector("#priceChart"),
  fundamentals: document.querySelector("#fundamentals"),
  insightList: document.querySelector("#insightList"),
  topWatchlist: document.querySelector("#topWatchlist"),
  topSelectedName: document.querySelector("#topSelectedName")
};

els.tabs = document.querySelectorAll("[data-tab]");
els.panels = document.querySelectorAll("[data-panel]");
els.historicalPanel = document.querySelector("#historicalPanel");
els.companyInfoPanel = document.querySelector("#companyInfoPanel");
els.businessPanel = document.querySelector("#businessPanel");
els.earningsPanel = document.querySelector("#earningsPanel");
els.callSummaryPanel = document.querySelector("#callSummaryPanel");
els.comparisonPanel = document.querySelector("#comparisonPanel");
els.aiPanel = document.querySelector("#aiPanel");
els.managePanel = document.querySelector("#managePanel");
els.sectorCharts = document.querySelector("#sectorCharts");
els.combinedMarketCap = document.querySelector("#combinedMarketCap");
els.snapshotCompanies = document.querySelector("#snapshotCompanies");
els.sectorPe = document.querySelector("#sectorPe");
els.bestReturn = document.querySelector("#bestReturn");
els.sectorRoe = document.querySelector("#sectorRoe");
els.chartTooltip = document.querySelector("#chartTooltip");

let catalog = [];
let watchIds = JSON.parse(localStorage.getItem(storeKey) || "null") || defaults;
let custom = JSON.parse(localStorage.getItem(`${storeKey}-custom`) || "[]");
const migratedToDefstratEight = localStorage.getItem(`${storeKey}-defstrat-eight`) === "true";
if (!migratedToDefstratEight) {
  watchIds = Array.from(new Set([...watchIds, ...defaults]));
  localStorage.setItem(`${storeKey}-defstrat-eight`, "true");
}
let dashboard = [];
let selectedId = watchIds[0];
let searchTimer;
let activeTab = "charts";
let activeSectorMetric = "revenue";

const extraData = {
  zentec: { label: "Zen", focus: "Training simulators, anti-drone systems", revenue: 430, pat: 129, patMargin: 30.0, ebitdaMargin: 34, roe: 28, roa: 18, roce: 32, debtEquity: 0.03, pe: 72, pb: 18, marketCap: 14500, eps: 14.8, divYield: 0.05, debtorDays: 92, inventoryDays: 104, fcf: 65, period: "2026-03-31", verdict: "Positive", oneLine: "High-growth defence electronics and simulation play with order visibility tied to domestic procurement." },
  ideaforge: { label: "ideaForge", focus: "UAVs and drone platforms", revenue: 315, pat: 18, patMargin: 5.7, ebitdaMargin: 13, roe: 5, roa: 3, roce: 8, debtEquity: 0.02, pe: 115, pb: 6.5, marketCap: 2900, eps: 4.2, divYield: 0, debtorDays: 118, inventoryDays: 152, fcf: -22, period: "2026-03-31", verdict: "Watch", oneLine: "Drone specialist with strategic relevance across surveillance, mapping and tactical use cases." },
  mtar: { label: "MTAR", focus: "Precision Engineering", revenue: 865, pat: 94, patMargin: 10.9, ebitdaMargin: 22, roe: 14, roa: 8, roce: 18, debtEquity: 0.46, pe: 88, pb: 8.2, marketCap: 7800, eps: 31.1, divYield: 0, debtorDays: 76, inventoryDays: 178, fcf: 41, period: "2026-03-31", verdict: "Constructive", oneLine: "High-precision components for defence, space and nuclear programmes." },
  datapatterns: { label: "Data", focus: "Defence electronics and radar systems", revenue: 708, pat: 206, patMargin: 29.1, ebitdaMargin: 38, roe: 21, roa: 17, roce: 25, debtEquity: 0.01, pe: 70, pb: 12, marketCap: 14500, eps: 36, divYield: 0.2, debtorDays: 86, inventoryDays: 126, fcf: 78, period: "2026-03-31", verdict: "Positive", oneLine: "Electronics-led platform supplier with exposure to radar, EW and avionics programmes." },
  azad: { label: "Azad", focus: "Precision aerospace and turbine components", revenue: 568, pat: 122, patMargin: 21.5, ebitdaMargin: 33, roe: 16, roa: 8, roce: 19, debtEquity: 0.32, pe: 117, pb: 14, marketCap: 14496, eps: 19.18, divYield: 0, debtorDays: 72, inventoryDays: 210, fcf: 35, period: "2026-03-31", verdict: "Growth", oneLine: "Aerospace and turbine component platform with export-led precision manufacturing exposure." },
  aequs: { label: "Aequs", focus: "Aerospace precision components", revenue: 1010, pat: -74, patMargin: -7.3, ebitdaMargin: 12, roe: -8, roa: -4, roce: 5, debtEquity: 0.8, pe: null, pb: 5.4, marketCap: 8200, eps: -1.8, divYield: 0, debtorDays: 69, inventoryDays: 184, fcf: -95, period: "2025-12-31", verdict: "Scale-up", oneLine: "Aerospace manufacturing platform tied to precision machining and supply-chain localization." },
  paras: { label: "Paras", focus: "Optics, defence electronics and space engineering", revenue: 330, pat: 42, patMargin: 12.7, ebitdaMargin: 21, roe: 9, roa: 6, roce: 12, debtEquity: 0.08, pe: 96, pb: 8.5, marketCap: 5100, eps: 10.5, divYield: 0, debtorDays: 102, inventoryDays: 146, fcf: 12, period: "N/A", verdict: "Watch", oneLine: "Specialized defence and space engineering company with optics and electronics capabilities." },
  astra: { label: "Astra", focus: "RF, microwave and defence electronics", revenue: 1150, pat: 128, patMargin: 11.1, ebitdaMargin: 18, roe: 13, roa: 7, roce: 16, debtEquity: 0.18, pe: 61, pb: 7, marketCap: 8500, eps: 13.6, divYield: 0.25, debtorDays: 112, inventoryDays: 138, fcf: 28, period: "2025-12-31", verdict: "Steady", oneLine: "RF and microwave electronics supplier for defence, space and meteorology applications." }
};

const years = ["FY21", "FY22", "FY23", "FY24", "FY25", "FY26"];

const companyUpdates = {
  zentec: [
    { date: "2026-05-25", title: "Live market feed active", detail: "Yahoo chart feed is used for latest price, volume and 1Y return." },
    { date: "2026-03-31", title: "DefStrat watch item", detail: "Track anti-drone order execution, simulator exports and margin sustainability." }
  ],
  ideaforge: [
    { date: "2026-05-25", title: "Live market feed active", detail: "Watch drone demand recovery, government orders and working-capital discipline." }
  ],
  mtar: [
    { date: "2026-03-31", title: "FY26 earnings call", detail: "Management guided to approximately 80% revenue growth for FY27 and 24% EBITDA margin." },
    { date: "2026-09-30", title: "Facility milestone to monitor", detail: "Oil & Gas greenfield facility expected to commission by September 2026 per call commentary." }
  ],
  datapatterns: [
    { date: "2026-05-25", title: "DefStrat watch item", detail: "Track radar, EW and avionics program wins, order inflows and execution cycle." }
  ],
  azad: [
    { date: "2026-05-25", title: "DefStrat watch item", detail: "Track aerospace/turbine component ramp-up, exports and customer concentration." }
  ],
  aequs: [
    { date: "2025-12-31", title: "Latest period tracked", detail: "DefStrat model period set to December 2025 pending further public filings." }
  ],
  paras: [
    { date: "2026-05-25", title: "DefStrat watch item", detail: "Monitor optics, space electronics, order conversion and margin recovery." }
  ],
  astra: [
    { date: "2025-12-31", title: "Latest period tracked", detail: "Track RF/microwave order book, defence electronics execution and margin progression." }
  ]
};

const businessProfiles = {
  zentec: {
    model: "R&D-led defence technology company selling simulators, anti-drone systems and training solutions to defence and security customers.",
    description: "Zen Technologies builds training simulators, counter-drone solutions and combat training systems. The business is driven by indigenous product IP, defence procurement cycles and order-book conversion rather than commodity manufacturing volume.",
    products: [
      { name: "Anti-drone systems", icon: "target", detail: "Detection, jamming and hard-kill counter-UAS solutions." },
      { name: "Training simulators", icon: "radar", detail: "Live-fire, driving, gunnery and mission training platforms." },
      { name: "Autonomous systems", icon: "drone", detail: "Interceptor drones, UGVs and battlefield training products." }
    ],
    shareholding: [["Promoter group", 55], ["Institutional", 18], ["Public / others", 27]]
  },
  ideaforge: {
    model: "Drone OEM focused on UAV platforms, payload integration and software-led field deployment for defence, homeland security and enterprise use cases.",
    description: "ideaForge designs and manufactures UAVs used for surveillance, mapping, security and tactical intelligence. Revenue is order-led and can be volatile, but operating leverage is high when procurement converts into deliveries.",
    products: [
      { name: "Tactical UAVs", icon: "drone", detail: "Field-deployable drones for surveillance and reconnaissance." },
      { name: "Mapping platforms", icon: "grid", detail: "Enterprise-grade survey and geospatial data capture." },
      { name: "Payload systems", icon: "camera", detail: "EO/IR sensors, control stations and mission software." }
    ],
    shareholding: [["Promoter group", 31], ["Institutional", 25], ["Public / others", 44]]
  },
  mtar: {
    model: "Precision engineering platform serving clean energy, civil nuclear, aerospace and defence programmes with high-value components and assemblies.",
    description: "MTAR manufactures complex precision systems and assemblies. The business is shifting from component supply toward integrated systems, with clean energy and civil nuclear providing scale and aerospace/defence adding strategic optionality.",
    products: [
      { name: "Precision assemblies", icon: "gear", detail: "High-tolerance build-to-print and integrated assemblies." },
      { name: "Clean energy systems", icon: "energy", detail: "Components and assemblies for fuel-cell and clean-energy customers." },
      { name: "Aerospace components", icon: "aircraft", detail: "Aerospace and defence machining, systems and sub-assemblies." }
    ],
    shareholding: [["Promoter group", 36], ["Institutional", 30], ["Public / others", 34]]
  },
  datapatterns: {
    model: "Defence electronics specialist with design-led exposure to radar, electronic warfare, avionics and high-reliability systems.",
    description: "Data Patterns is a vertically integrated defence electronics company. Its margin profile benefits from design capability, programme complexity and high-value electronics rather than pure manufacturing throughput.",
    products: [
      { name: "Radar electronics", icon: "radar", detail: "Radar processing, control and high-reliability electronics." },
      { name: "EW systems", icon: "signal", detail: "Electronic warfare and communication intelligence subsystems." },
      { name: "Avionics", icon: "aircraft", detail: "Aerospace-grade electronics for defence and space platforms." }
    ],
    shareholding: [["Promoter group", 42], ["Institutional", 29], ["Public / others", 29]]
  },
  azad: {
    model: "Precision manufacturing platform for aerospace, defence, energy and turbine components with long-cycle global OEM relationships.",
    description: "Azad manufactures complex turbine and aerospace components for global customers. Its investment case depends on facility ramp-up, qualification cycles and converting long-duration customer programmes into profitable scale.",
    products: [
      { name: "Turbine components", icon: "turbine", detail: "Hot-section and rotating components for energy and aerospace." },
      { name: "Aerospace machining", icon: "aircraft", detail: "Precision parts for global OEM programmes." },
      { name: "Dedicated facilities", icon: "factory", detail: "Customer-specific capacity and process infrastructure." }
    ],
    shareholding: [["Promoter group", 65], ["Institutional", 18], ["Public / others", 17]]
  },
  aequs: {
    model: "Integrated aerospace manufacturing ecosystem spanning forging, machining, surface treatment, assembly and precision components.",
    description: "Aequs operates an aerospace-focused manufacturing ecosystem with growing scale and operating leverage. The company is still moving toward full profitability, so utilisation and segment mix matter heavily.",
    products: [
      { name: "Aerospace structures", icon: "aircraft", detail: "Machined and assembled components for aerospace platforms." },
      { name: "Special processing", icon: "factory", detail: "Forging, treatment and precision manufacturing ecosystem." },
      { name: "Consumer precision", icon: "grid", detail: "Scaled contract manufacturing beyond aerospace." }
    ],
    shareholding: [["Promoter group", 61], ["Institutional", 16], ["Public / others", 23]]
  },
  paras: {
    model: "Defence and space engineering company focused on optics, optronics, EMP solutions and specialised electronics.",
    description: "Paras Defence participates in defence optics, space engineering and electronics. The business benefits from indigenisation but remains milestone-led, with order mix and execution timing shaping quarterly performance.",
    products: [
      { name: "Defence optics", icon: "lens", detail: "Optical and optronic systems for defence applications." },
      { name: "Space engineering", icon: "satellite", detail: "Specialised components and systems for space programmes." },
      { name: "EMP protection", icon: "shield", detail: "Electromagnetic pulse protection and defence electronics." }
    ],
    shareholding: [["Promoter group", 58], ["Institutional", 14], ["Public / others", 28]]
  },
  astra: {
    model: "RF and microwave electronics supplier serving defence, space, meteorology and communications programmes.",
    description: "Astra Microwave designs and manufactures RF, microwave and defence electronics. The business is order-book driven, with growth tied to defence and space programme execution.",
    products: [
      { name: "RF modules", icon: "signal", detail: "High-frequency modules and microwave subsystems." },
      { name: "Defence electronics", icon: "radar", detail: "Electronics for radar, missile, telemetry and EW platforms." },
      { name: "Space systems", icon: "satellite", detail: "Microwave and payload electronics for space applications." }
    ],
    shareholding: [["Promoter group", 6], ["Institutional", 42], ["Public / others", 52]]
  }
};

const callSummaries = {
  zentec: {
    title: "Zen Technologies earnings call summary",
    callDate: "4 May 2026",
    period: "Q4 FY26 and FY26",
    source: "Zen investor page / Q4 FY26 transcript filing",
    sections: [
      { heading: "Financial Performance", text: "Q4 FY26 revenue was Rs 178.08crs and PAT was Rs 31.53crs. FY26 revenue was Rs 687.69crs, lower than FY25 because order execution was pushed out, but profitability remained unusually strong with FY26 EBITDA margin at 48.37%. The key read-through is that the quarter was not a demand-collapse story; it was an execution-timing story with high margins intact." },
      { heading: "Order Book and Pipeline", text: "The consolidated order book was Rs 1,336.04crs as of 31 March 2026. Q4 order inflow was Rs 431.36crs, while Q4 execution was Rs 178.08crs. Domestic orders were the dominant part of the backlog, with export orders still smaller but strategically important. The management commentary points to materially higher conversion from FY27, especially as larger anti-drone and simulator programmes move into execution." },
      { heading: "Segment Performance and Strategic Direction", text: "The call focused on anti-drone systems, simulators, hard-kill options, interceptor drones, unmanned ground vehicles and smart ammunition. Zen continues to position itself as an indigenous defence technology platform rather than a low-margin build-to-print supplier. The operating model remains R&D-led, and the strategic bet is that drone warfare and training simulation become recurring procurement categories." },
      { heading: "FY27 Guidance", text: "Management did not provide a single conservative revenue number in the summary sources, but commentary points to a step-up in execution from the existing backlog. The practical investor framework is to track how much of the Rs 1,336crs order book converts during FY27 and whether EBITDA margin normalises toward the mid-30s as scale rises." },
      { heading: "Key Positives from the Call", text: "Large order book, high EBITDA margin, meaningful Q4 order inflow, strong balance-sheet positioning and product breadth across anti-drone and simulator categories. The backlog is already large relative to FY26 revenue, giving a clearer base for FY27 monitoring." },
      { heading: "Key Concerns and Watch Points", text: "Revenue can be lumpy because defence orders are milestone-driven. Working capital days were elevated around 196 days as of 31 March 2026. Investors should track receivables, order-to-revenue conversion, export traction and whether margins remain strong after execution accelerates." }
    ],
    q4: [
      ["Revenue", "Rs 178.08crs", "Not disclosed in current source", "Q4 FY26 reported"],
      ["PAT", "Rs 31.53crs", "Not disclosed in current source", "Q4 FY26 reported"],
      ["Order inflow", "Rs 431.36crs", "N/A", "Q4 FY26"]
    ],
    fy: [
      ["Revenue", "Rs 687.69crs", "Not disclosed in current source", "FY26"],
      ["EBITDA margin", "48.37%", "Not disclosed in current source", "FY26"],
      ["Order book", "Rs 1,336.04crs", "N/A", "As of 31 Mar 2026"]
    ]
  },
  ideaforge: {
    title: "ideaForge Technology earnings call summary",
    callDate: "May 2026",
    period: "Q4 FY26 and FY26",
    source: "Q4 FY26 transcript filing / investor materials",
    sections: [
      { heading: "Financial Performance", text: "ideaForge delivered a sharp Q4 FY26 recovery, with revenue of approximately Rs 141crs versus Rs 20.3crs in Q4 FY25. PAT was approximately Rs 60crs, implying a very high quarterly PAT margin of about 42.5%, helped by strong order conversion and operating leverage. FY26 EBITDA was approximately Rs 27crs, marking a return to positive operating profitability after a difficult demand cycle." },
      { heading: "Order Book and Pipeline", text: "The company entered FY27 with an opening order book of approximately Rs 310crs, expected to execute over roughly three quarters. Q4 was important because it demonstrated that order-book conversion can quickly change the P&L profile. The key pipeline question is whether fresh government and enterprise drone orders replenish the book fast enough after the current execution cycle." },
      { heading: "Segment Performance and Strategic Direction", text: "The business remains centred on UAV platforms, drone systems and related solutions. Management commentary highlighted order conversion and the US opportunity. Strategically, ideaForge needs to prove that drone procurement can become more repeatable across defence, homeland security, mapping, surveillance and enterprise applications rather than remaining a lumpy tender-led business." },
      { heading: "FY27 Guidance", text: "Specific FY27 revenue guidance was not disclosed in the source snippets. The visible base is the Rs 310crs opening order book, which should support near-term revenue if execution remains on schedule. Investors should compare quarterly revenue against order inflow to judge whether FY27 is a sustained recovery or a one-quarter catch-up." },
      { heading: "Key Positives from the Call", text: "Record quarterly revenue, strong swing back to profitability, debt-free status as of 31 March 2026 and a visible opening FY27 order book. The Q4 performance shows the operating leverage available when revenue scales." },
      { heading: "Key Concerns and Watch Points", text: "The Q4 margin profile may not be repeatable every quarter. Drone procurement remains tender-led and can be volatile. Watch order inflow, order execution cadence, gross margin, working capital, export traction and whether revenue concentration reduces over time." }
    ],
    q4: [
      ["Revenue", "Rs 141crs", "Rs 20.3crs", "Strong YoY growth"],
      ["PAT", "Rs 60crs", "Not disclosed in current source", "42.5% PAT margin"],
      ["Order book", "Rs 310crs opening FY27", "N/A", "Execution expected within ~3 quarters"]
    ],
    fy: [
      ["EBITDA", "Rs 27crs", "Not disclosed in current source", "FY26"],
      ["Borrowing", "Nil", "N/A", "Debt-free as of 31 Mar 2026"],
      ["Revenue", "Not disclosed in current source", "Not disclosed in current source", "FY26"]
    ]
  },
  mtar: {
    title: "MTAR Technologies earnings call summary",
    callDate: "31 March 2026",
    period: "Q4 FY26 and FY26",
    source: "Attached MTAR earnings call.docx",
    sections: [
      {
        heading: "Financial Performance",
        text: "FY26 was a year of strong operational recovery. Q4 FY26 revenue was Rs 306crs, up 67.2% YoY from Rs 183crs in Q4 FY25 and 10.1% ahead of Q3 FY26. FY26 revenue from operations reached Rs 876crs, up 29.6% from Rs 676crs in FY25. Q4 FY26 EBITDA was Rs 62crs, up 80.9% YoY, with EBITDA margin at 20.2%. FY26 EBITDA grew 41.7% to Rs 171crs. Q4 PAT rose 222% YoY to Rs 44crs, and FY26 PAT rose 76.2% to Rs 94crs."
      },
      {
        heading: "Order Book and Pipeline",
        text: "Order inflows were Rs 2,453crs during FY26, resulting in a closing order book of Rs 2,582crs as of 31 March 2026, nearly 3x FY26 revenue. Clean Energy accounted for 51.2% of the order book, Civil Nuclear 26.3%, Aerospace and Defence 14.0%, and Products/Others 8.5%."
      },
      {
        heading: "Segment Performance and Strategic Direction",
        text: "Clean Energy contributed Rs 615crs to FY26 revenue and remained the dominant driver. Aerospace and Defence revenue grew to Rs 104crs. Management highlighted a shift from component-level supply to integrated systems delivery, which should raise revenue per program and support structurally better margins."
      },
      {
        heading: "FY27 Guidance",
        text: "Management raised FY27 revenue growth guidance to approximately 80% plus or minus 5%, implying around Rs 1,577crs at the midpoint. EBITDA margin guidance is approximately 24% for FY27. Clean Energy order inflows are expected at approximately Rs 4,000crs in FY27."
      },
      {
        heading: "Key Positives from the Call",
        text: "Record order book, aggressive FY27 revenue guidance, clean energy diversification, new customer additions across SLB, GKN Aerospace, Thales and Thales Alenia Space, and proposed subsidiary amalgamation."
      },
      {
        heading: "Key Concerns and Watch Points",
        text: "FY27 margin guidance requires strong execution versus Q4 FY26 EBITDA margin of 20.2%. Greenfield facility timing may create quarterly lumpiness. Clean Energy concentration remains a key risk if large customers slow procurement."
      }
    ],
    q4: [
      ["Revenue", "Rs 306crs (USD 37mn)", "Rs 183crs (USD 22mn)", "+67.2% YoY"],
      ["EBITDA", "Rs 62crs (USD 7mn)", "Rs 34crs (USD 4mn)", "+80.9% YoY"],
      ["PAT", "Rs 44crs (USD 5mn)", "Rs 14crs (USD 2mn)", "+222% YoY"]
    ],
    fy: [
      ["Revenue", "Rs 876crs (USD 105mn)", "Rs 676crs (USD 81mn)", "+29.6% YoY"],
      ["EBITDA", "Rs 171crs (USD 20mn)", "Rs 121crs (USD 14mn)", "+41.7% YoY"],
      ["PAT", "Rs 94crs (USD 11mn)", "Rs 53crs (USD 6mn)", "+76.2% YoY"]
    ]
  },
  datapatterns: {
    title: "Data Patterns earnings call summary",
    callDate: "Q4 FY2025-26",
    period: "Q4 FY26 and FY26",
    source: "Company-hosted Q4 FY26 earnings call transcript PDF",
    sections: [
      { heading: "Financial Performance", text: "Data Patterns reported Q4 FY26 revenue of approximately Rs 345crs. Gross margin improved sharply to around 73% versus 49% in Q4 FY25, and Q4 PAT was approximately Rs 139crs, implying a PAT margin near 40%. For FY26, revenue was approximately Rs 925crs, EBITDA Rs 371crs and PAT Rs 271crs, showing strong scale with high profitability." },
      { heading: "Order Book and Pipeline", text: "The call discussion referenced order-book composition and services share, with management fielding questions around margins from the current backlog. The business is programme-led across defence electronics, radar, EW, avionics and related systems, so quarterly revenue can move meaningfully depending on delivery milestones and acceptance timelines." },
      { heading: "Segment Performance and Strategic Direction", text: "The transcript highlights the strength of electronics-led defence systems where design ownership and programme complexity support better margins. The strategic direction is to sustain high-value defence electronics exposure while scaling revenue without diluting gross margin quality. Q4's margin uplift suggests favourable mix and operating leverage." },
      { heading: "FY27 Guidance", text: "Specific FY27 revenue guidance was not captured in the current source snippets. The practical monitoring framework is order inflow, backlog conversion, gross margin sustainability and whether high-margin deliveries repeat beyond Q4." },
      { heading: "Key Positives from the Call", text: "High Q4 gross margin, strong PAT margin, Rs 925crs FY26 revenue scale, Rs 371crs EBITDA, Rs 271crs PAT and exposure to high-value defence electronics. The company continues to screen as a quality compounder within listed defence electronics." },
      { heading: "Key Concerns and Watch Points", text: "The 73% Q4 gross margin is excellent but may be mix-driven. Investors should watch order inflow, services/product mix, execution of large programmes, receivable cycle and whether FY27 growth comes with similar profitability." }
    ],
    q4: [
      ["Revenue", "Rs 345crs", "Not disclosed in current source", "Q4 FY26"],
      ["Gross margin", "73%", "49%", "Improved significantly YoY"],
      ["PAT", "Rs 139crs", "Not disclosed in current source", "40% PAT margin"]
    ],
    fy: [
      ["Revenue", "Rs 925crs", "Not disclosed in current source", "+31% YoY"],
      ["EBITDA", "Rs 371crs", "Not disclosed in current source", "FY26"],
      ["PAT", "Rs 271crs", "Not disclosed in current source", "FY26"]
    ]
  },
  azad: {
    title: "Azad Engineering earnings call summary",
    callDate: "16 May 2026",
    period: "Q4 FY26 and FY26",
    source: "Azad IR transcript page / Q4 FY26 call transcript",
    sections: [
      { heading: "Financial Performance", text: "Azad delivered a strong Q4 FY26, with revenue of approximately Rs 157crs, up 26.4% YoY. EBITDA margin was approximately 36.7% and PAT margin was approximately 22.3%. FY26 revenue reached approximately Rs 590crs versus Rs 453crs in FY25, with EBITDA margin at 36.9% and PAT margin at 22.4%, reflecting strong operating discipline during an investment phase." },
      { heading: "Order Book and Pipeline", text: "Management indicated a rolling order book of approximately Rs 6,500crs, with delivery schedules over roughly five to six years. This is the central investment argument: Azad has multi-year visibility from global OEM programmes, while execution capacity is still ramping. The company delivered around Rs 600crs in FY26 while keeping the rolling book at roughly the same level, implying continued replenishment." },
      { heading: "Segment Performance and Strategic Direction", text: "FY26 was described as a year of consolidation and infrastructure investment, with around 70% to 80% of build-out complete and four dedicated facilities operational. The Mitsubishi Heavy Industries eight-year single-source contract is strategically important because it validates capability in complex hot-section components and supports long-cycle customer stickiness." },
      { heading: "FY27 Guidance", text: "Management reiterated approximately 25% plus top-line growth, with potential upside as new plants stabilise. The second-half skew is important: investors should expect quarterly ramp-up to depend on capacity qualification, customer approvals and utilisation of the newly commissioned facilities." },
      { heading: "Key Positives from the Call", text: "Strong revenue growth, high EBITDA/PAT margins, long-duration order visibility, dedicated facilities, global OEM validation and a visible path to scale. The order book provides a stronger planning base than most precision manufacturing peers." },
      { heading: "Key Concerns and Watch Points", text: "Execution risk is tied to capacity ramp-up, customer qualification cycles and working capital. Customer concentration remains a watch point, and margins must be monitored as new facilities absorb fixed costs before reaching optimal utilisation." }
    ],
    q4: [
      ["Revenue", "Rs 157crs", "Not disclosed in current source", "+26.4% YoY"],
      ["EBITDA margin", "36.7%", "Not disclosed in current source", "Q4 FY26"],
      ["PAT margin", "22.3%", "Not disclosed in current source", "Q4 FY26"]
    ],
    fy: [
      ["Revenue", "Rs 590crs", "Rs 453crs", "FY26 vs FY25"],
      ["EBITDA margin", "36.9%", "Not disclosed in current source", "FY26"],
      ["PAT margin", "22.4%", "Not disclosed in current source", "FY26"]
    ]
  },
  aequs: {
    title: "Aequs earnings call summary",
    callDate: "29 January 2026",
    period: "Q3 FY26 and 9M FY26",
    quarterTitle: "Q3 FY26 Metrics",
    fullYearTitle: "9M FY26 Metrics",
    quarterHeaders: ["Metric", "Q3 FY26", "Q3 FY25", "Change"],
    fullYearHeaders: ["Metric", "9M FY26", "9M FY25", "Change"],
    source: "Company-hosted investor meet transcript dated 29 January 2026",
    sections: [
      { heading: "Financial Performance", text: "Aequs reported Q3 FY26 revenue from operations of Rs 3,262mn, up 51% YoY and described as the highest quarterly revenue for the company. Q3 EBITDA was Rs 381mn, up 353% YoY, with EBITDA margin at 12%. PAT remained negative at Rs 426mn, but adjusted PAT loss was lower at Rs 259mn after excluding labour-code and IPO-related one-offs." },
      { heading: "Order Book and Pipeline", text: "The transcript did not provide a conventional order-book figure. For Aequs, the relevant pipeline indicator is programme ramp-up across aerospace and consumer verticals, plus utilisation across the integrated manufacturing ecosystem. Revenue conversion depends on customer schedules, qualification cycles and capacity absorption rather than a disclosed fixed order book." },
      { heading: "Segment Performance and Strategic Direction", text: "Aerospace contributed Rs 2,685mn in Q3, around 82% of consolidated revenue, with aerospace revenue up 38% YoY and segment EBITDA up 163% YoY. The consumer vertical grew rapidly from a small base, but losses widened as the segment remains in scale-up. Management's strategic message is that the integrated ecosystem from forging and special processing to machining and assembly supports differentiation." },
      { heading: "FY27 Guidance", text: "Specific FY27 revenue guidance was not captured in the current source snippets. The key monitor is whether the 9M FY26 operating leverage continues into the next year: revenue including JVs grew 29%, EBITDA grew 75% and margin reached 15% on the 9M base." },
      { heading: "Key Positives from the Call", text: "Highest quarterly revenue, strong 51% YoY Q3 revenue growth, 353% YoY Q3 EBITDA growth, aerospace segment strength and improving 9M EBITDA margin. The aerospace ecosystem continues to show operating leverage as scale rises." },
      { heading: "Key Concerns and Watch Points", text: "PAT remains negative, even after adjusting for one-offs. Consumer vertical losses, utilisation, customer concentration, working capital and the pace of margin improvement are the main watch points." }
    ],
    q4: [
      ["Revenue", "Rs 3,262mn", "Not disclosed in current source", "+51% YoY"],
      ["EBITDA", "Rs 381mn", "Not disclosed in current source", "+353% YoY"],
      ["PAT", "Rs -426mn", "Not disclosed in current source", "Adjusted PAT loss Rs -259mn"]
    ],
    fy: [
      ["Revenue", "Rs 8,633mn", "Not disclosed in current source", "+28% YoY"],
      ["EBITDA", "Rs 1,222mn", "Rs 662mn", "+85% YoY"],
      ["PAT loss", "Rs -593mn", "Rs -1,115mn", "47% improvement YoY"]
    ]
  },
  paras: {
    title: "Paras Defence earnings call summary",
    callDate: "Q4 FY26 results period",
    period: "Q4 FY26",
    source: "Q4 FY26 results/news and investor presentation material",
    sections: [
      { heading: "Financial Performance", text: "Paras Defence reported Q4 FY26 revenue from operations of approximately Rs 171.31crs, up 58.3% YoY from Rs 108.23crs. Consolidated EBITDA was approximately Rs 42.6crs and PAT was approximately Rs 38.88crs. FY26 revenue was approximately Rs 478crs, up around 31% YoY, and FY26 net profit was approximately Rs 88crs, up around 40% YoY." },
      { heading: "Order Book and Pipeline", text: "Investor presentation/news sources indicate a consolidated order book close to Rs 986crs entering FY27. This is about two times FY26 revenue and gives visible execution cover, subject to delivery schedules. The key question is how quickly the company converts optics, defence engineering and space-related orders into revenue without diluting margins." },
      { heading: "Segment Performance and Strategic Direction", text: "The results reflect stronger execution in optics, defence electronics and space engineering. The strategic direction is aligned with defence indigenisation, anti-drone/optics opportunities and space-sector demand. Presentation material points to improving profitability, with FY26 EBITDA margin around 26% and PAT margin around 19%." },
      { heading: "FY27 Guidance", text: "Specific FY27 guidance was not captured in the source snippets. The investor framework should focus on order inflow, Rs 986crs order book conversion, margin sustainability and whether Q4's strong execution pace can continue." },
      { heading: "Key Positives from the Call", text: "Strong Q4 revenue growth, strong PAT growth, Rs 42.6crs Q4 EBITDA, FY26 revenue growth, order book visibility and exposure to optics/space/defence electronics. The Q4 print shows improved execution and operating leverage." },
      { heading: "Key Concerns and Watch Points", text: "Latest transcript link still needs direct confirmation, so the summary is based on results and presentation material. Quarterly revenue may remain lumpy, and investors should monitor order mix, receivables, execution timelines and whether FY26 margin levels sustain." }
    ],
    q4: [
      ["Revenue", "Rs 171.31crs", "Rs 108.23crs", "+58.3% YoY"],
      ["PAT", "Rs 38.88crs", "Not disclosed in current source", "+75% YoY"],
      ["EBITDA", "Not disclosed in current source", "Not disclosed in current source", "+51% YoY"]
    ],
    fy: [
      ["Revenue", "Approx. Rs 478crs", "Approx. Rs 365crs", "+31% YoY"],
      ["PAT", "Approx. Rs 88crs", "Approx. Rs 63crs", "+40% YoY"],
      ["Order book", "Approx. Rs 986crs", "N/A", "Entering FY27"]
    ]
  },
  astra: {
    title: "Astra Microwave earnings call summary",
    callDate: "13 February 2026",
    period: "Q3 FY26",
    quarterTitle: "Q3 FY26 Metrics",
    fullYearTitle: "FY26 / FY27 Outlook Metrics",
    quarterHeaders: ["Metric", "Q3 FY26", "Prior period", "Change / note"],
    fullYearHeaders: ["Metric", "Current outlook", "Prior period", "Change / note"],
    source: "Astra Microwave transcript listing / Q3 FY26 transcript highlights",
    sections: [
      { heading: "Financial Performance", text: "Astra Microwave's Q3 FY26 transcript highlights record performance with strong margins and a robust order book above Rs 2,200crs. Earlier FY26 commentary noted Q1 revenue of Rs 197crs, up 28.1% YoY, and H1 revenue up 7.2% YoY with H1 PAT up 13.5%. The result profile shows steady execution in a programme-led defence electronics business." },
      { heading: "Order Book and Pipeline", text: "Order book exceeded Rs 2,200crs in Q3 FY26. Management highlighted major wins in defence and space and expected order additions of approximately Rs 1,500crs plus for FY27. This order visibility is the core support for the company's medium-term growth ambition." },
      { heading: "Segment Performance and Strategic Direction", text: "The company remains focused on RF, microwave and defence electronics across defence, space and meteorology. Management expects to double turnover over three to four years, implying sustained order inflow and execution capacity. The long-term aspiration remains meaningfully larger than the current revenue base, but conversion will be milestone-led." },
      { heading: "FY27 Guidance", text: "Transcript highlights indicate around 15% revenue growth expected for FY27 and order-book additions of around Rs 1,500crs plus. Management also continues to refer to a multi-year 2x turnover ambition, which makes order inflow, margin consistency and working-capital discipline the key FY27 checks." },
      { heading: "Key Positives from the Call", text: "Record Q3 performance, strong margins, order book over Rs 2,200crs, major defence/space wins, Rs 1,500crs plus expected FY27 additions and a credible multi-year growth ambition." },
      { heading: "Key Concerns and Watch Points", text: "Execution of the large order book, quarterly mix, defence order timing, receivables and conversion of the longer-term growth aspiration into near-term revenue are the key watch points. The business is attractive but milestone timing can make quarterly numbers uneven." }
    ],
    q4: [
      ["Revenue", "Not applicable", "Not applicable", "Latest source is Q3 FY26"],
      ["Order book", "Over Rs 2,200crs", "N/A", "Q3 FY26"],
      ["Guidance", "15% FY27 revenue growth", "N/A", "Management outlook"]
    ],
    fy: [
      ["H1 revenue growth", "+7.2% YoY", "N/A", "Q2 FY26 commentary"],
      ["H1 PAT growth", "+13.5% YoY", "N/A", "Q2 FY26 commentary"],
      ["FY27 order additions", "Approx. Rs 1,500crs+", "N/A", "Management outlook"]
    ]
  }
};

const transcriptSources = {
  zentec: {
    status: "Transcript available",
    date: "Q4 FY2026 / exchange filing reported in May 2026",
    url: "https://www.zentechnologies.com/calls-and-conferences",
    note: "Zen's investor page carries earnings-call and conference-call transcripts, including FY26 call materials."
  },
  ideaforge: {
    status: "Transcript available",
    date: "Quarter and year ended 31 March 2026",
    url: "https://www.stockinsights.ai/in/IDEAFORGE/announcement/earnings-calls-20260511-516",
    note: "Q4 FY26 transcript filing reported with exchanges; summary notes highest quarterly revenue and positive EBITDA."
  },
  mtar: {
    status: "Transcript/audio available",
    date: "13 May 2026 call for Q4 FY26 and FY26",
    url: "https://trendlyne.com/latest-news/BSE-Announcements/436155/MTARTECH/mtar-technologies-ltd/",
    note: "Exchange announcements show Q4 FY26 earnings call material/audio; attached document summary is formatted in the tab below."
  },
  datapatterns: {
    status: "Transcript available",
    date: "Q4 FY2025-26",
    url: "https://www.datapatternsindia.com/investors/files/Earnings-Call-Transcript-Q4-2025-26.pdf",
    note: "Company-hosted Q4 FY26 earnings call transcript PDF."
  },
  azad: {
    status: "Transcript available",
    date: "16 May 2026 Q4 FY26 call",
    url: "https://azad.in/quarterly-financial-results/",
    note: "Azad IR page lists earning-call transcripts by quarter; Q4 FY26 call held on 16 May 2026."
  },
  aequs: {
    status: "Transcript available",
    date: "29 January 2026 investor meet / Q3 FY26",
    url: "https://www.aequs.com/wp-content/uploads/2026/02/Investor-Meet-transcript-29-January-2026.pdf",
    note: "Company-hosted transcript for Q3 and nine months ended 31 December 2025."
  },
  paras: {
    status: "Investor presentation available",
    date: "Q1 FY26 presentation",
    url: "https://parasdefence.com/uploads/presentation/1754971084_paras-defence-investor-presentation-2025.pdf",
    note: "I found investor presentation material; latest call transcript link still needs confirmation from company/BSE announcements."
  },
  astra: {
    status: "Transcript available",
    date: "Q3 FY26 call on 13 February 2026",
    url: "https://stockanalysis.com/quote/bom/532493/transcripts/",
    note: "Transcript listing shows Q3 FY26, Q2 FY26, Q1 FY26 and Q4 FY25 call transcripts."
  }
};

const formatInr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const formatNum = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function save() {
  localStorage.setItem(storeKey, JSON.stringify(watchIds));
  localStorage.setItem(`${storeKey}-custom`, JSON.stringify(custom));
}

function money(value) {
  return Number.isFinite(value) ? formatInr.format(value) : "--";
}

function compact(value) {
  if (!Number.isFinite(value)) return "--";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${formatNum.format(value / 1e12)}T`;
  if (abs >= 1e7) return `${formatNum.format(value / 1e7)}Cr`;
  if (abs >= 1e5) return `${formatNum.format(value / 1e5)}L`;
  return formatNum.format(value);
}

function cardSubMetric(q) {
  if (Number.isFinite(q.marketCap)) return `${compact(q.marketCap)} mcap`;
  if (Number.isFinite(q.volume)) return `${compact(q.volume)} volume`;
  return "Live quote";
}

function pct(value) {
  return Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${formatNum.format(value)}%` : "--";
}

function moveClass(value) {
  return Number(value) >= 0 ? "up" : "down";
}

function metaFor(id) {
  return catalog.find((item) => item.id === id) || custom.find((item) => item.id === id);
}

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function boot() {
  const { companies } = await getJson("/api/companies");
  catalog = companies;
  els.refreshBtn.addEventListener("click", refresh);
  els.resetBtn.addEventListener("click", () => {
    watchIds = [...defaults];
    custom = [];
    selectedId = watchIds[0];
    save();
    refresh();
  });
  els.addManualBtn.addEventListener("click", addManual);
  els.companySearch.addEventListener("input", search);
  els.tabs.forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  wireInteractiveCharts();
  await refresh();
  setInterval(refresh, 60_000);
}

async function refresh() {
  try {
    els.marketStatus.textContent = "Refreshing live feeds";
    renderWatchlist();
    const known = watchIds.filter((id) => catalog.some((c) => c.id === id));
    const customIds = watchIds.filter((id) => custom.some((c) => c.id === id));
    const { data } = await getJson(`/api/dashboard?ids=${encodeURIComponent(known.join(","))}`);
    const customData = await Promise.all(customIds.map((id) => {
      const item = custom.find((x) => x.id === id);
      return getJson(`/api/company?symbol=${encodeURIComponent(item.symbol)}&bse=${encodeURIComponent(item.bse || "")}&name=${encodeURIComponent(item.name)}`);
    }));
    dashboard = [...data, ...customData].filter(Boolean);
    if (!dashboard.some((item) => item.meta.id === selectedId)) selectedId = dashboard[0]?.meta.id;
    render();
    els.marketStatus.textContent = "Live feeds connected";
    els.refreshStamp.textContent = `Updated ${new Date().toLocaleString()}`;
  } catch (error) {
    els.marketStatus.textContent = "Some live feeds are unavailable";
    els.refreshStamp.textContent = "The dashboard will retry automatically";
    els.cards.innerHTML = `<div class="error">Live data request failed. ${escapeHtml(error.message)}</div>`;
  }
}

function render() {
  const moves = dashboard.map((d) => d.yahoo?.quote?.regularMarketChangePercent).filter(Number.isFinite);
  const avg = moves.length ? moves.reduce((a, b) => a + b, 0) / moves.length : NaN;
  renderWatchlist();
  renderTopWatchlist();
  renderCards();
  renderDetail();
  renderSectorSnapshot(avg);
  renderSectorCharts();
  renderDataTabs();
  els.companyCount.textContent = String(watchIds.length);
  els.avgMove.textContent = pct(avg);
  els.avgMove.className = moveClass(avg);
  els.filingCount.textContent = String(dashboard.reduce((total, d) => total + (d.bse?.length || 0), 0));
}

function seededSeries(item, key) {
  const extra = extraData[item.meta.id] || {};
  const latest = Number.isFinite(extra[key]) ? extra[key] : 0;
  const lastIndex = Math.max(years.length - 1, 1);
  if (key === "revenue") return years.map((_, i) => Math.max(0, latest * (0.38 + (i / lastIndex) * 0.62)));
  if (key === "pat") return years.map((_, i) => latest * (0.28 + (i / lastIndex) * 0.72));
  if (key === "fcf") return years.map((_, i) => latest * (0.2 + (i / lastIndex) * 0.8));
  if (key === "roce") return years.map((_, i) => Math.max(0, latest - (lastIndex - i) * 1.8));
  return years.map(() => latest);
}

function renderSectorSnapshot(avg) {
  const marketCaps = dashboard.map((item) => extraData[item.meta.id]?.marketCap || item.yahoo?.quote?.marketCap).filter(Number.isFinite);
  const peValues = dashboard.map((item) => extraData[item.meta.id]?.pe || item.yahoo?.quote?.trailingPE).filter(Number.isFinite);
  const roeValues = dashboard.map((item) => extraData[item.meta.id]?.roe).filter(Number.isFinite);
  const returns = dashboard.map((item) => ({ item, value: oneYearReturn(item) })).filter((row) => Number.isFinite(row.value)).sort((a, b) => b.value - a.value);
  els.combinedMarketCap.textContent = marketCaps.length ? `\u20b9${compact(marketCaps.reduce((a, b) => a + b, 0))} Cr` : "--";
  els.snapshotCompanies.textContent = String(dashboard.length);
  els.sectorPe.textContent = peValues.length ? formatNum.format(peValues.reduce((a, b) => a + b, 0) / peValues.length) : "N/A";
  els.bestReturn.textContent = returns[0] ? `${pct(returns[0].value)} ${extraData[returns[0].item.meta.id]?.label || returns[0].item.meta.nse}` : "--";
  els.sectorRoe.textContent = roeValues.length ? pct(roeValues.reduce((a, b) => a + b, 0) / roeValues.length) : "N/A";
}

function renderSectorCharts() {
  if (!els.sectorCharts) return;
  const rows = dashboard.map((item) => ({ item, extra: extraData[item.meta.id] || {} }));
  const metricRows = rows.map((row) => ({
    id: row.item.meta.id,
    label: row.extra.label || row.item.meta.nse,
    a: row.extra[activeSectorMetric] || 0,
    b: activeSectorMetric === "revenue" ? row.extra.pat || 0 : row.extra.patMargin || 0
  }));
  els.sectorCharts.innerHTML = `
    <article class="chart-card">${chartTitle("Revenue & PAT")}<div class="chart-toolbar"><button class="${activeSectorMetric === "revenue" ? "is-active" : ""}" data-sector-metric="revenue">Revenue/PAT</button><button class="${activeSectorMetric === "ebitdaMargin" ? "is-active" : ""}" data-sector-metric="ebitdaMargin">EBITDA/PAT margin</button><button class="${activeSectorMetric === "roce" ? "is-active" : ""}" data-sector-metric="roce">ROCE/PAT margin</button></div>${barChart(metricRows, activeSectorMetric === "revenue" ? "Revenue" : activeSectorMetric === "roce" ? "ROCE" : "EBITDA margin", activeSectorMetric === "revenue" ? "PAT" : "PAT margin")}</article>
    <article class="chart-card">${chartTitle("Valuation vs Profitability")}${scatterChart(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, x: row.extra.pe, y: row.extra.patMargin })), "P/E", "PAT margin")}</article>
    <article class="chart-card wide">${chartTitle("1Y Price Return Heatmap")}${heatmap(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, value: oneYearReturn(row.item) })))}</article>
    <article class="chart-card">${chartTitle("ROE vs ROA")}${scatterChart(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, x: row.extra.roa, y: row.extra.roe })), "ROA", "ROE")}</article>
    <article class="chart-card">${chartTitle("Market Cap Treemap")}${treemap(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, value: row.extra.marketCap || 0 })))}</article>`;
}

function switchTab(tab) {
  activeTab = tab;
  els.tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
  els.panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tab));
  renderDataTabs();
}

function renderWatchlist() {
  els.watchlist.innerHTML = watchIds.map((id) => {
    const item = metaFor(id) || dashboard.find((x) => x.meta.id === id)?.meta;
    if (!item) return "";
    return `<button class="watch-item ${id === selectedId ? "is-active" : ""}" data-select="${id}">
      <span><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.nse || item.symbol)} &middot; BSE ${escapeHtml(item.bse || "custom")}</span></span>
      <span class="delete-btn" role="button" title="Delete from watchlist" data-delete="${id}">&times;</span>
    </button>`;
  }).join("");
  els.watchlist.querySelectorAll("[data-select]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const del = event.target.closest("[data-delete]");
      if (del) return removeCompany(del.dataset.delete);
      selectedId = node.dataset.select;
      render();
    });
  });
}

function renderTopWatchlist() {
  if (!els.topWatchlist) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  if (els.topSelectedName) els.topSelectedName.textContent = selected?.meta.name || "Select a company";
  els.topWatchlist.innerHTML = dashboard.map((item) => {
    const q = item.yahoo?.quote || {};
    const extra = extraData[item.meta.id] || {};
    return `<button class="top-watch-chip ${item.meta.id === selectedId ? "is-active" : ""}" data-top-select="${item.meta.id}">
      <strong>${escapeHtml(extra.label || item.meta.nse || item.meta.name)}</strong>
      <span class="${moveClass(q.regularMarketChangePercent)}">${pct(q.regularMarketChangePercent)}</span>
    </button>`;
  }).join("");
  els.topWatchlist.querySelectorAll("[data-top-select]").forEach((node) => {
    node.addEventListener("click", () => {
      selectedId = node.dataset.topSelect;
      render();
    });
  });
}

function renderCards() {
  els.cards.innerHTML = dashboard.map((item) => {
    const q = item.yahoo?.quote || {};
    const change = q.regularMarketChangePercent;
    return `<article class="company-card ${item.meta.id === selectedId ? "is-active" : ""}" data-card="${item.meta.id}">
      <div class="card-top">
        <strong>${escapeHtml(item.meta.name)}</strong>
        <span class="${moveClass(change)}">${pct(change)}</span>
      </div>
      <small>${escapeHtml(item.meta.segment || "")}</small>
      <div class="price"><b>${money(q.regularMarketPrice)}</b><span>${cardSubMetric(q)}</span></div>
      <div class="mini" title="52-week context"></div>
    </article>`;
  }).join("");
  els.cards.querySelectorAll("[data-card]").forEach((node) => {
    node.addEventListener("click", () => {
      selectedId = node.dataset.card;
      render();
    });
  });
}

function renderDetail() {
  const item = dashboard.find((d) => d.meta.id === selectedId) || dashboard[0];
  if (!item) return;
  const q = item.yahoo?.quote || {};
  const f = item.yahoo?.financials || {};
  els.selectedName.textContent = item.meta.name;
  els.selectedCodes.innerHTML = `${escapeHtml(item.meta.nse || item.meta.symbol)} &middot; BSE ${escapeHtml(item.meta.bse || "custom")} &middot; ${escapeHtml(item.meta.isin || "")}`;
  els.selectedPrice.textContent = money(q.regularMarketPrice);
  els.selectedMove.textContent = `${money(q.regularMarketChange)} ${pct(q.regularMarketChangePercent)}`;
  els.selectedMove.className = moveClass(q.regularMarketChangePercent);
  renderChart(item.chart || []);
  const metrics = [
    ["Last price", money(q.regularMarketPrice)],
    ["Day change", `${money(q.regularMarketChange)} ${pct(q.regularMarketChangePercent)}`],
    ["Volume", compact(q.volume)],
    ["52W high", money(q.fiftyTwoWeekHigh)],
    ["52W low", money(q.fiftyTwoWeekLow)],
    ["Revenue", compact(f.revenue)],
    ["P/E", compact(q.trailingPE)],
    ["Source", item.yahoo?.source || "Live feed"]
  ];
  els.fundamentals.innerHTML = metrics.map(([label, value]) => `<div><small>${label}</small><strong>${value}</strong></div>`).join("");
  renderInsights(item);
}

function renderChart(points) {
  if (!points.length) {
    els.chart.innerHTML = `<text x="28" y="130" fill="#9ea99c">No chart data returned by Yahoo Finance.</text>`;
    return;
  }
  const w = 720;
  const h = 260;
  const pad = 24;
  const values = points.map((p) => p.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xFor = (index) => pad + (index / Math.max(points.length - 1, 1)) * (w - pad * 2);
  const yFor = (value) => h - pad - ((value - min) / span) * (h - pad * 2);
  const d = points.map((p, i) => {
    const x = xFor(i);
    const y = yFor(p.close);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const marks = points.filter((_, index) => index % Math.max(Math.floor(points.length / 18), 1) === 0 || index === points.length - 1).map((p, index) => {
    const actualIndex = points.indexOf(p);
    const x = xFor(actualIndex);
    const y = yFor(p.close);
    const date = new Date(p.time * 1000).toLocaleDateString();
    return `<circle class="chart-mark" data-tip="${escapeHtml(`${date}: close ${money(p.close)}, volume ${compact(p.volume)}`)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${index === points.length - 1 ? 5 : 3}" fill="#d9b45f"/>`;
  }).join("");
  const firstDate = new Date(points[0].time * 1000).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  const lastDate = new Date(points.at(-1).time * 1000).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  els.chart.innerHTML = `
    <defs><linearGradient id="lineGlow" x1="0" x2="1"><stop stop-color="#77c7d5"/><stop offset="1" stop-color="#d9b45f"/></linearGradient></defs>
    <line class="grid-line" x1="24" x2="696" y1="${yFor(min)}" y2="${yFor(min)}"/>
    <line class="grid-line" x1="24" x2="696" y1="${yFor((min + max) / 2)}" y2="${yFor((min + max) / 2)}"/>
    <line class="grid-line" x1="24" x2="696" y1="${yFor(max)}" y2="${yFor(max)}"/>
    <line class="axis-line" x1="24" x2="696" y1="${h - pad}" y2="${h - pad}"/>
    <line class="axis-line" x1="24" x2="24" y1="24" y2="${h - pad}"/>
    <path d="${d}" fill="none" stroke="rgba(119,199,213,.18)" stroke-width="12" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="url(#lineGlow)" stroke-width="3" stroke-linecap="round"/>
    ${marks}
    <text class="axis-label" x="30" y="22">Y: Price</text>
    <text class="axis-label" x="696" y="248" text-anchor="end">X: Date</text>
    <text x="30" y="246" fill="#9ea99c" font-size="11">${escapeHtml(firstDate)}</text>
    <text x="646" y="246" fill="#9ea99c" font-size="11">${escapeHtml(lastDate)}</text>
    <text x="24" y="46" fill="#9ea99c">1Y close</text>
    <text x="24" y="62" fill="#f3f5ee">${money(values.at(-1))}</text>
    <text x="600" y="34" fill="#9ea99c">High ${money(max)}</text>
    <text x="600" y="58" fill="#9ea99c">Low ${money(min)}</text>`;
}

function renderInsights(item) {
  const trends = item.yahoo?.financials?.earningsTrend || [];
  const earnings = trends.map((row) => ({
    title: `Yahoo earnings estimate: ${row.period}`,
    date: row.endDate || "",
    category: "Earnings trend",
    notes: `Revenue estimate ${compact(row.revenueEstimate)} - EPS estimate ${compact(row.earningsEstimate)} - Growth ${pct((row.growth || 0) * 100)}`
  }));
  const filings = (item.bse || []).map((row) => ({
    title: row.title,
    date: row.date,
    category: row.category,
    notes: row.notes,
    attachment: row.attachment
  }));
  const news = (item.news || []).map((row) => ({
    title: row.title,
    date: formatDate(row.date),
    category: row.publisher || "Yahoo Finance news",
    notes: newsDetail(row),
    attachment: row.link
  }));
  const links = [
    {
      title: "Open BSE corporate filings",
      category: "Source link",
      date: "Live",
      attachment: item.meta.bse ? `https://www.bseindia.com/corporates/ann.html` : null,
      notes: "Use this when you want the original filing, investor presentation, transcript, or exchange announcement."
    },
    {
      title: "Open Yahoo Finance profile",
      category: "Source link",
      date: "Live",
      attachment: `https://finance.yahoo.com/quote/${item.meta.symbol}`,
      notes: "Yahoo quote, price chart, statistics and financial statement modules."
    }
  ];
  const all = [...news, ...earnings, ...filings, ...links].slice(0, 20);
  els.insightList.innerHTML = all.length ? all.map((row) => `<div class="insight">
    <small>${escapeHtml(row.category || "Note")} &middot; ${escapeHtml(row.date || "")}</small>
    <strong>${escapeHtml(row.title || "Untitled")}</strong>
    <p>${escapeHtml((row.notes || "").toString()).slice(0, 220)}</p>
    ${row.attachment ? `<a href="${row.attachment}" target="_blank" rel="noreferrer">Open source</a>` : ""}
  </div>`).join("") : `<div class="empty">No BSE filings or Yahoo earnings trend returned yet.</div>`;
}

function liveNewsRows(item, limit = 6) {
  const yahooRows = (item.news || []).map((row) => ({
    date: formatDate(row.date),
    title: row.title || "Yahoo Finance news",
    detail: newsDetail(row),
    source: row.publisher || row.source || "Yahoo Finance",
    link: row.link
  }));
  const bseRows = (item.bse || []).slice(0, 5).map((row) => ({
    date: formatDate(row.date),
    title: row.title || "BSE announcement",
    detail: summarizeText(row.notes || row.category || row.title),
    source: row.category || "BSE",
    link: row.attachment
  }));
  const staticRows = (companyUpdates[item.meta.id] || []).map((row) => ({
    date: formatDate(row.date),
    title: row.title,
    detail: row.detail,
    source: "DefStrat note",
    link: null
  }));
  return [...yahooRows, ...bseRows, ...staticRows].slice(0, limit);
}

function summarizeText(value, max = 210) {
  const text = String(value || "").replace(/&nbsp;/g, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "Latest item available from the live feed; open the source for the full article or filing.";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function newsDetail(row) {
  const title = String(row.title || "").replace(/\s+/g, " ").trim().toLowerCase();
  const summary = String(row.summary || "").replace(/\s+/g, " ").trim();
  const normalized = summary.toLowerCase();
  if (!summary || normalized === title || normalized.startsWith(title)) {
    return "Open the source for the full article; this live feed returned a headline-only summary.";
  }
  return summarizeText(summary);
}

function formatDate(value) {
  if (!value) return "Live";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 24);
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function oneYearReturn(item) {
  const points = item.chart || [];
  const first = points.find((point) => Number.isFinite(point.close));
  const last = [...points].reverse().find((point) => Number.isFinite(point.close));
  return first && last && first.close ? ((last.close - first.close) / first.close) * 100 : NaN;
}

function renderDataTabs() {
  renderCompanyInfo();
  renderBusiness();
  renderHistorical();
  renderEarnings();
  renderCallSummary();
  renderComparison();
  renderAiBrief();
  renderManage();
}

function renderCompanyInfo() {
  if (!els.companyInfoPanel) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  if (!selected) return;
  const extra = extraData[selected.meta.id] || {};
  const q = selected.yahoo?.quote || {};
  const updates = liveNewsRows(selected, 8);
  els.companyInfoPanel.innerHTML = `<div class="info-grid">
    <article class="brief-card">
      <small>${escapeHtml(selected.meta.nse || selected.meta.symbol)} &middot; BSE ${escapeHtml(selected.meta.bse || "custom")}</small>
      <strong>${escapeHtml(selected.meta.name)}</strong>
      <p>${escapeHtml(extra.oneLine || selected.meta.segment || "")}</p>
      <div class="fundamentals">
        <div><small>Sub-sector</small><strong>${escapeHtml(extra.focus || selected.meta.segment || "--")}</strong></div>
        <div><small>Live price</small><strong>${money(q.regularMarketPrice)}</strong></div>
        <div><small>Day move</small><strong class="${moveClass(q.regularMarketChangePercent)}">${pct(q.regularMarketChangePercent)}</strong></div>
        <div><small>1Y return</small><strong class="${moveClass(oneYearReturn(selected))}">${pct(oneYearReturn(selected))}</strong></div>
      </div>
      <p><a href="https://finance.yahoo.com/quote/${selected.meta.symbol}" target="_blank" rel="noreferrer">Yahoo Finance</a> &middot; <a href="https://www.bseindia.com/corporates/ann.html" target="_blank" rel="noreferrer">BSE announcements</a></p>
    </article>
    <article class="brief-card">
      <small>Recent updates and news</small>
      <strong>Live news and BSE summary</strong>
      <div class="update-list">${updates.map((row) => `<div class="update-item"><small>${escapeHtml(row.source)} &middot; ${escapeHtml(row.date)}</small><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.detail)}</p>${row.link ? `<a href="${row.link}" target="_blank" rel="noreferrer">Open source</a>` : ""}</div>`).join("") || `<div class="empty">No live Yahoo/BSE news returned yet.</div>`}</div>
    </article>
  </div>`;
}

function renderBusiness() {
  if (!els.businessPanel) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  if (!selected) {
    els.businessPanel.innerHTML = `<div class="empty">Waiting for live company data...</div>`;
    return;
  }
  const extra = extraData[selected.meta.id] || {};
  const profile = businessProfiles[selected.meta.id] || {
    model: selected.meta.segment || "Custom watchlist company",
    description: selected.meta.segment || "Business profile will appear here once added.",
    products: [{ name: selected.meta.segment || "Custom business", icon: "grid", detail: "Add a sub-sector in Manage to enrich this profile." }],
    shareholding: [["Public / others", 100]]
  };
  const q = selected.yahoo?.quote || {};
  const financialRows = [
    ["Revenue", Number.isFinite(extra.revenue) ? `Rs ${compact(extra.revenue)}crs` : compact(selected.yahoo?.financials?.revenue)],
    ["PAT margin", Number.isFinite(extra.patMargin) ? pct(extra.patMargin) : pct((selected.yahoo?.financials?.profitMargins || NaN) * 100)],
    ["ROCE", Number.isFinite(extra.roce) ? pct(extra.roce) : "--"],
    ["D/E", Number.isFinite(extra.debtEquity) ? `${formatNum.format(extra.debtEquity)}x` : "--"],
    ["P/E", Number.isFinite(extra.pe) ? formatNum.format(extra.pe) : compact(q.trailingPE)],
    ["1Y return", pct(oneYearReturn(selected))]
  ];
  els.businessPanel.innerHTML = `<div class="business-layout">
    <article class="business-hero">
      <div>
        <small>${escapeHtml(selected.meta.nse || selected.meta.symbol)} &middot; ${escapeHtml(extra.focus || selected.meta.segment || "Defence platform")}</small>
        <strong>${escapeHtml(selected.meta.name)}</strong>
        <p>${escapeHtml(profile.description)}</p>
      </div>
      <div class="business-visual" aria-hidden="true">${productIcon(profile.products[0]?.icon || "grid", selected.meta.id)}</div>
    </article>

    <article class="brief-card">
      <small>Business model</small>
      <strong>How the company makes money</strong>
      <p>${escapeHtml(profile.model)}</p>
      <div class="business-kpis">
        <div><small>Live price</small><strong>${money(q.regularMarketPrice)}</strong></div>
        <div><small>Day move</small><strong class="${moveClass(q.regularMarketChangePercent)}">${pct(q.regularMarketChangePercent)}</strong></div>
        <div><small>Market cap</small><strong>${Number.isFinite(extra.marketCap) ? `Rs ${compact(extra.marketCap)}crs` : compact(q.marketCap)}</strong></div>
      </div>
    </article>

    <article class="brief-card">
      <small>Key financials</small>
      <strong>Operating snapshot</strong>
      ${table(["Metric", "Value"], financialRows.map(([label, value]) => [escapeHtml(label), escapeHtml(value)]))}
    </article>

    <article class="brief-card">
      <small>Shareholding snapshot</small>
      <strong>Ownership mix</strong>
      ${shareholdingChart(profile.shareholding)}
      <p class="fine-print">Model snapshot for dashboard analysis. Reconcile with the latest exchange shareholding filing before investment use.</p>
    </article>

    <article class="brief-card business-products">
      <small>Key products</small>
      <strong>Product and capability map</strong>
      <div class="product-grid">${profile.products.map((product) => `<div class="product-card">
        <div class="product-art">${productIcon(product.icon, selected.meta.id)}</div>
        <strong>${escapeHtml(product.name)}</strong>
        <p>${escapeHtml(product.detail)}</p>
      </div>`).join("")}</div>
    </article>
  </div>`;
}

function shareholdingChart(rows = []) {
  const total = rows.reduce((sum, row) => sum + Number(row[1] || 0), 0) || 1;
  let offset = 25;
  const colors = ["#d9b45f", "#77c7d5", "#65d08c", "#ff7b7b"];
  const circles = rows.map((row, index) => {
    const value = Number(row[1] || 0);
    const length = (value / total) * 100;
    const node = `<circle r="15.9" cx="18" cy="18" fill="transparent" stroke="${colors[index % colors.length]}" stroke-width="6" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${offset}"/>`;
    offset -= length;
    return node;
  }).join("");
  const legend = rows.map((row, index) => `<div><span style="background:${colors[index % colors.length]}"></span><strong>${escapeHtml(row[0])}</strong><small>${formatNum.format(Number(row[1] || 0))}%</small></div>`).join("");
  return `<div class="shareholding-wrap"><svg class="shareholding-chart" viewBox="0 0 36 36" aria-label="Shareholding chart">${circles}<text x="18" y="19.5" text-anchor="middle" fill="#f3f5ee" font-size="4.5">${rows.length}</text></svg><div class="shareholding-legend">${legend}</div></div>`;
}

function productIcon(type = "grid", id = "") {
  const seed = escapeHtml(`${id}-${type}`);
  const icons = {
    drone: `<path d="M30 50h60M60 20v60M42 32l36 36M78 32L42 68"/><circle cx="30" cy="50" r="12"/><circle cx="90" cy="50" r="12"/><circle cx="60" cy="20" r="12"/><circle cx="60" cy="80" r="12"/><rect x="50" y="40" width="20" height="20" rx="5"/>`,
    radar: `<path d="M25 85h70M60 85V35M37 58a32 32 0 0 1 46 0M28 45a45 45 0 0 1 64 0"/><circle cx="60" cy="35" r="8"/>`,
    signal: `<path d="M30 82h60M42 82V55M60 82V35M78 82V48M25 28c23-16 47-16 70 0M36 42c16-10 32-10 48 0"/>`,
    aircraft: `<path d="M18 62l84-32-28 72-16-30-28 16zM58 72l16 30"/><path d="M30 88l20-18"/>`,
    gear: `<circle cx="60" cy="60" r="18"/><path d="M60 24v14M60 82v14M24 60h14M82 60h14M34 34l10 10M76 76l10 10M86 34L76 44M44 76L34 86"/>`,
    energy: `<path d="M64 16L30 65h26l-8 39 42-58H63z"/>`,
    camera: `<rect x="24" y="40" width="72" height="45" rx="8"/><path d="M42 40l7-10h22l7 10"/><circle cx="60" cy="62" r="14"/>`,
    turbine: `<circle cx="60" cy="60" r="9"/><path d="M60 51c10-24 32-10 18 6M69 65c24 10 10 32-6 18M54 69c-10 24-32 10-18-6M51 55c-24-10-10-32 6-18"/>`,
    factory: `<path d="M20 88h80V48L76 62V48L52 62V38H20zM34 88V68h16v20M60 72h10M80 72h10"/>`,
    lens: `<circle cx="60" cy="60" r="33"/><circle cx="60" cy="60" r="17"/><path d="M42 42l36 36M78 42L42 78"/>`,
    satellite: `<rect x="48" y="48" width="24" height="24" rx="4"/><path d="M42 42L20 24M78 78l22 18M78 42l22-18M42 78L20 96M26 18l18 18M94 18L76 36M26 102l18-18M94 102L76 84"/>`,
    shield: `<path d="M60 18l36 12v26c0 24-14 40-36 50-22-10-36-26-36-50V30z"/><path d="M44 60l11 11 23-25"/>`,
    grid: `<rect x="26" y="26" width="28" height="28" rx="5"/><rect x="66" y="26" width="28" height="28" rx="5"/><rect x="26" y="66" width="28" height="28" rx="5"/><rect x="66" y="66" width="28" height="28" rx="5"/>`
  };
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Product graphic"><defs><linearGradient id="pg-${seed}" x1="0" x2="1"><stop stop-color="#77c7d5"/><stop offset="1" stop-color="#d9b45f"/></linearGradient></defs><rect width="120" height="120" rx="18" fill="rgba(119,199,213,.08)"/><g fill="none" stroke="url(#pg-${seed})" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${icons[type] || icons.grid}</g></svg>`;
}

function renderHistorical() {
  if (!els.historicalPanel) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  if (!selected) {
    els.historicalPanel.innerHTML = `<div class="empty">Waiting for live company data...</div>`;
    return;
  }
  const selectedExtra = extraData[selected?.meta.id] || {};
  const rows = dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong><br><small>${escapeHtml(extra.focus || item.meta.segment)}</small>`,
      money(item.yahoo?.quote?.regularMarketPrice),
      `<span class="${moveClass(oneYearReturn(item))}">${pct(oneYearReturn(item))}</span>`,
      Number.isFinite(extra.roce) ? pct(extra.roce) : "--",
      Number.isFinite(extra.ebitdaMargin) ? pct(extra.ebitdaMargin) : "--",
      Number.isFinite(extra.fcf) ? `\u20b9${compact(extra.fcf)} Cr` : "--",
      `${extra.debtorDays || "--"} / ${extra.inventoryDays || "--"}`
    ];
  });
  els.historicalPanel.innerHTML = `<div class="chart-grid">
    <article class="chart-card">${chartTitle("Revenue Growth Trajectory")}${lineChart(years, seededSeries(selected, "revenue"), "Revenue")}</article>
    <article class="chart-card">${chartTitle("Return on Capital Employed (ROCE)")}${lineChart(years, seededSeries(selected, "roce"), "ROCE")}</article>
    <article class="chart-card">${chartTitle("EBITDA vs PAT Margins")}${barChart([{ id: selected?.meta.id, label: selectedExtra.label || selected?.meta.nse, a: selectedExtra.ebitdaMargin || 0, b: selectedExtra.patMargin || 0 }], "EBITDA", "PAT")}</article>
    <article class="chart-card">${chartTitle("Free Cash Flow Generation")}${lineChart(years, seededSeries(selected, "fcf"), "FCF")}</article>
    <article class="chart-card">${chartTitle("Peer Valuation Multiples")}${barChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, a: extraData[item.meta.id]?.pe || 0, b: extraData[item.meta.id]?.pb || 0 })), "P/E", "P/B")}</article>
    <article class="chart-card">${chartTitle("Working Capital - Receivable & Inventory Days")}${barChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, a: extraData[item.meta.id]?.debtorDays || 0, b: extraData[item.meta.id]?.inventoryDays || 0 })), "Receivable days", "Inventory days")}</article>
  </div>` + table([
    "Company", "Live price", "1Y return", "ROCE", "EBITDA margin", "FCF", "Receivable / Inventory days"
  ], rows);
}

function renderEarnings() {
  if (!els.earningsPanel) return;
  els.earningsPanel.innerHTML = `<p class="empty">Structured IC-grade summaries with YoY comparisons, consensus placeholders, latest filings and IC verdict.</p>
    <div class="earnings-grid">${dashboard.map((item) => {
      const extra = extraData[item.meta.id] || {};
      const q = item.yahoo?.quote || {};
      const filing = item.bse?.[0];
      return `<details class="earnings-card">
        <summary>${escapeHtml(item.meta.name)} &middot; ${escapeHtml(extra.period || "Live")}</summary>
        <div class="body">
          <div class="fundamentals">
            <div><small>Revenue</small><strong>${Number.isFinite(extra.revenue) ? `\u20b9${compact(extra.revenue)} Cr` : "--"}</strong></div>
            <div><small>PAT margin</small><strong>${Number.isFinite(extra.patMargin) ? pct(extra.patMargin) : "--"}</strong></div>
            <div><small>1Y return</small><strong>${pct(oneYearReturn(item))}</strong></div>
            <div><small>IC verdict</small><strong>${escapeHtml(extra.verdict || "Watch")}</strong></div>
          </div>
          <p>${escapeHtml(extra.oneLine || item.meta.segment)}</p>
          <p>Latest quote: ${money(q.regularMarketPrice)} (${pct(q.regularMarketChangePercent)}). Consensus data is shown as unavailable when Yahoo's protected statement modules do not return it.</p>
          <p>${filing ? `<a href="${filing.attachment || `https://www.bseindia.com/corporates/ann.html`}" target="_blank" rel="noreferrer">${escapeHtml(filing.title || "Latest BSE filing")}</a>` : `<a href="https://www.bseindia.com/corporates/ann.html" target="_blank" rel="noreferrer">BSE filings (${escapeHtml(item.meta.bse || "code")})</a>`} &middot; <a href="https://finance.yahoo.com/quote/${item.meta.symbol}" target="_blank" rel="noreferrer">Yahoo Finance</a></p>
        </div>
      </details>`;
    }).join("")}</div>`;
}

function renderCallSummary() {
  if (!els.callSummaryPanel) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  if (!selected) return;
  const summary = callSummaries[selected.meta.id] || callSummaries.mtar;
  const note = callSummaries[selected.meta.id] ? "" : `<div class="empty">No earnings call summary has been added for ${escapeHtml(selected.meta.name)} yet. Showing the latest attached MTAR earnings call format below. Current ${escapeHtml(selected.meta.name)} period tracked: ${escapeHtml(extraData[selected.meta.id]?.period || "N/A")}.</div>`;
  const transcriptRows = dashboard.map((item) => {
    const source = transcriptSources[item.meta.id] || {};
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong><br><small>${escapeHtml(item.meta.nse || item.meta.symbol)}</small>`,
      escapeHtml(source.status || "Checking"),
      escapeHtml(source.date || extraData[item.meta.id]?.period || "N/A"),
      source.url ? `<a href="${source.url}" target="_blank" rel="noreferrer">Open source</a><br><small>${escapeHtml(source.note || "")}</small>` : escapeHtml(source.note || "No transcript source added yet.")
    ];
  });
  els.callSummaryPanel.innerHTML = `<article class="brief-card">
    <small>Transcript availability rechecked</small>
    <strong>Latest earnings-call transcript sources</strong>
    ${table(["Company", "Availability", "Date / period", "Source"], transcriptRows)}
  </article>
  <article class="brief-card call-summary-card">
    ${note}
    <small>${escapeHtml(summary.period)} &middot; Call date/period: ${escapeHtml(summary.callDate)} &middot; Source: ${escapeHtml(summary.source)}</small>
    <strong>${escapeHtml(summary.title)}</strong>
    ${summary.sections.map((section) => `<div class="call-section"><h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.text)}</p></div>`).join("")}
    <div class="call-section"><h3>${escapeHtml(summary.quarterTitle || "Q4 FY26 Metrics")}</h3>${table(summary.quarterHeaders || ["Metric", "Q4 FY26", "Q4 FY25", "Change"], summary.q4)}</div>
    <div class="call-section"><h3>${escapeHtml(summary.fullYearTitle || "FY26 Metrics")}</h3>${table(summary.fullYearHeaders || ["Metric", "FY26", "FY25", "Change"], summary.fy)}</div>
  </article>`;
}

function renderComparison() {
  if (!els.comparisonPanel) return;
  els.comparisonPanel.innerHTML = `<div class="chart-grid">
    <article class="chart-card">${chartTitle("Peer Valuation Multiples")}${barChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, a: extraData[item.meta.id]?.pe || 0, b: extraData[item.meta.id]?.pb || 0 })), "P/E", "P/B")}</article>
    <article class="chart-card">${chartTitle("Profitability vs Leverage")}${scatterChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, x: extraData[item.meta.id]?.debtEquity, y: extraData[item.meta.id]?.patMargin })), "D/E", "PAT margin")}</article>
  </div>` + table([
    "Company", "Focus", "Revenue", "PAT margin", "ROE", "D/E", "Commentary"
  ], dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const f = item.yahoo?.financials || {};
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong>`,
      escapeHtml(extra.focus || item.meta.segment || ""),
      Number.isFinite(extra.revenue) ? `\u20b9${compact(extra.revenue)} Cr` : compact(f.revenue),
      Number.isFinite(extra.patMargin) ? pct(extra.patMargin) : pct((f.profitMargins || NaN) * 100),
      Number.isFinite(extra.roe) ? pct(extra.roe) : pct((f.returnOnEquity || NaN) * 100),
      Number.isFinite(extra.debtEquity) ? `${formatNum.format(extra.debtEquity)}x` : "--",
      escapeHtml(extra.oneLine || item.meta.segment || "")
    ];
  }));
}

function renderAiBrief() {
  if (!els.aiPanel) return;
  const ranked = [...dashboard].sort((a, b) => oneYearReturn(b) - oneYearReturn(a));
  const leader = ranked.find((item) => Number.isFinite(oneYearReturn(item)));
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  const selectedExtra = extraData[selected?.meta.id] || {};
  els.aiPanel.innerHTML = `<div class="prompt-row">
    <button data-ai-prompt="Which company has the highest ROCE?">Which company has the highest ROCE?</button>
    <button data-ai-prompt="Compare all companies by PAT margin">Compare all companies by PAT margin</button>
    <button data-ai-prompt="Best P/E relative to growth?">Best P/E relative to growth?</button>
    <button data-ai-prompt="Summarise latest news for selected company">Selected news</button>
    <button data-ai-prompt="Summarise earnings call for selected company">Selected call summary</button>
    <button data-ai-prompt="Summarise latest news for all companies">Latest news summary</button>
    <button data-ai-prompt="IC verdict summary - all companies">IC verdict summary - all companies</button>
  </div>
  <div class="brief-grid">
    <article class="brief-card"><small>Sector snapshot</small><strong>${dashboard.length} companies tracked</strong><p>Live quote data is refreshed every minute. The sector average move currently reads <span class="${moveClass(Number.parseFloat(els.avgMove.textContent))}">${escapeHtml(els.avgMove.textContent)}</span>.</p></article>
    <article class="brief-card"><small>Momentum leader</small><strong>${leader ? escapeHtml(leader.meta.name) : "Awaiting data"}</strong><p>${leader ? `The current 1Y return is ${pct(oneYearReturn(leader))}, based on Yahoo chart history.` : "Live chart history has not returned enough data yet."}</p></article>
    <article class="brief-card"><small>Selected company</small><strong>${escapeHtml(selected?.meta.name || "No company")}</strong><p>${escapeHtml(selectedExtra.oneLine || selected?.meta.segment || "Select a company to view the briefing.")}</p></article>
  </div>
  <div class="ai-box"><input id="aiPrompt" placeholder="Ask about latest prices, Yahoo news, BSE filings, valuations or comparisons"><button id="aiAskBtn">Ask DefStrat AI</button></div>
  <article class="brief-card" id="aiAnswer"><small>Analyst response</small><p>Choose a prompt or ask a question. DefStrat refreshes live Yahoo Finance, BSE and current news context before answering.</p></article>`;
  document.querySelectorAll("[data-ai-prompt]").forEach((button) => button.addEventListener("click", () => answerAi(button.dataset.aiPrompt)));
  document.querySelector("#aiAskBtn")?.addEventListener("click", () => answerAi(document.querySelector("#aiPrompt")?.value || ""));
}

function renderManage() {
  if (!els.managePanel) return;
  els.managePanel.innerHTML = `<div class="brief-grid">
    <article class="brief-card"><small>AI analyst settings</small><strong>Local deterministic mode</strong><p>Groq/Llama-style prompt chips are mirrored from DefStrat. Add a key later if you want cloud LLM responses.</p></article>
    <article class="brief-card"><small>Tracked companies</small><strong>${watchIds.length}</strong><p>${watchIds.map((id) => escapeHtml(metaFor(id)?.name || id)).join(", ")}</p></article>
    <article class="brief-card"><small>Data sources</small><strong>Yahoo Finance + BSE + live news</strong><p>Quote history comes from Yahoo Finance. Filings, presentations and exchange notes link back to BSE where available. Article summaries use current news feeds.</p></article>
  </div>
  <div class="brief-card">
    <small>Company universe</small><strong>Add company</strong>
    <div class="manage-form">
      <input id="manageName" placeholder="Company name">
      <input id="manageTicker" placeholder="NSE ticker">
      <input id="manageBse" placeholder="BSE code">
      <input id="manageSubsector" placeholder="Sub-sector">
      <button id="manageAdd">Add</button>
    </div>
    <p>${custom.length ? `Custom companies: ${custom.map((item) => escapeHtml(item.symbol)).join(", ")}` : "No custom companies added yet."}</p>
  </div>`;
  document.querySelector("#manageAdd")?.addEventListener("click", addFromManage);
}

async function answerAi(prompt) {
  const normalized = prompt.toLowerCase();
  const answer = document.querySelector("#aiAnswer");
  if (!answer) return;
  if (!normalized.trim()) {
    renderAiResponse("Ask DefStrat AI", [{ heading: "Ready", body: "Ask for a company, metric, comparison, latest price, news, BSE filing, or earnings-call summary." }]);
    return;
  }
  answer.innerHTML = `<small>Searching live sources</small><p>Refreshing Yahoo Finance quote/chart data, live internet news and BSE filing context before answering...</p>`;
  await refreshYahooContext(normalized);
  const rows = getAnalystRows();
  const metric = inferMetric(normalized);
  const allRequested = wantsAllCompanies(normalized);
  const mentioned = resolveTargetRows(rows, normalized, allRequested);
  const newsRequested = normalized.includes("news") || normalized.includes("article") || normalized.includes("internet") || normalized.includes("latest update");
  const callRequested = normalized.includes("earnings call") || normalized.includes("transcript") || normalized.includes("call summary");
  const priceRequested = normalized.includes("price") || normalized.includes("quote") || (normalized.includes("latest") && !newsRequested && !callRequested);
  let title = "Analyst response";
  let lines = [];
  if (newsRequested) {
    title = allRequested ? "Latest News Summary" : `Latest News Summary - ${mentioned[0]?.name || "Selected Company"}`;
    lines = mentioned.map((row) => {
      const item = dashboard.find((entry) => entry.meta.id === row.id);
      const news = item ? liveNewsRows(item, allRequested ? 2 : 4) : [];
      const body = news.length
        ? news.map((entry) => `${entry.date} | ${entry.source}: ${entry.title}. ${entry.detail}`).join("\n")
        : "No relevant live article or BSE filing returned in the latest refresh.";
      return { heading: row.name, body };
    });
  } else if (callRequested) {
    title = allRequested ? "Earnings Call Summary Check" : `Earnings Call Summary - ${mentioned[0]?.name || "Selected Company"}`;
    lines = mentioned.map((row) => {
      const summary = callSummaries[row.id];
      if (!summary) return { heading: row.name, body: "No earnings-call summary has been added for this company yet." };
      const financial = summary.sections.find((section) => section.heading === "Financial Performance")?.text || "";
      const guidance = summary.sections.find((section) => section.heading === "FY27 Guidance")?.text || "";
      return { heading: row.name, body: `${summary.period}; call date/period: ${summary.callDate}. ${financial} ${guidance}` };
    });
  } else if (normalized.includes("highest") || normalized.includes("best") || normalized.includes("leader")) {
    const best = rankRows(rows, metric, "desc")[0];
    title = `Highest ${metric.label}`;
    lines = best ? [{ heading: best.name, body: `${best.name} ranks highest on ${metric.label} at ${metric.format(best[metric.key])}. ${best.oneLine}` }] : [{ heading: "Not enough data", body: `I do not have enough data to rank ${metric.label}.` }];
  } else if (normalized.includes("lowest") || normalized.includes("cheap") || normalized.includes("value")) {
    const best = rankRows(rows, metric, "asc")[0];
    title = `Lowest ${metric.label}`;
    lines = best ? [{ heading: best.name, body: `${best.name} screens lowest on ${metric.label} at ${metric.format(best[metric.key])}. Check quality, order book and working capital before calling it cheap.` }] : [{ heading: "Not enough data", body: `I do not have enough data to rank ${metric.label}.` }];
  } else if (normalized.includes("compare") || normalized.includes("all companies")) {
    title = `Peer comparison by ${metric.label}`;
    lines = rankRows(rows, metric, "desc").map((row, index) => ({ heading: `${index + 1}. ${row.name}`, body: `${metric.label}: ${metric.format(row[metric.key])}. ${row.oneLine}` }));
  } else if (normalized.includes("verdict") || normalized.includes("summary")) {
    title = "IC verdict summary";
    lines = (allRequested ? rows : mentioned).map((row) => ({ heading: `${row.name}: ${row.verdict}`, body: row.oneLine }));
  } else if (normalized.includes("selected") || normalized.includes("this company")) {
    const row = rows.find((item) => item.id === selectedId) || rows[0];
    title = row ? `${row.name} briefing` : "Company briefing";
    lines = row ? [{ heading: row.name, body: `Live price ${money(row.price)}, 1Y return ${pct(row.return1y)}, ROCE ${pct(row.roce)}, PAT margin ${pct(row.patMargin)}. ${row.oneLine}` }] : [{ heading: "No company selected", body: "Select a company first." }];
  } else {
    title = `DefStrat view`;
    const leader = rankRows(rows, metrics.return1y, "desc")[0];
    const quality = rankRows(rows, metrics.roce, "desc")[0];
    lines = [
      { heading: "Momentum leader", body: `${leader?.name || "N/A"} (${leader ? pct(leader.return1y) : "--"} 1Y).` },
      { heading: "Quality leader", body: `${quality?.name || "N/A"} (${quality ? pct(quality.roce) : "--"} ROCE).` },
      { heading: "Try a precise question", body: "Ask for PAT margin, ROCE, P/E, 1Y return, debt, revenue, market cap, latest news, or earnings call summary." }
    ];
  }
  if (priceRequested) {
    lines = [
      ...mentioned.map((row) => ({ heading: `${row.name} live quote`, body: `${money(row.price)} (${pct(row.dayMove)} today, ${pct(row.return1y)} 1Y), refreshed from Yahoo-backed chart context.` })),
      ...lines
    ];
  }
  const refreshed = dashboard.find((item) => item.meta.id === (mentioned[0]?.id || selectedId))?.refreshedAt;
  const stamp = refreshed ? `Latest refresh: ${formatDate(refreshed)}` : `Latest refresh: ${new Date().toLocaleString()}`;
  renderAiResponse(`${title} - ${stamp}`, lines);
}

async function refreshYahooContext(text) {
  const rows = getAnalystRows();
  const targetRows = resolveTargetRows(rows, text, wantsAllCompanies(text));
  const matches = dashboard.filter((item) => targetRows.some((row) => row.id === item.meta.id));
  const wantsAll = wantsAllCompanies(text) || text.includes("news") || text.includes("article");
  const selected = dashboard.find((item) => item.meta.id === selectedId);
  const targets = wantsAll ? dashboard : matches.length ? matches : (selected ? [selected] : []);
  await Promise.all(targets.map(async (item) => {
    try {
      const fresh = await getJson(`/api/company?symbol=${encodeURIComponent(item.meta.symbol)}&bse=${encodeURIComponent(item.meta.bse || "")}&name=${encodeURIComponent(item.meta.name)}`);
      const index = dashboard.findIndex((row) => row.meta.id === item.meta.id);
      if (index >= 0 && fresh?.yahoo) dashboard[index] = { ...dashboard[index], ...fresh, meta: dashboard[index].meta };
    } catch {
      // Keep existing dashboard data when Yahoo is temporarily unavailable.
    }
  }));
}

function renderAiResponse(title, lines) {
  const answer = document.querySelector("#aiAnswer");
  if (!answer) return;
  const cards = (lines || []).map((line) => `<div class="ai-response-item">
    <strong>${escapeHtml(line.heading || "Insight")}</strong>
    <p>${escapeHtml(line.body || "").replace(/\n/g, "<br>")}</p>
  </div>`).join("");
  answer.innerHTML = `<small>${escapeHtml(title)}</small><div class="ai-response-list">${cards || `<div class="empty">No response generated.</div>`}</div>`;
}

function addFromManage() {
  const name = document.querySelector("#manageName")?.value.trim();
  const ticker = document.querySelector("#manageTicker")?.value.trim().toUpperCase();
  const bse = document.querySelector("#manageBse")?.value.trim();
  const subsector = document.querySelector("#manageSubsector")?.value.trim();
  if (!ticker) return;
  const symbol = ticker.includes(".") ? ticker : `${ticker}.NS`;
  const id = `custom-${symbol.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  if (!custom.some((item) => item.id === id)) custom.push({ id, name: name || ticker, symbol, nse: ticker.replace(".NS", ""), bse: bse || "", segment: subsector || "Custom watchlist company" });
  if (!watchIds.includes(id)) watchIds.push(id);
  selectedId = id;
  save();
  refresh();
}

function chartTitle(text) {
  return `<h3>${escapeHtml(text)}</h3>`;
}

function scale(value, min, max, size, pad = 26) {
  if (!Number.isFinite(value)) return pad;
  return pad + ((value - min) / (max - min || 1)) * (size - pad * 2);
}

function barChart(rows, labelA, labelB) {
  const values = rows.flatMap((row) => [row.a, row.b]).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  const group = 520 / Math.max(rows.length, 1);
  const yTicks = [0, max / 2, max];
  const yFor = (value) => 190 - (Math.max(value, 0) / max) * 150;
  const bars = rows.map((row, i) => {
    const x = 45 + i * group;
    const hA = 190 - yFor(row.a);
    const hB = 190 - yFor(row.b);
    const tip = `${row.label}: ${labelA} ${compact(row.a)}, ${labelB} ${compact(row.b)}`;
    return `<rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x}" y="${yFor(row.a)}" width="16" height="${hA}" rx="4" fill="#77c7d5"/><rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x + 20}" y="${yFor(row.b)}" width="16" height="${hB}" rx="4" fill="#d9b45f"/><text x="${x + 18}" y="216" text-anchor="middle" fill="#9ea99c" font-size="10">${escapeHtml(row.label)}</text>`;
  }).join("");
  const grid = yTicks.map((tick) => `<line class="grid-line" x1="45" x2="590" y1="${yFor(tick)}" y2="${yFor(tick)}"/><text x="38" y="${yFor(tick) + 4}" text-anchor="end" fill="#9ea99c" font-size="10">${compact(tick)}</text>`).join("");
  return `<svg viewBox="0 0 620 250"><text class="axis-label" x="45" y="20">Y: ${escapeHtml(labelA)} / ${escapeHtml(labelB)}</text><text class="axis-label" x="575" y="238" text-anchor="end">X: Company</text>${grid}<line class="axis-line" x1="45" x2="590" y1="190" y2="190"/><line class="axis-line" x1="45" x2="45" y1="36" y2="190"/><circle cx="452" cy="18" r="5" fill="#77c7d5"/><text x="462" y="22" fill="#cdd5ca" font-size="11">${escapeHtml(labelA)}</text><circle cx="530" cy="18" r="5" fill="#d9b45f"/><text x="540" y="22" fill="#cdd5ca" font-size="11">${escapeHtml(labelB)}</text>${bars}</svg>`;
}

function lineChart(labels, values, label) {
  const nums = values.filter(Number.isFinite);
  const min = Math.min(...nums, 0);
  const max = Math.max(...nums, 1);
  const gradientId = `lineArea-${String(label).replace(/[^a-z0-9]/gi, "-")}`;
  const yFor = (value) => 198 - ((value - min) / (max - min || 1)) * 150;
  const points = values.map((value, i) => `${scale(i, 0, values.length - 1, 600, 55).toFixed(1)},${yFor(value).toFixed(1)}`);
  const area = `M${points[0]} L${points.slice(1).join(" L")} L${scale(values.length - 1, 0, values.length - 1, 600, 55).toFixed(1)},198 L55,198 Z`;
  const grid = [min, (min + max) / 2, max].map((tick) => `<line class="grid-line" x1="55" x2="590" y1="${yFor(tick)}" y2="${yFor(tick)}"/><text x="48" y="${yFor(tick) + 4}" text-anchor="end" fill="#9ea99c" font-size="10">${compact(tick)}</text>`).join("");
  return `<svg viewBox="0 0 620 250"><defs><linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#77c7d5" stop-opacity=".38"/><stop offset="1" stop-color="#77c7d5" stop-opacity="0"/></linearGradient></defs><text class="axis-label" x="55" y="20">Y: ${escapeHtml(label)}</text><text class="axis-label" x="575" y="238" text-anchor="end">X: Fiscal year</text>${grid}<line class="axis-line" x1="55" x2="590" y1="198" y2="198"/><line class="axis-line" x1="55" x2="55" y1="42" y2="198"/><path d="${area}" fill="url(#${gradientId})"/><polyline points="${points.join(" ")}" fill="none" stroke="#77c7d5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${points.map((p, i) => `<circle class="chart-mark" data-tip="${escapeHtml(`${labels[i]}: ${label} ${compact(values[i])}`)}" cx="${p.split(",")[0]}" cy="${p.split(",")[1]}" r="5" fill="#d9b45f"/><text x="${p.split(",")[0]}" y="220" text-anchor="middle" fill="#9ea99c" font-size="11">${labels[i]}</text>`).join("")}</svg>`;
}

function scatterChart(rows, labelX, labelY) {
  const xs = rows.map((row) => row.x).filter(Number.isFinite);
  const ys = rows.map((row) => row.y).filter(Number.isFinite);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const xFor = (value) => scale(value, minX, maxX, 610, 55);
  const yFor = (value) => 198 - ((value - minY) / (maxY - minY || 1)) * 150;
  const dots = rows.filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y)).map((row) => {
    const x = xFor(row.x);
    const y = yFor(row.y);
    return `<circle class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(`${row.label}: ${labelX} ${compact(row.x)}, ${labelY} ${pct(row.y)}`)}" cx="${x}" cy="${y}" r="8" fill="#d9b45f" fill-opacity=".9"/><text x="${x + 11}" y="${y + 4}" fill="#cdd5ca" font-size="11">${escapeHtml(row.label)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 620 250"><text class="axis-label" x="55" y="20">Y: ${escapeHtml(labelY)}</text><text class="axis-label" x="575" y="238" text-anchor="end">X: ${escapeHtml(labelX)}</text><line class="grid-line" x1="55" x2="590" y1="${yFor((minY + maxY) / 2)}" y2="${yFor((minY + maxY) / 2)}"/><line class="grid-line" x1="${xFor((minX + maxX) / 2)}" x2="${xFor((minX + maxX) / 2)}" y1="42" y2="198"/><line class="axis-line" x1="55" x2="590" y1="198" y2="198"/><line class="axis-line" x1="55" x2="55" y1="42" y2="198"/><text x="48" y="202" text-anchor="end" fill="#9ea99c" font-size="10">${compact(minY)}</text><text x="48" y="48" text-anchor="end" fill="#9ea99c" font-size="10">${compact(maxY)}</text><text x="55" y="214" text-anchor="middle" fill="#9ea99c" font-size="10">${compact(minX)}</text><text x="590" y="214" text-anchor="middle" fill="#9ea99c" font-size="10">${compact(maxX)}</text>${dots}</svg>`;
}

function heatmap(rows) {
  return `<div class="heatmap">${rows.map((row) => {
    const value = Number.isFinite(row.value) ? row.value : 0;
    const hue = value >= 0 ? 140 : 0;
    const alpha = Math.min(.45, .08 + Math.abs(value) / 220);
    return `<div class="heat-cell" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(`${row.label}: 1Y return ${pct(value)}`)}" style="background: hsla(${hue}, 55%, 45%, ${alpha})"><strong>${escapeHtml(row.label)}</strong><span class="${moveClass(value)}">${pct(value)}</span></div>`;
  }).join("")}<div class="chart-caption">Tiles: company &middot; Colour: 1Y return</div></div>`;
}

function treemap(rows) {
  const total = rows.reduce((sum, row) => sum + Math.max(row.value || 0, 0), 0) || 1;
  return `<div class="heatmap">${rows.map((row) => {
    const pctSize = Math.max(72, (row.value / total) * 600);
    return `<div class="heat-cell" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(`${row.label}: market cap INR ${compact(row.value)} Cr`)}" style="min-height:${pctSize}px"><strong>${escapeHtml(row.label)}</strong><span>\u20b9${compact(row.value)} Cr</span></div>`;
  }).join("")}<div class="chart-caption">Tiles: company &middot; Size: market cap</div></div>`;
}

const metrics = {
  roce: { key: "roce", label: "ROCE", format: pct },
  patMargin: { key: "patMargin", label: "PAT margin", format: pct },
  pe: { key: "pe", label: "P/E", format: compact },
  return1y: { key: "return1y", label: "1Y return", format: pct },
  debtEquity: { key: "debtEquity", label: "debt/equity", format: (value) => Number.isFinite(value) ? `${formatNum.format(value)}x` : "--" },
  revenue: { key: "revenue", label: "revenue", format: (value) => Number.isFinite(value) ? `\u20b9${compact(value)} Cr` : "--" },
  marketCap: { key: "marketCap", label: "market cap", format: (value) => Number.isFinite(value) ? `\u20b9${compact(value)} Cr` : "--" }
};

function getAnalystRows() {
  return dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const quote = item.yahoo?.quote || {};
    return {
      id: item.meta.id,
      name: item.meta.name,
      price: quote.regularMarketPrice,
      dayMove: quote.regularMarketChangePercent,
      return1y: oneYearReturn(item),
      revenue: extra.revenue,
      patMargin: extra.patMargin,
      roce: extra.roce,
      pe: extra.pe,
      debtEquity: extra.debtEquity,
      marketCap: extra.marketCap || quote.marketCap,
      verdict: extra.verdict || "Watch",
      oneLine: extra.oneLine || item.meta.segment || ""
    };
  });
}

function mentionedRows(rows, text) {
  return resolveTargetRows(rows, text, false);
}

function wantsAllCompanies(text) {
  return text.includes("all compan") || text.includes("compare") || text.includes("peer") || text.includes("sector") || text.includes("watchlist") || text.includes("portfolio");
}

function resolveTargetRows(rows, text, forceAll) {
  if (forceAll) return rows;
  const generic = new Set(["limited", "ltd", "technologies", "technology", "engineering", "defence", "defense", "systems", "micro", "company"]);
  const normalizedText = String(text || "").toLowerCase();
  const exactMatches = rows.filter((row) => {
    const meta = dashboard.find((item) => item.meta.id === row.id)?.meta || {};
    const extra = extraData[row.id] || {};
    const phrases = [row.name, meta.nse, meta.symbol, row.id, extra.label].filter(Boolean).map((value) => String(value).toLowerCase());
    return phrases.some((phrase) => phrase.length > 2 && normalizedText.includes(phrase));
  });
  if (exactMatches.length) return exactMatches;
  const matches = rows.filter((row) => {
    const meta = dashboard.find((item) => item.meta.id === row.id)?.meta || {};
    const extra = extraData[row.id] || {};
    const terms = [row.name, extra.label, row.id, meta.nse].filter(Boolean)
      .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9]+/))
      .filter((term) => term.length > 2 && !generic.has(term));
    return terms.some((term) => normalizedText.includes(term));
  });
  if (matches.length) return matches;
  const selected = rows.find((row) => row.id === selectedId);
  return selected ? [selected] : rows.slice(0, 1);
}

function inferMetric(text) {
  if (text.includes("roce") || text.includes("capital")) return metrics.roce;
  if (text.includes("pat") || text.includes("margin") || text.includes("profit")) return metrics.patMargin;
  if (text.includes("p/e") || text.includes("pe") || text.includes("valuation") || text.includes("cheap")) return metrics.pe;
  if (text.includes("return") || text.includes("momentum") || text.includes("growth")) return metrics.return1y;
  if (text.includes("debt") || text.includes("leverage")) return metrics.debtEquity;
  if (text.includes("revenue") || text.includes("sales")) return metrics.revenue;
  if (text.includes("market cap") || text.includes("mcap") || text.includes("size")) return metrics.marketCap;
  return metrics.return1y;
}

function rankRows(rows, metric, direction) {
  const sorted = rows.filter((row) => Number.isFinite(row[metric.key]));
  sorted.sort((a, b) => direction === "asc" ? a[metric.key] - b[metric.key] : b[metric.key] - a[metric.key]);
  return sorted;
}

function wireInteractiveCharts() {
  document.addEventListener("pointermove", (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target || !els.chartTooltip) return;
    els.chartTooltip.textContent = target.dataset.tip;
    els.chartTooltip.style.display = "block";
    els.chartTooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 280)}px`;
    els.chartTooltip.style.top = `${event.clientY + 14}px`;
  });
  document.addEventListener("pointerout", (event) => {
    if (event.target.closest?.("[data-tip]") && els.chartTooltip) els.chartTooltip.style.display = "none";
  });
  document.addEventListener("click", (event) => {
    const metricButton = event.target.closest?.("[data-sector-metric]");
    if (metricButton) {
      activeSectorMetric = metricButton.dataset.sectorMetric;
      renderSectorCharts();
      return;
    }
    const target = event.target.closest?.("[data-select]");
    const id = target?.dataset.select;
    if (id && dashboard.some((item) => item.meta.id === id)) {
      selectedId = id;
      render();
    }
  });
}

function table(headers, rows) {
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

async function search() {
  clearTimeout(searchTimer);
  const q = els.companySearch.value.trim();
  if (q.length < 2) {
    els.searchResults.style.display = "none";
    return;
  }
  searchTimer = setTimeout(async () => {
    const { results } = await getJson(`/api/search?q=${encodeURIComponent(q)}`);
    els.searchResults.innerHTML = results.map((row) => `<button data-symbol="${escapeHtml(row.symbol)}" data-name="${escapeHtml(row.longname || row.shortname || row.symbol)}">
      <strong>${escapeHtml(row.symbol)}</strong><br><small>${escapeHtml(row.longname || row.shortname || row.exchDisp || "")}</small>
    </button>`).join("");
    els.searchResults.style.display = results.length ? "block" : "none";
    els.searchResults.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => addCustom(button.dataset.symbol, button.dataset.name)));
  }, 250);
}

function addManual() {
  const raw = els.companySearch.value.trim().toUpperCase();
  if (!raw) return;
  const symbol = raw.includes(".") ? raw : `${raw}.NS`;
  addCustom(symbol, raw);
}

function addCustom(symbol, name) {
  const id = `custom-${symbol.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  if (!custom.some((item) => item.id === id) && !catalog.some((item) => item.symbol === symbol)) {
    custom.push({ id, name, symbol, nse: symbol.replace(".NS", ""), bse: "", segment: "Custom watchlist company" });
  }
  if (!watchIds.includes(id)) watchIds.push(id);
  selectedId = id;
  els.companySearch.value = "";
  els.searchResults.style.display = "none";
  save();
  refresh();
}

function removeCompany(id) {
  watchIds = watchIds.filter((item) => item !== id);
  if (selectedId === id) selectedId = watchIds[0];
  save();
  refresh();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

boot();
