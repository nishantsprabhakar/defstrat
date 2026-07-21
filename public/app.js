const defaults = ["zentec", "ideaforge", "mtar", "datapatterns", "azad", "aequs", "paras", "astra"];
const storeKey = "live-finance-tool-watchlist-v1";
const selectedStoreKey = `${storeKey}-selected`;
const removedDefaultIds = new Set(["beml", "bemlbo", "bemlns", "beml.bo", "beml.ns"]);

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
els.callSchedulePanel = document.querySelector("#callSchedulePanel");
els.comparisonPanel = document.querySelector("#comparisonPanel");
els.sectorNewsPanel = document.querySelector("#sectorNewsPanel");
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
const isRemovedDefault = (value) => removedDefaultIds.has(String(value || "").toLowerCase().replace(/[^a-z0-9.]/g, ""));
watchIds = watchIds.filter((id) => !isRemovedDefault(id));
custom = custom.filter((item) => !isRemovedDefault(item.id) && !isRemovedDefault(item.symbol) && !isRemovedDefault(item.nse));
const migratedToDefstratEight = localStorage.getItem(`${storeKey}-defstrat-eight`) === "true";
if (!migratedToDefstratEight) {
  watchIds = Array.from(new Set([...watchIds, ...defaults]));
  localStorage.setItem(`${storeKey}-defstrat-eight`, "true");
}
if (custom.length) {
  watchIds = Array.from(new Set([...watchIds, ...custom.map((item) => item.id).filter(Boolean)]));
}
localStorage.setItem(storeKey, JSON.stringify(watchIds));
localStorage.setItem(`${storeKey}-custom`, JSON.stringify(custom));
let dashboard = [];
let callSchedule = [];
let callScheduleRefreshedAt = "";
let selectedId = localStorage.getItem(selectedStoreKey) || watchIds[0];
let searchTimer;
let activeTab = "charts";
let activeSectorMetric = "revenue";
let activePriceRange = "1Y";
let sectorNewsFallback = [];
let sectorNewsLoading = false;
let sectorNewsFetchedAt = "";

const extraData = {
  zentec: { label: "Zen", focus: "Training simulators, anti-drone systems", revenue: 687.69, ebitda: 332.7, pat: 193.45, grossMargin: 69.3, patMargin: 28.1, ebitdaMargin: 48.37, roe: null, roa: null, roce: null, debtEquity: null, pe: null, pb: null, marketCap: null, eps: null, divYield: null, receivableDays: null, inventoryDays: null, payableDays: null, fcf: null, period: "FY26", source: "NSE/BSE Q4 FY26 investor presentation filed 3 May 2026", verdict: "Positive", oneLine: "High-growth defence electronics and simulation play with order visibility tied to domestic procurement." },
  ideaforge: { label: "ideaForge", focus: "UAVs and drone platforms", revenue: 226.1, ebitda: 27.1, pat: -17.0, grossMargin: 58.0, patMargin: -7.5, ebitdaMargin: 12.0, roe: null, roa: null, roce: null, debtEquity: null, pe: null, pb: null, marketCap: null, eps: null, divYield: null, receivableDays: null, inventoryDays: null, payableDays: null, fcf: null, period: "FY26", source: "NSE Q4 FY26 press release filed 30 Apr 2026", verdict: "Watch", oneLine: "Drone specialist with strategic relevance across surveillance, mapping and tactical use cases." },
  mtar: { label: "MTAR", focus: "Precision Engineering", revenue: 876.2, ebitda: 171.2, pat: 94.0, patMargin: 10.7, ebitdaMargin: 19.5, roe: null, roa: null, roce: null, debtEquity: null, pe: null, pb: null, marketCap: null, eps: null, divYield: null, receivableDays: null, inventoryDays: null, payableDays: null, fcf: null, period: "FY26", source: "Company Q4 FY26 results release / BSE filing dated 12 May 2026", verdict: "Constructive", oneLine: "High-precision components for defence, space and nuclear programmes." },
  datapatterns: { label: "Data", focus: "Defence electronics and radar systems", revenue: 924.8, ebitda: 371.0, pat: 271.4, grossMargin: 63.2, patMargin: 29.3, ebitdaMargin: 40.1, roe: 16.7, roa: 14.4, roce: 22.0, debtEquity: 0, debt: 5, cash: 422.7, pe: null, pb: null, marketCap: null, eps: 48.47, divYield: null, receivableDays: 287, inventoryDays: 294, payableDays: 82, fcf: null, period: "FY26", source: "Data Patterns Q4 FY26 earnings transcript / Screener FY26 consolidated ratios", verdict: "Positive", oneLine: "Electronics-led platform supplier with exposure to radar, EW and avionics programmes." },
  azad: { label: "Azad", focus: "Precision aerospace and turbine components", revenue: 602.98, ebitda: 225.31, pat: 133.56, patMargin: 22.1, ebitdaMargin: 37.4, roe: null, roa: null, roce: null, debtEquity: null, pe: null, pb: null, marketCap: null, eps: null, divYield: null, receivableDays: null, inventoryDays: null, payableDays: null, fcf: null, period: "FY26", source: "Audited FY26 consolidated results filed 15 May 2026", verdict: "Growth", oneLine: "Aerospace and turbine component platform with export-led precision manufacturing exposure." },
  aequs: { label: "Aequs", focus: "Aerospace precision components", revenue: 1230.4, ebitda: 154.5, pat: -113.3, patMargin: -9.2, ebitdaMargin: 12.6, roe: null, roa: null, roce: null, debtEquity: null, pe: null, pb: null, marketCap: null, eps: null, divYield: null, receivableDays: null, inventoryDays: null, payableDays: null, fcf: null, period: "FY26", source: "Company FY26 press release dated 26 May 2026", verdict: "Scale-up", oneLine: "Aerospace manufacturing platform tied to precision machining and supply-chain localization." },
  paras: { label: "Paras", focus: "Optics, defence electronics and space engineering", revenue: 476.57, ebitda: 120.46, pat: 89.46, patMargin: 18.8, ebitdaMargin: 25.3, roe: null, roa: null, roce: null, debtEquity: null, pe: null, pb: null, marketCap: null, eps: null, divYield: null, receivableDays: null, inventoryDays: null, payableDays: null, fcf: null, period: "FY26", source: "Company Q4 FY26 results release / BSE filing dated 13 May 2026", verdict: "Watch", oneLine: "Specialized defence and space engineering company with optics and electronics capabilities." },
  astra: { label: "Astra", focus: "RF, microwave and defence electronics", revenue: 1162.8, ebitda: 334.0, pat: 192.97, patMargin: 16.6, ebitdaMargin: 28.7, roe: null, roa: null, roce: 20.0, debtEquity: null, pe: null, pb: null, marketCap: null, eps: null, divYield: null, receivableDays: 216, inventoryDays: 394, payableDays: 73, fcf: 304, period: "FY26", source: "Company audited FY26 results presentation / Screener FY26 consolidated ratios", verdict: "Steady", oneLine: "RF and microwave electronics supplier for defence, space and meteorology applications." }
};

const years = ["FY21", "FY22", "FY23", "FY24", "FY25", "FY26"];
const peerMultipleYears = ["FY22", "FY23", "FY24", "FY25", "FY26"];

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

const businessDeepDives = {
  zentec: {
    lines: ["Counter-drone systems with detection, jamming and hard-kill options", "Training simulators for land forces, police and security agencies", "Emerging unmanned and autonomous products for tactical use"],
    customers: ["Indian defence forces", "State police and paramilitary users", "Export and security agencies"],
    drivers: ["Drone-warfare demand", "Indigenisation of training systems", "Order-book conversion from anti-drone and simulator programmes"],
    watch: ["Milestone-led revenue timing", "Receivable cycle", "Export execution and margin normalisation"],
    capabilities: "Product IP, R&D-led design, software, embedded electronics, field training content and systems integration."
  },
  ideaforge: {
    lines: ["Tactical UAV platforms", "Enterprise mapping and survey drones", "Payloads, ground-control software and service support"],
    customers: ["Defence and homeland security", "Survey, mining and infrastructure users", "International drone programmes"],
    drivers: ["Border surveillance", "US and export opportunity", "Repeat enterprise adoption beyond one-off tenders"],
    watch: ["Tender volatility", "Order replenishment after execution", "Gross margin and working-capital discipline"],
    capabilities: "In-house UAV design, autopilot software, payload integration, flight analytics and field deployment support."
  },
  mtar: {
    lines: ["Clean-energy assemblies", "Civil nuclear systems", "Aerospace and defence precision components"],
    customers: ["Clean-energy OEMs", "Nuclear and space programmes", "Global aerospace and defence customers"],
    drivers: ["Large FY27 clean-energy order inflows", "Integrated systems shift", "New aerospace customer additions"],
    watch: ["Customer concentration", "Greenfield facility timing", "Margin delivery against higher guidance"],
    capabilities: "High-tolerance machining, assemblies, special processes, clean-room execution and programme-qualified manufacturing."
  },
  datapatterns: {
    lines: ["Radar electronics", "Electronic warfare subsystems", "Avionics and space-grade electronics"],
    customers: ["Defence laboratories and PSUs", "Indian armed forces programmes", "Space and aerospace platforms"],
    drivers: ["High-value electronics indigenisation", "Radar and EW programme scaling", "Design-led operating leverage"],
    watch: ["Product mix sustainability", "Large programme acceptance timing", "Receivables and order inflow"],
    capabilities: "Design ownership, embedded systems, RF/electronics integration, testing and high-reliability production."
  },
  azad: {
    lines: ["Aerospace turbine parts", "Energy and industrial turbine components", "Customer-dedicated precision manufacturing"],
    customers: ["Global aerospace OEMs", "Energy turbine customers", "Long-cycle single-source programmes"],
    drivers: ["Facility ramp-up", "Multi-year rolling order book", "Qualification-led wallet-share expansion"],
    watch: ["Capacity absorption", "Customer qualification timelines", "Working capital and customer concentration"],
    capabilities: "Complex machining, hot-section component capability, customer-dedicated cells and quality-certified production."
  },
  aequs: {
    lines: ["Aerospace machining and assemblies", "Forging and special processing", "Consumer precision manufacturing"],
    customers: ["Global aerospace supply chains", "Consumer durable and precision customers", "Joint-venture ecosystem partners"],
    drivers: ["Aerospace utilisation", "Integrated ecosystem operating leverage", "Consumer vertical scale-up"],
    watch: ["Path to PAT profitability", "Consumer vertical losses", "Capacity utilisation and customer concentration"],
    capabilities: "Aerospace SEZ ecosystem, forging, treatment, machining, assembly and vertically integrated manufacturing."
  },
  paras: {
    lines: ["Defence optics and optronics", "Space engineering components", "EMP protection and defence electronics"],
    customers: ["Defence forces and PSUs", "Space-sector programmes", "Specialised electronics customers"],
    drivers: ["Optics indigenisation", "Space-sector demand", "Order-book conversion entering FY27"],
    watch: ["Quarterly execution lumpiness", "Receivables", "Margin sustainability across order mix"],
    capabilities: "Optics, optronics, high-reliability mechanical systems, EMP protection and niche defence electronics."
  },
  astra: {
    lines: ["RF and microwave modules", "Radar and telemetry electronics", "Space payload and communication systems"],
    customers: ["Defence and space programmes", "Radar, missile and EW platforms", "Meteorology and communication users"],
    drivers: ["Defence electronics programmes", "Space payload demand", "Order-book conversion across radar and missile systems"],
    watch: ["Execution timing", "Margin movement by programme mix", "Receivables and order concentration"],
    capabilities: "RF design, microwave modules, antenna subsystems, payload electronics, testing and programme integration."
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
      ["PAT", "Rs 193.45crs", "Rs 280.24crs", "FY26"],
      ["Order book", "Rs 1,336.04crs", "N/A", "As of 31 Mar 2026"]
    ]
  },
  ideaforge: {
    title: "ideaForge Technology earnings call summary",
    callDate: "May 2026",
    period: "Q4 FY26 and FY26",
    source: "Q4 FY26 transcript filing / investor materials",
    sections: [
      { heading: "Financial Performance", text: "ideaForge delivered a sharp Q4 FY26 recovery, with revenue of approximately Rs 141crs versus Rs 20.3crs in Q4 FY25. PAT was approximately Rs 60crs, implying a very high quarterly PAT margin of about 42.5%, helped by strong order conversion and operating leverage. For FY26, revenue from operations was Rs 226.10crs, EBITDA was Rs 27.10crs and PAT was negative Rs 17.0crs. The full-year point is important: Q4 was profitable, but FY26 PAT remained negative because earlier quarters were weak." },
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
      ["Revenue", "Rs 226.10crs", "Rs 161.20crs", "+40.3% YoY"],
      ["EBITDA", "Rs 27crs", "Not disclosed in current source", "FY26"],
      ["PAT", "Rs -17crs", "Not disclosed in current source", "FY26"],
      ["Borrowing", "Nil", "N/A", "Debt-free as of 31 Mar 2026"],
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
      ["Revenue", "Rs 924.8crs", "Rs 708.4crs", "+30.5% YoY"],
      ["Operational EBITDA", "Rs 371.0crs", "Rs 275.0crs", "FY26"],
      ["PAT", "Rs 271.4crs", "Rs 221.8crs", "FY26"]
    ]
  },
  azad: {
    title: "Azad Engineering earnings call summary",
    callDate: "16 May 2026",
    period: "Q4 FY26 and FY26",
    source: "Azad IR transcript page / Q4 FY26 call transcript",
    sections: [
      { heading: "Financial Performance", text: "Azad delivered a strong Q4 FY26, with revenue of approximately Rs 157crs, up 26.4% YoY. For FY26, audited consolidated revenue was Rs 602.98crs, EBITDA was Rs 225.31crs, and PAT was Rs 133.56crs, implying EBITDA margin of about 37.4% and PAT margin of about 22.1%. The audited consolidated full-year figures are used in the dashboard rather than rounded estimates." },
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
      ["Revenue", "Rs 602.98crs", "Not disclosed in current source", "FY26 audited consolidated"],
      ["EBITDA", "Rs 225.31crs", "Not disclosed in current source", "FY26 audited consolidated"],
      ["EBITDA margin", "37.4%", "Not disclosed in current source", "FY26 audited consolidated"],
      ["PAT", "Rs 133.56crs", "Not disclosed in current source", "FY26 audited consolidated"]
    ]
  },
  aequs: {
    title: "Aequs earnings call summary",
    callDate: "26 May 2026",
    period: "Q4 FY26 and FY26",
    quarterTitle: "Q4 FY26 Metrics",
    fullYearTitle: "FY26 Metrics",
    quarterHeaders: ["Metric", "Q4 FY26", "Q4 FY25", "Change"],
    fullYearHeaders: ["Metric", "FY26", "FY25", "Change"],
    source: "Company FY26 press release dated 26 May 2026",
    sections: [
      { heading: "Financial Performance", text: "Aequs reported FY26 revenue from operations of Rs 12,304mn, up 33% YoY from Rs 9,246mn in FY25. FY26 EBITDA was Rs 1,545mn, up 43% YoY, with EBITDA margin at 13%. PAT remained negative at Rs 1,133mn versus a loss of Rs 1,024mn in FY25. Q4 FY26 revenue was Rs 3,671mn, up 47% YoY, while Q4 EBITDA was Rs 321mn and Q4 PAT loss was Rs 541mn." },
      { heading: "Order Book and Pipeline", text: "The transcript did not provide a conventional order-book figure. For Aequs, the relevant pipeline indicator is programme ramp-up across aerospace and consumer verticals, plus utilisation across the integrated manufacturing ecosystem. Revenue conversion depends on customer schedules, qualification cycles and capacity absorption rather than a disclosed fixed order book." },
      { heading: "Segment Performance and Strategic Direction", text: "Aequs remains an integrated manufacturing ecosystem spanning aerospace machining, forging, special processing and adjacent precision manufacturing. FY26 shows that scale is improving, but profitability is still constrained by depreciation, finance cost, ramp-up expense and segment mix." },
      { heading: "FY27 Guidance", text: "Specific FY27 revenue guidance was not captured in the latest press release. The key monitor is whether FY26 revenue scale and EBITDA improvement convert into lower PAT losses or positive PAT as capacity utilisation improves." },
      { heading: "Key Positives from the Call", text: "FY26 revenue grew 33%, EBITDA grew 43%, and the company remained at meaningful scale with Rs 1,230.4crs of revenue. The aerospace ecosystem continues to offer operating-leverage potential if utilisation rises." },
      { heading: "Key Concerns and Watch Points", text: "PAT remains negative, Q4 PAT loss widened YoY, and Q4 EBITDA margin compressed to 9%. Investors should track utilisation, segment mix, debt/service cost, working capital and whether growth translates into bottom-line improvement." }
    ],
    q4: [
      ["Revenue", "Rs 3,671mn", "Rs 2,493mn", "+47% YoY"],
      ["EBITDA", "Rs 321mn", "Rs 416mn", "-23% YoY"],
      ["PAT", "Rs -541mn", "Rs 90mn", "Loss in Q4 FY26"]
    ],
    fy: [
      ["Revenue", "Rs 12,304mn", "Rs 9,246mn", "+33% YoY"],
      ["EBITDA", "Rs 1,545mn", "Rs 1,080mn", "+43% YoY"],
      ["PAT loss", "Rs -1,133mn", "Rs -1,024mn", "-11% YoY"]
    ]
  },
  paras: {
    title: "Paras Defence earnings call summary",
    callDate: "13 May 2026",
    period: "Q4 FY26 and FY26",
    source: "Q4 FY26 results release / FY26 investor presentation material",
    sections: [
      { heading: "Financial Performance", text: "Paras Defence reported Q4 FY26 revenue from operations of Rs 171.31crs, up 58.3% YoY from Rs 108.23crs. Consolidated EBITDA was Rs 42.6crs and PAT was Rs 38.88crs. For FY26, revenue from operations was Rs 476.57crs, EBITDA was Rs 120.46crs and PAT was Rs 89.46crs, implying FY26 EBITDA margin of about 25.3% and PAT margin of about 18.8%." },
      { heading: "Order Book and Pipeline", text: "Investor presentation/news sources indicate a consolidated order book close to Rs 986crs entering FY27. This is about two times FY26 revenue and gives visible execution cover, subject to delivery schedules. The key question is how quickly the company converts optics, defence engineering and space-related orders into revenue without diluting margins." },
      { heading: "Segment Performance and Strategic Direction", text: "The results reflect stronger execution in optics, defence electronics and space engineering. The strategic direction is aligned with defence indigenisation, anti-drone/optics opportunities and space-sector demand. FY26 profitability was healthy, but the dashboard now uses exact full-year figures rather than rounded approximations." },
      { heading: "FY27 Guidance", text: "Specific FY27 guidance was not captured in the source snippets. The investor framework should focus on order inflow, Rs 986crs order book conversion, margin sustainability and whether Q4's strong execution pace can continue." },
      { heading: "Key Positives from the Call", text: "Strong Q4 revenue growth, strong PAT growth, Rs 42.6crs Q4 EBITDA, FY26 revenue growth, order book visibility and exposure to optics/space/defence electronics. The Q4 print shows improved execution and operating leverage." },
      { heading: "Key Concerns and Watch Points", text: "Latest transcript link still needs direct confirmation, so the summary is based on results and presentation material. Quarterly revenue may remain lumpy, and investors should monitor order mix, receivables, execution timelines and whether FY26 margin levels sustain." }
    ],
    q4: [
      ["Revenue", "Rs 171.31crs", "Rs 108.23crs", "+58.3% YoY"],
      ["PAT", "Rs 38.88crs", "Not disclosed in current source", "+75% YoY"],
      ["EBITDA", "Rs 42.60crs", "Not disclosed in current source", "+51% YoY"]
    ],
    fy: [
      ["Revenue", "Rs 476.57crs", "Rs 364.66crs", "+30.7% YoY"],
      ["EBITDA", "Rs 120.46crs", "Not disclosed in current source", "FY26"],
      ["PAT", "Rs 89.46crs", "Rs 61.49crs", "+45.5% YoY"],
      ["Order book", "Approx. Rs 986crs", "N/A", "Entering FY27"]
    ]
  },
  astra: {
    title: "Astra Microwave earnings call summary",
    callDate: "26 May 2026",
    period: "Q4 FY26 and FY26",
    quarterTitle: "Q4 FY26 Metrics",
    fullYearTitle: "FY26 Metrics",
    quarterHeaders: ["Metric", "Q4 FY26", "Q4 FY25", "Change / note"],
    fullYearHeaders: ["Metric", "FY26", "FY25", "Change / note"],
    source: "Audited FY26 results / company result update dated 26 May 2026",
    sections: [
      { heading: "Financial Performance", text: "Astra Microwave reported FY26 sales of Rs 1,162.80crs versus Rs 1,051.18crs in FY25. FY26 PAT was Rs 192.97crs versus Rs 153.51crs in FY25, and FY26 operating margin was 28.70%. Q4 FY26 sales were Rs 488.24crs and Q4 PAT was Rs 105.98crs, reflecting a strong year-end execution quarter." },
      { heading: "Order Book and Pipeline", text: "The latest result update referenced a materially larger order book entering FY27. Order-book conversion remains the core support for the company's medium-term growth, but quarterly delivery can be milestone-led." },
      { heading: "Segment Performance and Strategic Direction", text: "The company remains focused on RF, microwave and defence electronics across defence, space and meteorology. Management expects to double turnover over three to four years, implying sustained order inflow and execution capacity. The long-term aspiration remains meaningfully larger than the current revenue base, but conversion will be milestone-led." },
      { heading: "FY27 Guidance", text: "Specific FY27 financial guidance was not changed in the verified result numbers used here. The monitor is order inflow, order conversion, margin consistency and working-capital discipline after a strong Q4 FY26." },
      { heading: "Key Positives from the Call", text: "Strong Q4 PAT, FY26 revenue growth, FY26 PAT growth and a healthy operating-margin profile. The business remains strategically positioned in RF, microwave, radar and space electronics." },
      { heading: "Key Concerns and Watch Points", text: "Execution of the large order book, quarterly mix, defence order timing, receivables and conversion of the longer-term growth aspiration into near-term revenue are the key watch points. The business is attractive but milestone timing can make quarterly numbers uneven." }
    ],
    q4: [
      ["Sales", "Rs 488.24crs", "Rs 407.85crs", "+20% YoY"],
      ["PAT", "Rs 105.98crs", "Rs 73.49crs", "+44.2% YoY"],
      ["Operating margin", "33.08%", "29.04%", "Q4 FY26"]
    ],
    fy: [
      ["Sales", "Rs 1,162.80crs", "Rs 1,051.18crs", "+11% YoY"],
      ["PAT", "Rs 192.97crs", "Rs 153.51crs", "+26% YoY"],
      ["Operating margin", "28.70%", "25.59%", "FY26"]
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
    date: "FY26 press release dated 26 May 2026",
    url: "https://www.aequs.com/wp-content/uploads/2026/05/Press-Release-for-May-26-2026.pdf",
    note: "Company-hosted FY26 result press release. Latest transcript should be summarised when the next call transcript is uploaded."
  },
  paras: {
    status: "Investor presentation available",
    date: "Q4 FY26 / FY26 presentation",
    url: "https://parasdefence.com/uploads/presentation/1779278288_paras-defence-investor-presentation-2026.pdf",
    note: "FY26 presentation material is used for the latest summary; a call transcript should replace it when uploaded by the company."
  },
  astra: {
    status: "FY26 results available",
    date: "Audited FY26 results dated 26 May 2026",
    url: "https://www.business-standard.com/markets/capital-market-news/astra-microwave-products-consolidated-net-profit-rises-44-21-in-the-march-2026-quarter-126052600667_1.html",
    note: "FY26 audited result figures are used for the latest summary; call transcript should replace the commentary when uploaded."
  }
};

const formatInr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatNum = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function save() {
  localStorage.setItem(storeKey, JSON.stringify(watchIds));
  localStorage.setItem(`${storeKey}-custom`, JSON.stringify(custom));
  localStorage.setItem(selectedStoreKey, selectedId || "");
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

function ratioPct(value) {
  return Number.isFinite(value) && value > 0 ? pct(value * 100) : "--";
}

function rupeesToCrores(value) {
  return Number.isFinite(value) ? value / 1e7 : NaN;
}

function sourceMetric(item, key, options = {}) {
  const extra = extraData[item?.meta?.id] || {};
  const mc = item?.moneycontrol?.latest || {};
  const f = item?.yahoo?.financials || {};
  if (Number.isFinite(extra[key])) {
    return { value: extra[key], period: extra.period || "FY26", source: "Company filing / investor release" };
  }
  if (key === "revenue") {
    if (Number.isFinite(mc.revenue)) return { value: mc.revenue, period: mc.period || "latest consolidated year", source: "Moneycontrol consolidated P&L" };
    if (Number.isFinite(f.revenue)) return { value: rupeesToCrores(f.revenue), period: "Yahoo latest", source: "Yahoo Finance" };
  }
  if (key === "pat" && Number.isFinite(mc.pat)) return { value: mc.pat, period: mc.period || "latest consolidated year", source: "Moneycontrol consolidated P&L" };
  if (["ebitda", "ebitdaMargin", "patMargin", "roe", "roa", "roce", "debtEquity"].includes(key) && Number.isFinite(mc[key])) {
    return { value: mc[key], period: mc.period || "latest consolidated year", source: "Moneycontrol / Yahoo fallback" };
  }
  if (key === "patMargin" && Number.isFinite(mc.pat) && Number.isFinite(mc.revenue) && mc.revenue > 0) {
    return { value: (mc.pat / mc.revenue) * 100, period: mc.period || "latest consolidated year", source: "Moneycontrol consolidated P&L" };
  }
  if (key === "ebitda" && Number.isFinite(f.ebitda)) return { value: rupeesToCrores(f.ebitda), period: "Yahoo latest", source: "Yahoo Finance" };
  if (key === "ebitdaMargin" && Number.isFinite(f.operatingMargins)) return { value: f.operatingMargins * 100, period: "Yahoo latest", source: "Yahoo Finance" };
  if (key === "grossMargin" && Number.isFinite(f.grossMargins)) return { value: f.grossMargins * 100, period: "Yahoo latest", source: "Yahoo Finance" };
  if (key === "patMargin" && Number.isFinite(f.profitMargins)) return { value: f.profitMargins * 100, period: "Yahoo latest", source: "Yahoo Finance" };
  if ((key === "debt" || key === "cash") && Number.isFinite(f[options.yahooKey])) {
    return { value: rupeesToCrores(f[options.yahooKey]), period: "Yahoo latest", source: "Yahoo Finance" };
  }
  return { value: NaN, period: extra.period || "latest", source: "Unavailable" };
}

function moneyCr(value) {
  return Number.isFinite(value) ? `Rs ${compact(value)}crs` : "--";
}

function fixed(value) {
  return Number.isFinite(value) ? formatNum.format(value) : "--";
}

function ratio(value) {
  return Number.isFinite(value) ? `${formatNum.format(value)}x` : "--";
}

function wcDayBundle(wc = {}) {
  return [wc.receivable, wc.inventory, wc.payable, wc.netCycle].map(fixed).join(" / ");
}

function hasSeriesData(values = []) {
  return values.some(Number.isFinite);
}

function chartCard(title, body, className = "") {
  return `<article class="chart-card ${className}">${chartTitle(title)}${body}</article>`;
}

function historicalMetricSeries(item, key) {
  const rowKeyMap = {
    ebitda: "ebitda",
    ebitdaMargin: "ebitdaMargin",
    pat: "pat",
    patMargin: "patMargin",
    revenue: "revenue",
    roe: "roe",
    roa: "roa",
    roce: "roce",
    fcf: "fcf",
    debtEquity: "debtEquity",
    totalAssets: "totalAssets",
    receivableDays: "receivableDays",
    inventoryDays: "inventoryDays",
    payableDays: "payableDays",
    debt: "debt",
    cash: "cash",
    shares: "shares"
  };
  const rowKey = rowKeyMap[key] || null;
  const mc = item?.moneycontrol;
  if (rowKey && mc?.available && Array.isArray(mc.years) && Array.isArray(mc.rows?.[rowKey])) {
    const byYear = new Map();
    mc.years.forEach((year, index) => {
      const match = String(year).match(/(\d{2})$/);
      if (match && Number.isFinite(mc.rows[rowKey][index])) byYear.set(`FY${match[1]}`, mc.rows[rowKey][index]);
    });
    const series = years.map((year) => byYear.has(year) ? byYear.get(year) : NaN);
    if (series.some(Number.isFinite)) return series;
  }
  return null;
}

function latestHistoricalValue(item, key) {
  const series = historicalMetricSeries(item, key);
  if (series) {
    const latest = [...series].reverse().find(Number.isFinite);
    if (Number.isFinite(latest)) return latest;
  }
  const latest = item?.moneycontrol?.latest?.[key];
  return Number.isFinite(latest) ? latest : NaN;
}

function liveMetric(item, key) {
  const extra = extraData[item?.meta?.id] || {};
  if (Number.isFinite(extra[key])) return extra[key];
  if (key === "marketCapCr") {
    if (Number.isFinite(extra.marketCap)) return extra.marketCap;
    return rupeesToCrores(item?.yahoo?.quote?.marketCap);
  }
  if (key === "pe") return valuationMetrics(extra, item).rawPe;
  if (key === "debtEquity") return sourceMetric(item, "debtEquity").value;
  if (key === "roe") {
    const fromSource = sourceMetric(item, "roe").value;
    if (Number.isFinite(fromSource)) return fromSource;
    const yahooRoe = item?.yahoo?.financials?.returnOnEquity;
    return Number.isFinite(yahooRoe) ? yahooRoe * 100 : NaN;
  }
  if (key === "roa") {
    const fromSource = sourceMetric(item, "roa").value;
    if (Number.isFinite(fromSource)) return fromSource;
    const pat = sourceMetric(item, "pat").value;
    const assets = latestHistoricalValue(item, "totalAssets");
    if (Number.isFinite(pat) && Number.isFinite(assets) && assets > 0) return (pat / assets) * 100;
    const roe = liveMetric(item, "roe");
    const debtEquity = liveMetric(item, "debtEquity");
    return Number.isFinite(roe) && Number.isFinite(debtEquity) ? roe / (1 + debtEquity) : NaN;
  }
  return sourceMetric(item, key).value;
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

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function customPlaceholder(item = {}) {
  return {
    meta: {
      id: item.id,
      name: item.name || item.symbol || "Custom company",
      symbol: item.symbol || "",
      nse: item.nse || String(item.symbol || "").replace(".NS", ""),
      bse: item.bse || "",
      segment: item.segment || "Custom watchlist company"
    },
    yahoo: {
      source: "Stored custom company",
      quote: {
        symbol: item.symbol || "",
        name: item.name || item.symbol || "Custom company",
        currency: "INR",
        exchange: "NSE",
        regularMarketPrice: null,
        regularMarketChange: null,
        regularMarketChangePercent: null,
        regularMarketTime: null,
        marketCap: null,
        volume: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        trailingPE: null,
        forwardPE: null,
        dividendYield: null,
        beta: null
      },
      financials: {
        revenue: null,
        grossMargins: null,
        operatingMargins: null,
        profitMargins: null,
        ebitda: null,
        totalDebt: null,
        totalCash: null,
        currentRatio: null,
        returnOnEquity: null,
        targetMeanPrice: null,
        incomeAnnual: [],
        incomeQuarterly: [],
        balanceAnnual: [],
        cashflowAnnual: [],
        earningsTrend: []
      }
    },
    moneycontrol: null,
    chart: [],
    bse: [],
    news: [],
    refreshedAt: new Date().toISOString(),
    unavailable: true
  };
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
    const data = known.length ? (await getJson(`/api/dashboard?ids=${encodeURIComponent(known.join(","))}`)).data : [];
    const customResults = await Promise.allSettled(customIds.map((id) => {
      const item = custom.find((x) => x.id === id);
      return getJson(`/api/company?id=${encodeURIComponent(item.id)}&symbol=${encodeURIComponent(item.symbol)}&bse=${encodeURIComponent(item.bse || "")}&name=${encodeURIComponent(item.name)}&nse=${encodeURIComponent(item.nse || item.symbol.replace(".NS", ""))}&segment=${encodeURIComponent(item.segment || "Custom watchlist company")}`);
    }));
    const customData = customResults.map((result, index) => {
      if (result.status === "fulfilled" && result.value?.meta?.id) return result.value;
      return customPlaceholder(custom.find((item) => item.id === customIds[index]));
    });
    dashboard = [...data, ...customData].filter(Boolean);
    await refreshCallSchedule();
    if (!dashboard.some((item) => item.meta.id === selectedId)) {
      selectedId = dashboard[0]?.meta.id;
      save();
    }
    render();
    els.marketStatus.textContent = "Live finance feeds connected";
    els.refreshStamp.textContent = `Updated ${new Date().toLocaleString()}`;
  } catch (error) {
    els.marketStatus.textContent = "Some live feeds are unavailable";
    els.refreshStamp.textContent = "The finance tool will retry automatically";
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
  if (!item?.meta) return years.map(() => NaN);
  const historical = historicalMetricSeries(item, key);
  if (historical) return historical;
  const extra = extraData[item.meta.id] || {};
  const resolved = sourceMetric(item, key);
  const latest = Number.isFinite(resolved.value) ? resolved.value : (Number.isFinite(extra[key]) ? extra[key] : NaN);
  if (!Number.isFinite(latest)) return years.map(() => NaN);
  const lastIndex = Math.max(years.length - 1, 1);
  if (key === "revenue") return years.map((_, i) => Math.max(0, latest * (0.38 + (i / lastIndex) * 0.62)));
  if (key === "pat") return years.map((_, i) => latest * (0.28 + (i / lastIndex) * 0.72));
  if (key === "fcf") return years.map((_, i) => latest * (0.2 + (i / lastIndex) * 0.8));
  if (key === "roce") return years.map((_, i) => Math.max(0, latest - (lastIndex - i) * 1.8));
  return years.map(() => latest);
}

function renderSectorSnapshot(avg) {
  const marketCaps = dashboard.map((item) => liveMetric(item, "marketCapCr")).filter(Number.isFinite);
  const peValues = dashboard.map((item) => liveMetric(item, "pe")).filter(Number.isFinite);
  const roeValues = dashboard.map((item) => liveMetric(item, "roe")).filter(Number.isFinite);
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
    a: activeSectorMetric === "roce" ? liveMetric(row.item, "roce") : sourceMetric(row.item, activeSectorMetric).value,
    b: activeSectorMetric === "revenue"
      ? sourceMetric(row.item, "pat").value
      : sourceMetric(row.item, "patMargin").value
  }));
  els.sectorCharts.innerHTML = `
    <article class="chart-card">${chartTitle("Revenue & PAT (latest consolidated source)")}<div class="chart-toolbar"><button class="${activeSectorMetric === "revenue" ? "is-active" : ""}" data-sector-metric="revenue">Revenue/PAT</button><button class="${activeSectorMetric === "ebitdaMargin" ? "is-active" : ""}" data-sector-metric="ebitdaMargin">EBITDA/PAT margin</button><button class="${activeSectorMetric === "roce" ? "is-active" : ""}" data-sector-metric="roce">ROCE/PAT margin</button></div>${barChart(metricRows, activeSectorMetric === "revenue" ? "Revenue" : activeSectorMetric === "roce" ? "ROCE" : "EBITDA margin", activeSectorMetric === "revenue" ? "PAT" : "PAT margin")}</article>
    <article class="chart-card">${chartTitle("Valuation vs Profitability (live / verified only)")} ${scatterChart(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, x: liveMetric(row.item, "pe"), y: sourceMetric(row.item, "patMargin").value })), "P/E", "PAT margin")}</article>
    <article class="chart-card wide">${chartTitle("1Y Price Return Heatmap")}${heatmap(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, value: oneYearReturn(row.item) })))}</article>
    <article class="chart-card">${chartTitle("ROE vs ROA")}${scatterChart(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, x: liveMetric(row.item, "roa"), y: liveMetric(row.item, "roe") })), "ROA", "ROE")}</article>
    <article class="chart-card">${chartTitle("Market Cap Treemap")}${treemap(rows.map((row) => ({ id: row.item.meta.id, label: row.extra.label || row.item.meta.nse, value: liveMetric(row.item, "marketCapCr") || 0 })))}</article>`;
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
      save();
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
      save();
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
      save();
      render();
    });
  });
}

function renderDetail() {
  const item = dashboard.find((d) => d.meta.id === selectedId) || dashboard[0];
  if (!item) return;
  const q = item.yahoo?.quote || {};
  const extra = extraData[item.meta.id] || {};
  const revenue = sourceMetric(item, "revenue");
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
    [`Revenue (${revenue.period})`, moneyCr(revenue.value)],
    [`P/E (${extra.period || "live"})`, Number.isFinite(extra.pe) ? `${formatNum.format(extra.pe)}x` : compact(q.trailingPE)],
    ["Financial source", revenue.source],
    ["Quote source", item.yahoo?.source || "Live feed"]
  ];
  els.fundamentals.innerHTML = metrics.map(([label, value]) => `<div><small>${label}</small><strong>${value}</strong></div>`).join("");
  renderInsights(item);
}

function renderChart(points) {
  const filteredPoints = filterPricePoints(points, activePriceRange);
  document.querySelectorAll("[data-price-range]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.priceRange === activePriceRange);
  });
  if (!filteredPoints.length) {
    els.chart.innerHTML = `<text x="28" y="130" fill="#9ea99c">No chart data returned by Yahoo Finance.</text>`;
    return;
  }
  const w = 720;
  const h = 260;
  const padX = 34;
  const top = 30;
  const bottom = 226;
  const chartW = w - padX * 2;
  const chartH = bottom - top;
  const values = filteredPoints.map((p) => p.close).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lowPoint = filteredPoints.find((point) => point.close === min) || filteredPoints[0];
  const highPoint = filteredPoints.find((point) => point.close === max) || filteredPoints[0];
  const first = filteredPoints[0];
  const last = filteredPoints.at(-1);
  const rangeMove = first?.close ? ((last.close - first.close) / first.close) * 100 : NaN;
  const span = max - min || 1;
  const xFor = (index) => padX + (index / Math.max(filteredPoints.length - 1, 1)) * chartW;
  const yFor = (value) => bottom - ((value - min) / span) * chartH;
  const d = filteredPoints.map((p, i) => {
    const x = xFor(i);
    const y = yFor(p.close);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const area = `${d} L${xFor(filteredPoints.length - 1).toFixed(1)} ${bottom} L${padX} ${bottom} Z`;
  const maxVolume = Math.max(...filteredPoints.map((p) => p.volume || 0), 1);
  const hoverStep = chartW / Math.max(filteredPoints.length - 1, 1);
  const hoverZones = filteredPoints.map((p, index) => {
    const x = xFor(index);
    const y = yFor(p.close);
    const date = formatEpochDate(p.time, { day: "2-digit", month: "short", year: "2-digit" });
    const volumeHeight = Math.max(1, ((p.volume || 0) / maxVolume) * 34);
    const rangeStart = Math.max(padX, x - hoverStep / 2);
    const rangeWidth = index === filteredPoints.length - 1 ? Math.max(6, w - padX - rangeStart) : Math.max(6, hoverStep);
    const calloutX = x > w - 178 ? x - 146 : x + 10;
    const calloutY = y < 76 ? y + 14 : y - 56;
    const tip = `${date}: close ${money(p.close)}, volume ${compact(p.volume)}, ${activePriceRange} move ${pct(rangeMove)}`;
    return `<g class="price-hover-zone">
      <rect data-tip="${escapeHtml(tip)}" x="${rangeStart.toFixed(1)}" y="${top}" width="${rangeWidth.toFixed(1)}" height="${chartH}" fill="transparent"/>
      <line class="price-crosshair" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${top}" y2="${bottom}" stroke="#d9b45f" stroke-width="1" stroke-dasharray="3 4"/>
      <circle class="price-focus" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#d9b45f" stroke="#0c100d" stroke-width="2"/>
      <g class="price-callout">
        <rect x="${calloutX.toFixed(1)}" y="${calloutY.toFixed(1)}" width="136" height="42" rx="7" fill="rgba(8,10,8,.92)" stroke="rgba(217,180,95,.55)"/>
        <text x="${(calloutX + 9).toFixed(1)}" y="${(calloutY + 17).toFixed(1)}" fill="#f3f5ee" font-size="10">${escapeHtml(date)}</text>
        <text x="${(calloutX + 9).toFixed(1)}" y="${(calloutY + 32).toFixed(1)}" fill="#d9b45f" font-size="11">${escapeHtml(money(p.close))}</text>
      </g>
      <rect x="${Math.max(padX, x - 1.5).toFixed(1)}" y="${(bottom - volumeHeight).toFixed(1)}" width="3" height="${volumeHeight.toFixed(1)}" fill="rgba(119,199,213,.22)"/>
    </g>`;
  }).join("");
  const firstDate = formatEpochDate(first.time, { month: "short", year: "2-digit" });
  const lastDate = formatEpochDate(last.time, { month: "short", year: "2-digit" });
  const yTicks = [min, (min + max) / 2, max];
  const xTicks = [0, Math.floor((filteredPoints.length - 1) / 2), filteredPoints.length - 1]
    .filter((value, index, list) => list.indexOf(value) === index);
  els.chart.innerHTML = `
    <defs>
      <linearGradient id="lineGlow" x1="0" x2="1"><stop stop-color="#77c7d5"/><stop offset="1" stop-color="#d9b45f"/></linearGradient>
      <linearGradient id="priceArea" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#77c7d5" stop-opacity=".28"/><stop offset="1" stop-color="#77c7d5" stop-opacity="0"/></linearGradient>
    </defs>
    ${yTicks.map((tick) => `<line class="grid-line" x1="${padX}" x2="${w - padX}" y1="${yFor(tick)}" y2="${yFor(tick)}"/><text x="${padX - 6}" y="${yFor(tick) + 4}" text-anchor="end" fill="#9ea99c" font-size="10">${escapeHtml(money(tick))}</text>`).join("")}
    <line class="axis-line" x1="${padX}" x2="${w - padX}" y1="${bottom}" y2="${bottom}"/>
    <line class="axis-line" x1="${padX}" x2="${padX}" y1="${top}" y2="${bottom}"/>
    <path d="${area}" fill="url(#priceArea)"/>
    <path d="${d}" fill="none" stroke="rgba(119,199,213,.18)" stroke-width="12" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="url(#lineGlow)" stroke-width="3" stroke-linecap="round"/>
    ${hoverZones}
    <circle class="chart-mark" data-tip="${escapeHtml(`Range high: ${money(max)} on ${formatEpochDate(highPoint.time)}`)}" cx="${xFor(filteredPoints.indexOf(highPoint)).toFixed(1)}" cy="${yFor(max).toFixed(1)}" r="5" fill="#65d08c"/>
    <circle class="chart-mark" data-tip="${escapeHtml(`Range low: ${money(min)} on ${formatEpochDate(lowPoint.time)}`)}" cx="${xFor(filteredPoints.indexOf(lowPoint)).toFixed(1)}" cy="${yFor(min).toFixed(1)}" r="5" fill="#ff7b7b"/>
    <circle class="chart-mark" data-tip="${escapeHtml(`Latest close: ${money(last.close)} on ${formatEpochDate(last.time)}`)}" cx="${xFor(filteredPoints.length - 1).toFixed(1)}" cy="${yFor(last.close).toFixed(1)}" r="6" fill="#d9b45f" stroke="#0c100d" stroke-width="2"/>
    <text class="axis-label" x="30" y="22">Y: Price</text>
    <text class="axis-label" x="${w - padX}" y="248" text-anchor="end">X: Date</text>
    ${xTicks.map((tick) => `<text x="${xFor(tick).toFixed(1)}" y="242" text-anchor="${tick === 0 ? "start" : tick === filteredPoints.length - 1 ? "end" : "middle"}" fill="#9ea99c" font-size="10">${escapeHtml(formatEpochDate(filteredPoints[tick].time, { month: "short", day: "2-digit" }))}</text>`).join("")}
    <text x="44" y="50" fill="#9ea99c">${escapeHtml(activePriceRange)} close</text>
    <text x="44" y="68" fill="#f3f5ee" font-size="15">${money(last.close)}</text>
    <text x="44" y="86" class="${moveClass(rangeMove)}" font-size="12">${pct(rangeMove)} over range</text>
    <text x="592" y="46" fill="#65d08c">High ${money(max)}</text>
    <text x="592" y="66" fill="#ff7b7b">Low ${money(min)}</text>`;
}

function filterPricePoints(points, range) {
  const valid = (points || []).filter((point) => Number.isFinite(point.close) && Number.isFinite(point.time));
  if (!valid.length || range === "1Y") return valid;
  const last = valid.at(-1).time * 1000;
  const day = 24 * 60 * 60 * 1000;
  if (range === "1M") return valid.filter((point) => point.time * 1000 >= last - 31 * day);
  if (range === "3M") return valid.filter((point) => point.time * 1000 >= last - 93 * day);
  if (range === "6M") return valid.filter((point) => point.time * 1000 >= last - 186 * day);
  if (range === "YTD") {
    const start = new Date(new Date(last).getFullYear(), 0, 1).getTime();
    return valid.filter((point) => point.time * 1000 >= start);
  }
  return valid;
}

function formatEpochDate(time, options = { day: "2-digit", month: "short", year: "2-digit" }) {
  return new Date(time * 1000).toLocaleDateString(undefined, options);
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
    source: "Finance note",
    link: null
  }));
  return [...yahooRows, ...bseRows, ...staticRows].slice(0, limit);
}

function renderSectorNews() {
  if (!els.sectorNewsPanel) return;
  const rows = collectSectorNewsRows();
  if (!rows.length && !sectorNewsLoading) {
    fetchSectorNewsFallback();
  }
  const checkedAt = sectorNewsFetchedAt || new Date().toISOString();
  els.sectorNewsPanel.innerHTML = `<div class="info-grid">
    <article class="brief-card">
      <small>Auto refresh</small>
      <strong>Latest sector news across tracked companies</strong>
      <p>News is rebuilt from the live dashboard feed every refresh and falls back to a dedicated sector-news endpoint. It updates automatically when sources publish new articles, at least daily.</p>
    </article>
    <article class="brief-card">
      <small>Last checked</small>
      <strong>${new Date(checkedAt).toLocaleString()}</strong>
      <p>Sources include Yahoo Finance news and Google News RSS surfaced through the backend company feeds.</p>
    </article>
  </div>
  <div class="news-grid">${rows.length ? rows.map(newsCard).join("") : `<div class="empty">${sectorNewsLoading ? "Refreshing sector news..." : "No sector news has been returned yet. The dashboard will check again on the next refresh."}</div>`}</div>`;
}

function collectSectorNewsRows() {
  const seen = new Set();
  return [
    ...dashboard.flatMap((item) => {
    const company = item.meta.name;
    return (item.news || []).map((row) => ({
      company,
      dateRaw: row.date,
      date: formatDate(row.date),
      title: row.title || "Market news",
      detail: newsDetail(row),
      source: row.publisher || row.source || "Live news",
      link: row.link
    }));
    }),
    ...sectorNewsFallback.map((row) => ({
      company: row.company || row.symbol || "Tracked company",
      dateRaw: row.date,
      date: formatDate(row.date),
      title: row.title || "Market news",
      detail: newsDetail(row),
      source: row.publisher || row.source || "Live news",
      link: row.link
    }))
  ].filter((row) => {
    const key = `${row.title}`.toLowerCase().replace(/\W+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => {
    const aTime = Date.parse(a.dateRaw || "");
    const bTime = Date.parse(b.dateRaw || "");
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  }).slice(0, 18);
}

function newsCard(row) {
  return `<article class="news-card">
    <small>${escapeHtml(row.date)} &middot; ${escapeHtml(row.company)} &middot; ${escapeHtml(row.source)}</small>
    <strong>${escapeHtml(row.title)}</strong>
    <p>${escapeHtml(row.detail)}</p>
    ${row.link ? `<a href="${row.link}" target="_blank" rel="noreferrer">Open article</a>` : ""}
  </article>`;
}

async function fetchSectorNewsFallback() {
  sectorNewsLoading = true;
  try {
    const known = watchIds.filter((id) => catalog.some((company) => company.id === id));
    const suffix = known.length ? `?ids=${encodeURIComponent(known.join(","))}` : "";
    const result = await getJson(`/api/sector-news${suffix}`);
    sectorNewsFallback = Array.isArray(result.news) ? result.news : [];
    sectorNewsFetchedAt = result.refreshedAt || new Date().toISOString();
  } catch {
    sectorNewsFallback = [];
    sectorNewsFetchedAt = new Date().toISOString();
  } finally {
    sectorNewsLoading = false;
    if (activeTab === "sectorNews" || els.sectorNewsPanel?.innerHTML.includes("Refreshing sector news")) {
      renderSectorNews();
    }
  }
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
  renderCallSchedule();
  renderComparison();
  renderSectorNews();
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
  const deep = businessDeepDives[selected.meta.id] || {
    lines: [selected.meta.segment || "Company-specific business line"],
    customers: ["Listed company investors", "Operating customers to be added"],
    drivers: ["Live quote monitoring", "Upcoming filings and investor updates"],
    watch: ["Data availability", "Execution and working capital"],
    capabilities: selected.meta.segment || "Capability profile will appear here once added."
  };
  const q = selected.yahoo?.quote || {};
  const f = selected.yahoo?.financials || {};
  const valuation = valuationMetrics(extra, selected);
  const revenueMetric = sourceMetric(selected, "revenue");
  const grossMetric = sourceMetric(selected, "grossMargin");
  const ebitdaMetric = sourceMetric(selected, "ebitdaMargin");
  const patMetric = sourceMetric(selected, "patMargin");
  const debtMetric = sourceMetric(selected, "debt", { yahooKey: "totalDebt" });
  const cashMetric = sourceMetric(selected, "cash", { yahooKey: "totalCash" });
  const period = extra.period || revenueMetric.period || "latest period";
  const sourceList = Array.from(new Set([revenueMetric.source, grossMetric.source, ebitdaMetric.source, patMetric.source, debtMetric.source, cashMetric.source].filter((source) => source && source !== "Unavailable")));
  const financialRows = [
    [`Revenue (${revenueMetric.period})`, moneyCr(revenueMetric.value)],
    [`Gross margin (${grossMetric.period})`, Number.isFinite(grossMetric.value) ? pct(grossMetric.value) : "--"],
    [`EBITDA margin (${ebitdaMetric.period})`, Number.isFinite(ebitdaMetric.value) ? pct(ebitdaMetric.value) : "--"],
    [`PAT margin (${patMetric.period})`, Number.isFinite(patMetric.value) ? pct(patMetric.value) : "--"],
    [`ROCE (${period})`, Number.isFinite(liveMetric(selected, "roce")) ? pct(liveMetric(selected, "roce")) : "--"],
    [`Debt (${debtMetric.period})`, moneyCr(debtMetric.value)],
    [`Cash (${cashMetric.period})`, moneyCr(cashMetric.value)],
    [`D/E (${period})`, ratio(liveMetric(selected, "debtEquity"))],
    [`EV/Revenue (${period})`, valuation.evRevenue],
    [`EV/EBITDA (${period})`, valuation.evEbitda],
    [`P/E (${period})`, valuation.pe !== "--" ? valuation.pe : (Number.isFinite(q.trailingPE) ? `${formatNum.format(q.trailingPE)}x` : "--")],
    ["1Y return", pct(oneYearReturn(selected))]
  ];
  els.businessPanel.innerHTML = `<div class="business-layout">
    <article class="business-hero">
      <div>
        <small>${escapeHtml(selected.meta.nse || selected.meta.symbol)} &middot; ${escapeHtml(extra.focus || selected.meta.segment || "Defence platform")}</small>
        <strong>${escapeHtml(selected.meta.name)}</strong>
        <p>${escapeHtml(profile.description)}</p>
        <div class="business-tags">
          ${deep.lines.slice(0, 3).map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
        </div>
      </div>
      <div class="business-visual" aria-hidden="true">${productPhoto(profile.products[0] || { name: selected.meta.name, icon: "grid" }, selected.meta.id, "hero")}</div>
    </article>

    <article class="brief-card">
      <small>Business model</small>
      <strong>How the company makes money</strong>
      <p>${escapeHtml(profile.model)}</p>
      <div class="business-kpis">
        <div><small>Live price</small><strong>${money(q.regularMarketPrice)}</strong></div>
        <div><small>Day move</small><strong class="${moveClass(q.regularMarketChangePercent)}">${pct(q.regularMarketChangePercent)}</strong></div>
        <div><small>Market cap</small><strong>${Number.isFinite(liveMetric(selected, "marketCapCr")) ? `Rs ${compact(liveMetric(selected, "marketCapCr"))}crs` : "--"}</strong></div>
      </div>
    </article>

    <article class="brief-card">
      <small>Business lines</small>
      <strong>Revenue engine</strong>
      ${detailList(deep.lines)}
    </article>

    <article class="brief-card">
      <small>Customers and end markets</small>
      <strong>Demand channels</strong>
      ${detailList(deep.customers)}
    </article>

    <article class="brief-card">
      <small>Capabilities</small>
      <strong>What differentiates the company</strong>
      <p>${escapeHtml(deep.capabilities)}</p>
    </article>

    <article class="brief-card">
      <small>Key financials</small>
      <strong>Operating snapshot (${escapeHtml(period)})</strong>
      ${table(["Metric", "Value"], financialRows.map(([label, value]) => [escapeHtml(label), escapeHtml(value)]))}
      <p class="fine-print">Source priority: company filings first, then Moneycontrol consolidated P&L or Yahoo Finance where filing data is unavailable. Current sources: ${escapeHtml(sourceList.join(", ") || extra.source || "Unavailable")}.</p>
    </article>

    <article class="brief-card">
      <small>Shareholding snapshot</small>
      <strong>Ownership mix</strong>
      ${shareholdingChart(profile.shareholding)}
      <p class="fine-print">Model snapshot for dashboard analysis. Reconcile with the latest exchange shareholding filing before investment use.</p>
    </article>

    <article class="brief-card">
      <small>Growth drivers</small>
      <strong>What can move the business</strong>
      ${detailList(deep.drivers)}
    </article>

    <article class="brief-card">
      <small>Risks and monitoring</small>
      <strong>What to track</strong>
      ${detailList(deep.watch)}
    </article>

    <article class="brief-card business-products">
      <small>Key products</small>
      <strong>Product picture gallery and capability map</strong>
      <div class="product-grid">${profile.products.map((product, index) => `<div class="product-card">
        <div class="product-photo">${productPhoto(product, selected.meta.id, index)}</div>
        <div class="product-copy">
          <strong>${escapeHtml(product.name)}</strong>
          <p>${escapeHtml(product.detail)}</p>
        </div>
      </div>`).join("")}</div>
    </article>
  </div>`;
}

function detailList(items = []) {
  return `<ul class="detail-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function valuationMetrics(extra = {}, item = null) {
  const revenueMetric = item ? sourceMetric(item, "revenue") : { value: Number(extra.revenue) };
  const ebitdaMetric = item ? sourceMetric(item, "ebitda") : { value: Number(extra.ebitda) };
  const revenue = Number.isFinite(revenueMetric.value) ? revenueMetric.value : Number(extra.revenue);
  const ebitda = Number.isFinite(ebitdaMetric.value) ? ebitdaMetric.value : revenue * (Number(extra.ebitdaMargin) / 100);
  const enterpriseValue = Number.isFinite(extra.enterpriseValue)
    ? Number(extra.enterpriseValue)
    : currentEnterpriseValueCr(item, extra);
  const rawEvRevenue = Number.isFinite(enterpriseValue) && revenue > 0 ? enterpriseValue / revenue : NaN;
  const rawEvEbitda = Number.isFinite(enterpriseValue) && ebitda > 0 ? enterpriseValue / ebitda : NaN;
  const patMetric = item ? sourceMetric(item, "pat") : { value: Number(extra.pat) };
  const rawPe = Number.isFinite(extra.pe)
    ? Number(extra.pe)
    : Number.isFinite(item?.yahoo?.quote?.trailingPE)
      ? Number(item.yahoo.quote.trailingPE)
      : Number.isFinite(currentMarketCapCr(item, extra)) && patMetric.value > 0
        ? currentMarketCapCr(item, extra) / patMetric.value
        : NaN;
  return {
    rawEvRevenue,
    rawEvEbitda,
    rawPe: Number.isFinite(rawPe) ? rawPe : NaN,
    evRevenue: Number.isFinite(rawEvRevenue) ? `${formatNum.format(rawEvRevenue)}x` : "--",
    evEbitda: Number.isFinite(rawEvEbitda) ? `${formatNum.format(rawEvEbitda)}x` : "--",
    pe: Number.isFinite(rawPe) ? `${formatNum.format(rawPe)}x` : "--"
  };
}

function currentMarketCapCr(item, extra = {}) {
  if (Number.isFinite(extra.marketCap)) return Number(extra.marketCap);
  const quoted = rupeesToCrores(item?.yahoo?.quote?.marketCap);
  if (Number.isFinite(quoted)) return quoted;
  const price = Number(item?.yahoo?.quote?.regularMarketPrice);
  const shares = latestHistoricalValue(item, "shares");
  return Number.isFinite(price) && Number.isFinite(shares) ? rupeesToCrores(price * shares) : NaN;
}

function currentEnterpriseValueCr(item, extra = {}) {
  if (Number.isFinite(extra.enterpriseValue)) return Number(extra.enterpriseValue);
  const marketCap = currentMarketCapCr(item, extra);
  if (!Number.isFinite(marketCap)) return NaN;
  const debt = Number.isFinite(extra.debt) ? extra.debt : latestHistoricalValue(item, "debt");
  const cash = Number.isFinite(extra.cash) ? extra.cash : latestHistoricalValue(item, "cash");
  return marketCap + (Number.isFinite(debt) ? debt : 0) - (Number.isFinite(cash) ? cash : 0);
}

function seriesValueForYear(item, key, fiscalYear) {
  const series = historicalMetricSeries(item, key);
  const index = years.indexOf(fiscalYear);
  if (series && index >= 0 && Number.isFinite(series[index])) return series[index];
  const extra = extraData[item?.meta?.id] || {};
  if ((extra.period || "") === fiscalYear && Number.isFinite(extra[key])) return extra[key];
  return NaN;
}

function peerTrailingMultipleRows() {
  return dashboard.flatMap((item) => {
    const extra = extraData[item.meta.id] || {};
    const marketCap = currentMarketCapCr(item, extra);
    const enterpriseValue = currentEnterpriseValueCr(item, extra);
    return peerMultipleYears.map((fiscalYear) => {
      const revenue = seriesValueForYear(item, "revenue", fiscalYear);
      const ebitda = seriesValueForYear(item, "ebitda", fiscalYear);
      const pat = seriesValueForYear(item, "pat", fiscalYear);
      return {
        id: item.meta.id,
        company: item.meta.name,
        label: `${extra.label || item.meta.nse} ${fiscalYear}`,
        fiscalYear,
        source: item.moneycontrol?.source || extra.source || "Live fallback source",
        evRevenue: Number.isFinite(enterpriseValue) && revenue > 0 ? enterpriseValue / revenue : NaN,
        evEbitda: Number.isFinite(enterpriseValue) && ebitda > 0 ? enterpriseValue / ebitda : NaN,
        pe: Number.isFinite(marketCap) && pat > 0 ? marketCap / pat : NaN
      };
    });
  });
}

function latestPeerMultipleRow(item) {
  const extra = extraData[item.meta.id] || {};
  const revenue = sourceMetric(item, "revenue");
  const ebitda = sourceMetric(item, "ebitda");
  const pat = sourceMetric(item, "pat");
  const valuation = valuationMetrics(extra, item);
  const period = revenue.period || ebitda.period || pat.period || extra.period || "latest";
  const sources = [revenue.source, ebitda.source, pat.source]
    .filter((source) => source && source !== "Unavailable");
  return {
    id: item.meta.id,
    company: item.meta.name,
    label: extra.label || item.meta.nse,
    fiscalYear: period,
    source: sources[0] || extra.source || "Live Yahoo / Moneycontrol fallback",
    evRevenue: valuation.rawEvRevenue,
    evEbitda: valuation.rawEvEbitda,
    pe: valuation.rawPe
  };
}

function latestPeerMultipleTableRows() {
  return dashboard.map(latestPeerMultipleRow);
}

function latestPeerMultipleRows() {
  return dashboard.map((item) => {
    const row = latestPeerMultipleRow(item);
    return {
      id: item.meta.id,
      label: row.label,
      values: [row.evRevenue, row.evEbitda, row.pe]
    };
  });
}

function workingCapitalMetrics(extra = {}, item = null) {
  const receivable = Number.isFinite(extra.receivableDays)
    ? extra.receivableDays
    : Number.isFinite(extra.debtorDays)
      ? extra.debtorDays
      : latestHistoricalValue(item, "receivableDays");
  const inventory = Number.isFinite(extra.inventoryDays) ? extra.inventoryDays : latestHistoricalValue(item, "inventoryDays");
  const payable = Number.isFinite(extra.payableDays) ? extra.payableDays : latestHistoricalValue(item, "payableDays");
  const netCycle = [receivable, inventory, payable].every(Number.isFinite) ? receivable + inventory - payable : NaN;
  return { receivable, inventory, payable, netCycle };
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

function productPhoto(product = {}, id = "", variant = 0) {
  const type = product.icon || "grid";
  const title = escapeHtml(product.name || "Product");
  const seed = escapeHtml(`${id}-${type}-${variant}`);
  const scenes = {
    drone: `<g transform="translate(54 54)"><path d="M-78 2h156M0-58v116M-44-36l88 72M44-36l-88 72" stroke="#e6edf0" stroke-width="5"/><circle cx="-78" cy="2" r="22" fill="#101812" stroke="#77c7d5" stroke-width="6"/><circle cx="78" cy="2" r="22" fill="#101812" stroke="#77c7d5" stroke-width="6"/><circle cx="0" cy="-58" r="22" fill="#101812" stroke="#d9b45f" stroke-width="6"/><circle cx="0" cy="58" r="22" fill="#101812" stroke="#d9b45f" stroke-width="6"/><rect x="-22" y="-17" width="44" height="34" rx="8" fill="#dfe8e4"/></g>`,
    radar: `<g transform="translate(138 128)" fill="none" stroke-linecap="round"><path d="M-78 50h156M0 50V-44" stroke="#e6edf0" stroke-width="7"/><path d="M-50 10a72 72 0 0 1 100 0M-76-18a108 108 0 0 1 152 0" stroke="#77c7d5" stroke-width="7"/><circle cx="0" cy="-48" r="15" fill="#d9b45f" stroke="#fff" stroke-width="4"/></g>`,
    target: `<g transform="translate(140 124)" fill="none"><circle r="72" stroke="#77c7d5" stroke-width="7"/><circle r="44" stroke="#d9b45f" stroke-width="7"/><circle r="16" fill="#e8f0ec"/><path d="M-100 0h62M38 0h62M0-100v62M0 38v62" stroke="#e8f0ec" stroke-width="5"/></g>`,
    aircraft: `<g transform="translate(130 128) rotate(-12)" fill="#e7ece7"><path d="M-98 14L92-54 32 72 4 16-62 54z"/><path d="M4 16l28 56" fill="none" stroke="#77c7d5" stroke-width="8"/></g>`,
    gear: `<g transform="translate(140 124)" fill="none" stroke-linecap="round"><circle r="42" stroke="#d9b45f" stroke-width="11"/><circle r="18" fill="#e8f0ec"/><path d="M0-82v25M0 57v25M-82 0h25M57 0h25M-58-58l18 18M40 40l18 18M58-58L40-40M-40 40l-18 18" stroke="#77c7d5" stroke-width="9"/></g>`,
    energy: `<g transform="translate(140 126)"><path d="M16-98L-54 8h50l-18 88L70-26H12z" fill="#d9b45f" stroke="#fff" stroke-width="5"/></g>`,
    camera: `<g transform="translate(140 126)"><rect x="-78" y="-40" width="156" height="92" rx="18" fill="#e8f0ec"/><path d="M-38-40l16-22h48l16 22" fill="#c7d6d2"/><circle r="34" fill="#101812"/><circle r="18" fill="#77c7d5"/></g>`,
    turbine: `<g transform="translate(140 126)" fill="#e8f0ec"><circle r="17" fill="#d9b45f"/><path d="M0-17c23-68 88-36 50 16C38 15 18 12 0-17z"/><path d="M15 9c68 23 36 88-16 50C-15 47-12 27 15 9z"/><path d="M-9 15c-23 68-88 36-50-16C-47-15-27-12-9 15z"/><path d="M-15-9c-68-23-36-88 16-50C15-47 12-27-15-9z"/></g>`,
    factory: `<g transform="translate(140 128)" fill="#e8f0ec"><path d="M-94 62H94v-92L42 2v-32L-10 2v-60h-84z"/><rect x="-66" y="18" width="34" height="44" fill="#101812"/><rect x="-6" y="20" width="20" height="16" fill="#77c7d5"/><rect x="38" y="20" width="20" height="16" fill="#d9b45f"/></g>`,
    lens: `<g transform="translate(140 126)" fill="none"><circle r="72" stroke="#e8f0ec" stroke-width="9"/><circle r="36" stroke="#77c7d5" stroke-width="8"/><path d="M-46-46l92 92M46-46l-92 92" stroke="#d9b45f" stroke-width="7"/></g>`,
    satellite: `<g transform="translate(140 126)" fill="none" stroke-linecap="round"><rect x="-24" y="-24" width="48" height="48" rx="7" fill="#e8f0ec"/><path d="M-38-38l-66-52M38 38l66 52M38-38l66-52M-38 38l-66 52" stroke="#77c7d5" stroke-width="7"/><path d="M-116-102l42 34M116-102L74-68M-116 102l42-34M116 102L74 68" stroke="#d9b45f" stroke-width="7"/></g>`,
    shield: `<g transform="translate(140 126)"><path d="M0-94l80 28v58c0 54-31 90-80 112-49-22-80-58-80-112v-58z" fill="#e8f0ec"/><path d="M-34 8l25 25 52-62" fill="none" stroke="#65d08c" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    signal: `<g transform="translate(140 126)" fill="none" stroke-linecap="round"><path d="M-82 68h164M-50 68V10M0 68v-98M50 68V-8" stroke="#e8f0ec" stroke-width="11"/><path d="M-92-62c61-38 123-38 184 0M-58-26c39-24 77-24 116 0" stroke="#77c7d5" stroke-width="7"/></g>`,
    grid: `<g transform="translate(140 126)" fill="#e8f0ec"><rect x="-72" y="-72" width="58" height="58" rx="12"/><rect x="14" y="-72" width="58" height="58" rx="12"/><rect x="-72" y="14" width="58" height="58" rx="12"/><rect x="14" y="14" width="58" height="58" rx="12"/></g>`
  };
  return `<svg class="product-picture" viewBox="0 0 280 190" role="img" aria-label="${title} product picture">
    <defs>
      <linearGradient id="photo-${seed}" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#18231d"/><stop offset=".56" stop-color="#102029"/><stop offset="1" stop-color="#5a4720"/>
      </linearGradient>
      <radialGradient id="flare-${seed}" cx=".78" cy=".18" r=".52">
        <stop stop-color="#77c7d5" stop-opacity=".45"/><stop offset="1" stop-color="#77c7d5" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="280" height="190" rx="16" fill="url(#photo-${seed})"/>
    <rect width="280" height="190" rx="16" fill="url(#flare-${seed})"/>
    <path d="M0 154c48-28 83-25 128-10 51 17 89 14 152-24v70H0z" fill="rgba(217,180,95,.18)"/>
    <g opacity=".18" stroke="#f3f5ee"><path d="M18 36h244M18 78h244M18 120h244"/><path d="M42 18v150M96 18v150M150 18v150M204 18v150"/></g>
    ${scenes[type] || scenes.grid}
  </svg>`;
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
  const revenueSeries = seededSeries(selected, "revenue");
  const patSeries = seededSeries(selected, "pat");
  const roceSeries = seededSeries(selected, "roce");
  const fcfSeries = seededSeries(selected, "fcf");
  const ebitdaMarginSeries = seededSeries(selected, "ebitdaMargin");
  const patMarginSeries = seededSeries(selected, "patMargin");
  const marginRows = years.map((year, index) => ({
    id: selected?.meta.id,
    label: year,
    a: ebitdaMarginSeries[index],
    b: patMarginSeries[index]
  }));
  const valuationRows = dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const valuation = valuationMetrics(extra, item);
    return { id: item.meta.id, label: extra.label || item.meta.nse, values: [valuation.rawEvRevenue, valuation.rawEvEbitda, valuation.rawPe] };
  });
  const wcRows = dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const wc = workingCapitalMetrics(extra, item);
    return { id: item.meta.id, label: extra.label || item.meta.nse, values: [wc.receivable, wc.inventory, wc.payable, wc.netCycle] };
  });
  const chartCards = [
    hasSeriesData(revenueSeries) ? chartCard("Revenue Growth Trajectory", lineChart(years, revenueSeries, "Revenue")) : "",
    hasSeriesData(patSeries) ? chartCard("PAT Growth Trajectory", lineChart(years, patSeries, "PAT")) : "",
    marginRows.some((row) => Number.isFinite(row.a) || Number.isFinite(row.b)) ? chartCard("EBITDA vs PAT Margins", barChart(marginRows, "EBITDA", "PAT")) : "",
    hasSeriesData(roceSeries) ? chartCard("Return on Capital Employed (ROCE)", lineChart(years, roceSeries, "ROCE")) : "",
    hasSeriesData(fcfSeries) ? chartCard("Free Cash Flow Generation", lineChart(years, fcfSeries, "FCF")) : "",
    valuationRows.some((row) => hasSeriesData(row.values)) ? chartCard("Peer Valuation Multiples", groupedBarChart(valuationRows, ["EV/Revenue", "EV/EBITDA", "P/E"], "Multiple (x)"), "wide") : "",
    wcRows.some((row) => hasSeriesData(row.values)) ? chartCard("Working Capital - Receivable, Inventory, Payable & Net WC Cycle", groupedBarChart(wcRows, ["Receivable days", "Inventory days", "Payable days", "Net WC cycle"], "Days"), "wide") : ""
  ].filter(Boolean).join("");
  const rows = dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const valuation = valuationMetrics(extra, item);
    const wc = workingCapitalMetrics(extra, item);
    const revenue = sourceMetric(item, "revenue");
    const ebitdaMargin = sourceMetric(item, "ebitdaMargin");
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong><br><small>${escapeHtml(revenue.period || extra.period || "latest")} &middot; ${escapeHtml(revenue.source || extra.focus || item.meta.segment)}</small>`,
      money(item.yahoo?.quote?.regularMarketPrice),
      `<span class="${moveClass(oneYearReturn(item))}">${pct(oneYearReturn(item))}</span>`,
      Number.isFinite(liveMetric(item, "roce")) ? pct(liveMetric(item, "roce")) : "--",
      Number.isFinite(ebitdaMargin.value) ? pct(ebitdaMargin.value) : "--",
      valuation.evRevenue,
      valuation.evEbitda,
      valuation.pe,
      Number.isFinite(liveMetric(item, "fcf")) ? `\u20b9${compact(liveMetric(item, "fcf"))} Cr` : "--",
      wcDayBundle(wc)
    ];
  });
  els.historicalPanel.innerHTML = `<div class="chart-grid">
    ${chartCards || `<article class="chart-card wide">${chartTitle("Historical Financial Series")}<div class="empty">No complete historical filing-backed series is available for ${escapeHtml(selected.meta.name)} yet.</div></article>`}
  </div>` + table([
    "Company / period", "Live price", "1Y return", "ROCE", "EBITDA margin", "EV/Revenue", "EV/EBITDA", "P/E", "FCF", "Receivable / Inventory / Payable / Net WC days"
  ], rows);
}

function renderEarnings() {
  if (!els.earningsPanel) return;
  els.earningsPanel.innerHTML = `<p class="empty">Structured IC-grade summaries with YoY comparisons, consensus placeholders, latest filings and IC verdict.</p>
    <div class="earnings-grid">${dashboard.map((item) => {
      const extra = extraData[item.meta.id] || {};
      const q = item.yahoo?.quote || {};
      const filing = item.bse?.[0];
      const revenue = sourceMetric(item, "revenue");
      const patMargin = sourceMetric(item, "patMargin");
      return `<details class="earnings-card">
        <summary>${escapeHtml(item.meta.name)} &middot; ${escapeHtml(revenue.period || extra.period || "Live")}</summary>
        <div class="body">
          <div class="fundamentals">
            <div><small>Revenue (${escapeHtml(revenue.period || "latest")})</small><strong>${Number.isFinite(revenue.value) ? `\u20b9${compact(revenue.value)} Cr` : "--"}</strong></div>
            <div><small>PAT margin (${escapeHtml(patMargin.period || "latest")})</small><strong>${Number.isFinite(patMargin.value) ? pct(patMargin.value) : "--"}</strong></div>
            <div><small>1Y return</small><strong>${pct(oneYearReturn(item))}</strong></div>
            <div><small>IC verdict</small><strong>${escapeHtml(extra.verdict || "Watch")}</strong></div>
          </div>
          <p>${escapeHtml(extra.oneLine || item.meta.segment)}</p>
          <p>Financial source: ${escapeHtml(revenue.source || "Unavailable")} for revenue; ${escapeHtml(patMargin.source || "Unavailable")} for PAT margin.</p>
          <p>Latest quote: ${money(q.regularMarketPrice)} (${pct(q.regularMarketChangePercent)}). Consensus data is shown as unavailable when Yahoo's protected statement modules do not return it.</p>
          <p>${filing ? `<a href="${filing.attachment || `https://www.bseindia.com/corporates/ann.html`}" target="_blank" rel="noreferrer">${escapeHtml(filing.title || "Latest BSE filing")}</a>` : `<a href="https://www.bseindia.com/corporates/ann.html" target="_blank" rel="noreferrer">BSE filings (${escapeHtml(item.meta.bse || "code")})</a>`} &middot; <a href="https://finance.yahoo.com/quote/${item.meta.symbol}" target="_blank" rel="noreferrer">Yahoo Finance</a></p>
        </div>
      </details>`;
    }).join("")}</div>`;
}

function filingMetricRows(item) {
  const extra = extraData[item.meta.id] || {};
  const period = extra.period || "FY26";
  const rows = [
    ["Revenue", Number.isFinite(extra.revenue) ? moneyCr(extra.revenue) : "--", period],
    ["EBITDA", Number.isFinite(extra.ebitda) ? moneyCr(extra.ebitda) : "--", period],
    ["EBITDA margin", Number.isFinite(extra.ebitdaMargin) ? pct(extra.ebitdaMargin) : "--", period],
    ["PAT", Number.isFinite(extra.pat) ? moneyCr(extra.pat) : "--", period],
    ["PAT margin", Number.isFinite(extra.patMargin) ? pct(extra.patMargin) : "--", period],
    ["Gross margin", Number.isFinite(extra.grossMargin) ? pct(extra.grossMargin) : "--", period],
    ["Debt", Number.isFinite(extra.debt) ? moneyCr(extra.debt) : "--", period],
    ["Cash", Number.isFinite(extra.cash) ? moneyCr(extra.cash) : "--", period]
  ].filter((row) => row[1] !== "--");
  return rows.length ? rows.map((row) => [...row, extra.source || "Company filing / investor release"]) : [["Filing metrics", "Awaiting filing-backed metric set", period, extra.source || "Company filing / investor release"]];
}

function liveCallSummary(item) {
  const revenue = sourceMetric(item, "revenue");
  const ebitdaMargin = sourceMetric(item, "ebitdaMargin");
  const pat = sourceMetric(item, "pat");
  const patMargin = sourceMetric(item, "patMargin");
  const latest = liveNewsRows(item, 1)[0];
  const metricBits = [
    Number.isFinite(revenue.value) ? `revenue ${moneyCr(revenue.value)}` : "",
    Number.isFinite(pat.value) ? `PAT ${moneyCr(pat.value)}` : "",
    Number.isFinite(ebitdaMargin.value) ? `EBITDA margin ${pct(ebitdaMargin.value)}` : "",
    Number.isFinite(patMargin.value) ? `PAT margin ${pct(patMargin.value)}` : ""
  ].filter(Boolean);
  return {
    title: `${item.meta.name} live earnings summary`,
    period: revenue.period || "Latest available period",
    callDate: latest?.date || "Latest live update",
    sections: [
      {
        heading: "Financial Performance",
        text: metricBits.length
          ? `${revenue.period || "Latest available period"} metrics from live fallback sources: ${metricBits.join(", ")}.`
          : "No full financial metric set has been returned yet; the dashboard will continue refreshing Yahoo Finance and available public sources."
      },
      {
        heading: "Latest Filing / News Signal",
        text: latest ? `${latest.source}: ${latest.title}. ${latest.detail}` : "No relevant live news or filing item has been returned yet."
      },
      {
        heading: "Investor Watch Points",
        text: "Track revenue trend, margin direction, leverage, cash generation, working-capital movement, share-price reaction and any new exchange filings."
      }
    ]
  };
}

function renderCallSummary() {
  if (!els.callSummaryPanel) return;
  const selected = dashboard.find((item) => item.meta.id === selectedId) || dashboard[0];
  if (!selected) return;
  const summary = callSummaries[selected.meta.id] || liveCallSummary(selected);
  const note = callSummaries[selected.meta.id] ? "" : `<div class="empty">No dedicated earnings-call transcript template is stored for ${escapeHtml(selected.meta.name)} yet. Showing a live-source summary that refreshes with Yahoo/news data.</div>`;
  const filingRows = filingMetricRows(selected);
  els.callSummaryPanel.innerHTML = `<article class="brief-card call-summary-card">
    ${note}
    <small>${escapeHtml(summary.period)} &middot; Call date/period: ${escapeHtml(summary.callDate)} &middot; Refreshed every minute; replaced when a newer transcript is available for the followed company.</small>
    <strong>${escapeHtml(summary.title)}</strong>
    ${summary.sections.map((section) => `<div class="call-section"><h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.text)}</p></div>`).join("")}
    <div class="call-section"><h3>Company filing financial metrics</h3>${table(["Metric", "Value", "Period", "Source"], filingRows)}</div>
    <details class="transcript-monitor">
      <summary>Automatic transcript monitor</summary>
      <div id="autoCallSummary" class="empty">Checking for newer transcript uploads...</div>
    </details>
  </article>`;
  if (catalog.some((item) => item.id === selected.meta.id)) {
    refreshCallSummary(selected.meta.id);
  } else {
    const target = document.querySelector("#autoCallSummary");
    if (target) target.innerHTML = "Automatic transcript monitoring is available for the default tracked universe. For custom companies, this tab refreshes live Yahoo/news data and any BSE code you add in Manage.";
  }
}

function customScheduleParam() {
  const rows = custom
    .filter((item) => watchIds.includes(item.id))
    .map((item) => [item.id, item.symbol, item.bse || "", item.name, item.nse || item.symbol.replace(".NS", "")]
      .map((part) => encodeURIComponent(part || ""))
      .join("~"));
  return rows.length ? `&custom=${encodeURIComponent(rows.join("|"))}` : "";
}

async function refreshCallSchedule() {
  try {
    const ids = dashboard.map((item) => item.meta.id).join(",");
    if (!ids) {
      callSchedule = [];
      return;
    }
    const result = await getJson(`/api/call-schedule?ids=${encodeURIComponent(ids)}${customScheduleParam()}`);
    callSchedule = Array.isArray(result.schedules) ? result.schedules : [];
    callScheduleRefreshedAt = result.refreshedAt || new Date().toISOString();
  } catch (error) {
    callSchedule = dashboard.map((item) => ({
      companyId: item.meta.id,
      company: item.meta.name,
      symbol: item.meta.nse || item.meta.symbol,
      callDate: "-",
      period: "-",
      eventType: "-",
      status: "Schedule refresh failed",
      source: "-",
      title: error.message
    }));
    callScheduleRefreshedAt = new Date().toISOString();
  }
}

function renderCallSchedule() {
  if (!els.callSchedulePanel) return;
  const scheduleById = new Map(callSchedule.map((row) => [row.companyId, row]));
  const rows = dashboard.map((item) => {
    const schedule = scheduleById.get(item.meta.id) || {};
    const date = schedule.callDate && schedule.callDate !== "-" ? schedule.callDate : "-";
    const source = schedule.source && schedule.source !== "-" && schedule.link
      ? `<a href="${escapeHtml(schedule.link)}" target="_blank" rel="noreferrer">${escapeHtml(schedule.source)}</a>`
      : escapeHtml(schedule.source || "-");
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong><br><small>${escapeHtml(item.meta.nse || item.meta.symbol || "")}</small>`,
      escapeHtml(date),
      escapeHtml(schedule.period || "-"),
      escapeHtml(schedule.eventType || "-"),
      escapeHtml(schedule.status || (date === "-" ? "Not announced" : "Announced")),
      source
    ];
  });
  els.callSchedulePanel.innerHTML = `<article class="brief-card">
    <small>Upcoming schedule tracker</small>
    <strong>Upcoming results and earnings call dates</strong>
    <p>Refreshed automatically on every dashboard refresh. Only future announced calendar dates from BSE/Yahoo/news signals are shown; where a date is not announced, the table shows "-".${callScheduleRefreshedAt ? ` Last checked ${escapeHtml(formatDate(callScheduleRefreshedAt))}.` : ""}</p>
  </article>${table(["Company", "Date", "Period", "Event", "Status", "Source"], rows)}`;
}

async function refreshCallSummary(id) {
  const target = document.querySelector("#autoCallSummary");
  if (!target) return;
  try {
    const { summary, candidates } = await getJson(`/api/transcript-summary?id=${encodeURIComponent(id)}`);
    const latest = summary?.latestSource;
    const sections = (summary?.sections || []).map((section) => `<div class="ai-response-item">
      <strong>${escapeHtml(section.heading)}</strong>
      <p>${escapeHtml(section.text)}</p>
    </div>`).join("");
    target.className = "ai-response-list";
    target.innerHTML = `<div class="ai-response-item">
      <strong>Automatic transcript monitor</strong>
      <p>${latest ? `Latest detected source: ${escapeHtml(latest.date || "date unavailable")} - ${escapeHtml(latest.title)}.` : "No newer transcript-like filing detected yet."} ${candidates?.length ? `${candidates.length} candidate source(s) checked.` : "The backend will keep checking BSE/news feeds."}</p>
    </div>${sections}`;
  } catch (error) {
    target.innerHTML = `Automatic transcript monitor is active, but the latest check failed: ${escapeHtml(error.message)}`;
  }
}

function renderComparison() {
  if (!els.comparisonPanel) return;
  const peerRows = latestPeerMultipleTableRows();
  const peerTableRows = peerRows.map((row) => [
    `<strong>${escapeHtml(row.company)}</strong><br><small>${escapeHtml(row.fiscalYear)} trailing &middot; ${escapeHtml(row.source)}</small>`,
    ratio(row.evRevenue),
    ratio(row.evEbitda),
    ratio(row.pe)
  ]);
  els.comparisonPanel.innerHTML = `<div class="chart-grid">
    <article class="chart-card wide">${chartTitle("Latest Trailing Peer Valuation Multiples")}${groupedBarChart(latestPeerMultipleRows(), ["EV/Revenue", "EV/EBITDA", "P/E"], "Multiple (x)")}</article>
    <article class="chart-card">${chartTitle("Profitability vs Leverage")}${scatterChart(dashboard.map((item) => ({ id: item.meta.id, label: extraData[item.meta.id]?.label || item.meta.nse, x: liveMetric(item, "debtEquity"), y: sourceMetric(item, "patMargin").value })), "D/E", "PAT margin")}</article>
  </div>
  <article class="brief-card">
    <small>Latest trailing peer comps</small>
    <strong>EV/Revenue, EV/EBITDA and P/E by latest available FY</strong>
    <p>Multiples use current enterprise value or market cap against the latest available consolidated revenue, EBITDA and PAT for each company. Company FY26 filings are used first; gaps fall back to Moneycontrol or Yahoo Finance.</p>
    ${table(["Company / latest FY basis", "EV/Revenue", "EV/EBITDA", "P/E"], peerTableRows)}
  </article>` + table([
    "Company / period", "Focus", "Revenue", "EV/Revenue", "EV/EBITDA", "P/E", "PAT margin", "ROE", "D/E", "Commentary"
  ], dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const valuation = valuationMetrics(extra, item);
    const revenue = sourceMetric(item, "revenue");
    const patMargin = sourceMetric(item, "patMargin");
    return [
      `<strong>${escapeHtml(item.meta.name)}</strong><br><small>${escapeHtml(revenue.period || extra.period || "latest")} &middot; ${escapeHtml(revenue.source || "Unavailable")}</small>`,
      escapeHtml(extra.focus || item.meta.segment || ""),
      Number.isFinite(revenue.value) ? `\u20b9${compact(revenue.value)} Cr` : "--",
      valuation.evRevenue,
      valuation.evEbitda,
      valuation.pe,
      Number.isFinite(patMargin.value) ? pct(patMargin.value) : "--",
      Number.isFinite(liveMetric(item, "roe")) ? pct(liveMetric(item, "roe")) : "--",
      ratio(liveMetric(item, "debtEquity")),
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
  <div class="ai-box"><input id="aiPrompt" placeholder="Ask about latest prices, Yahoo news, BSE filings, valuations or comparisons"><button id="aiAskBtn">Ask Finance AI</button></div>
  <article class="brief-card" id="aiAnswer"><small>Analyst response</small><p>Choose a prompt or ask a question. Finance AI refreshes company filing, Yahoo Finance, Moneycontrol consolidated P&L, BSE and current news context before answering.</p></article>`;
  document.querySelectorAll("[data-ai-prompt]").forEach((button) => button.addEventListener("click", () => answerAi(button.dataset.aiPrompt)));
  document.querySelector("#aiAskBtn")?.addEventListener("click", () => answerAi(document.querySelector("#aiPrompt")?.value || ""));
}

function renderManage() {
  if (!els.managePanel) return;
  els.managePanel.innerHTML = `<div class="brief-grid">
    <article class="brief-card"><small>AI analyst settings</small><strong>Backend AI enabled</strong><p>Finance AI calls the server for company filing, Yahoo Finance, Moneycontrol consolidated P&L, BSE, news and transcript context. It uses OpenAI when configured, then Pollinations AI, then a deterministic live-data fallback.</p></article>
    <article class="brief-card"><small>Tracked companies</small><strong>${watchIds.length}</strong><p>${watchIds.map((id) => escapeHtml(metaFor(id)?.name || id)).join(", ")}</p></article>
    <article class="brief-card"><small>Data sources</small><strong>Filings + Yahoo + Moneycontrol + BSE</strong><p>Quote history comes from Yahoo Finance. Financial fallback uses Moneycontrol consolidated P&L or Yahoo only when filing data is unavailable. Filings and presentations link back to BSE where available.</p></article>
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
    renderAiResponse("Ask Finance AI", [{ heading: "Ready", body: "Ask for a company, metric, comparison, latest price, news, BSE filing, or earnings-call summary." }]);
    return;
  }
  answer.innerHTML = `<small>Searching live sources</small><p>Refreshing Yahoo Finance quote/chart data, live internet news and BSE filing context before answering...</p>`;
  const hasCustomTarget = custom.some((item) => item.id === selectedId) || (wantsAllCompanies(normalized) && custom.length);
  try {
    if (hasCustomTarget) throw new Error("Use local custom-company context");
    const result = await postJson("/api/ai", {
      prompt,
      selectedId,
      ids: watchIds
    });
    const modeLabel = result.mode === "openai" ? "OpenAI backend" : result.mode === "pollinations" ? "Pollinations AI" : "live-data fallback";
    renderAiText(`Finance AI (${modeLabel}) - ${formatDate(result.refreshedAt)}`, result.answer);
    return;
  } catch {
    answer.innerHTML = `<small>Live local context</small><p>Using the current dashboard data for custom-company coverage.</p>`;
  }
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
    title = `Finance view`;
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

function renderAiText(title, text) {
  const answer = document.querySelector("#aiAnswer");
  if (!answer) return;
  const lines = String(text || "").split(/\n+/).map((line) => line.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
  const cards = lines.length ? lines.map((line) => `<div class="ai-response-item">
    <p>${escapeHtml(line)}</p>
  </div>`).join("") : `<div class="empty">No response generated.</div>`;
  answer.innerHTML = `<small>${escapeHtml(title)}</small><div class="ai-response-list">${cards}</div>`;
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
      const fresh = await getJson(`/api/company?id=${encodeURIComponent(item.meta.id)}&symbol=${encodeURIComponent(item.meta.symbol)}&bse=${encodeURIComponent(item.meta.bse || "")}&name=${encodeURIComponent(item.meta.name)}&nse=${encodeURIComponent(item.meta.nse || item.meta.symbol?.replace(".NS", ""))}&segment=${encodeURIComponent(item.meta.segment || "Custom watchlist company")}`);
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
  addCustom(symbol, name || ticker, { bse, segment: subsector || "Custom watchlist company" });
}

function chartTitle(text) {
  return `<h3>${escapeHtml(text)}</h3>`;
}

function chartLabel(label) {
  const text = String(label || "");
  return text.length > 9 ? `${text.slice(0, 8)}...` : text;
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
    const tip = `${row.label}: ${labelA} ${compact(row.a)}, ${labelB} ${compact(row.b)}`;
    const first = Number.isFinite(row.a)
      ? `<rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x}" y="${yFor(row.a)}" width="16" height="${190 - yFor(row.a)}" rx="4" fill="#77c7d5"/>`
      : "";
    const second = Number.isFinite(row.b)
      ? `<rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x + 20}" y="${yFor(row.b)}" width="16" height="${190 - yFor(row.b)}" rx="4" fill="#d9b45f"/>`
      : "";
    return `${first}${second}<text x="${x + 18}" y="216" text-anchor="middle" fill="#9ea99c" font-size="10">${escapeHtml(chartLabel(row.label))}</text>`;
  }).join("");
  const grid = yTicks.map((tick) => `<line class="grid-line" x1="45" x2="590" y1="${yFor(tick)}" y2="${yFor(tick)}"/><text x="38" y="${yFor(tick) + 4}" text-anchor="end" fill="#9ea99c" font-size="10">${compact(tick)}</text>`).join("");
  return `<svg viewBox="0 0 620 250"><text class="axis-label" x="45" y="20">Y: ${escapeHtml(labelA)} / ${escapeHtml(labelB)}</text><text class="axis-label" x="575" y="238" text-anchor="end">X: Company</text>${grid}<line class="axis-line" x1="45" x2="590" y1="190" y2="190"/><line class="axis-line" x1="45" x2="45" y1="36" y2="190"/><circle cx="452" cy="18" r="5" fill="#77c7d5"/><text x="462" y="22" fill="#cdd5ca" font-size="11">${escapeHtml(labelA)}</text><circle cx="530" cy="18" r="5" fill="#d9b45f"/><text x="540" y="22" fill="#cdd5ca" font-size="11">${escapeHtml(labelB)}</text>${bars}</svg>`;
}

function groupedBarChart(rows, labels, yLabel) {
  const colors = ["#77c7d5", "#d9b45f", "#65d08c", "#ff7b7b"];
  const values = rows.flatMap((row) => row.values || []).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  const group = 535 / Math.max(rows.length, 1);
  const barCount = Math.max(labels.length, 1);
  const yFor = (value) => 196 - (Math.max(value, 0) / max) * 138;
  const yTicks = [0, max / 2, max];
  const legendLabel = (label) => String(label).replace(" days", "").replace(" cycle", "");
  const grid = yTicks.map((tick) => `<line class="grid-line" x1="52" x2="592" y1="${yFor(tick)}" y2="${yFor(tick)}"/><text x="45" y="${yFor(tick) + 4}" text-anchor="end" fill="#9ea99c" font-size="10">${compact(tick)}</text>`).join("");
  const legend = labels.map((label, index) => {
    const x = 242 + (index % 4) * 86;
    const y = 18 + Math.floor(index / 4) * 15;
    return `<circle cx="${x}" cy="${y - 4}" r="5" fill="${colors[index % colors.length]}"/><text x="${x + 10}" y="${y}" fill="#cdd5ca" font-size="9">${escapeHtml(legendLabel(label))}</text>`;
  }).join("");
  const bars = rows.map((row, i) => {
    const x = 56 + i * group;
    const w = Math.max(6, Math.min(10, (group - 12) / barCount));
    const gap = 2;
    const tip = labels.map((label, index) => `${label} ${compact(row.values?.[index])}`).join(", ");
    const series = labels.map((label, index) => {
      const value = row.values?.[index];
      const height = Number.isFinite(value) ? 196 - yFor(value) : 0;
      const y = Number.isFinite(value) ? yFor(value) : 196;
      return `<rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(`${row.label}: ${tip}`)}" x="${x + index * (w + gap)}" y="${y}" width="${w}" height="${height}" rx="3" fill="${colors[index % colors.length]}"/>`;
    }).join("");
    return `${series}<text x="${x + ((barCount - 1) * (w + gap)) / 2}" y="220" text-anchor="middle" fill="#9ea99c" font-size="10">${escapeHtml(chartLabel(row.label))}</text>`;
  }).join("");
  return `<svg viewBox="0 0 620 260">
    <text class="axis-label" x="52" y="20">Y: ${escapeHtml(yLabel)}</text>
    <text class="axis-label" x="590" y="246" text-anchor="end">X: Company</text>
    ${grid}
    <line class="axis-line" x1="52" x2="592" y1="196" y2="196"/>
    <line class="axis-line" x1="52" x2="52" y1="52" y2="196"/>
    <g class="chart-legend">${legend}</g>
    ${bars}
  </svg>`;
}

function tripleBarChart(rows, labelA, labelB, labelC) {
  const values = rows.flatMap((row) => [row.a, row.b, row.c]).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  const group = 535 / Math.max(rows.length, 1);
  const yFor = (value) => 196 - (Math.max(value, 0) / max) * 142;
  const yTicks = [0, max / 2, max];
  const grid = yTicks.map((tick) => `<line class="grid-line" x1="52" x2="592" y1="${yFor(tick)}" y2="${yFor(tick)}"/><text x="45" y="${yFor(tick) + 4}" text-anchor="end" fill="#9ea99c" font-size="10">${compact(tick)}</text>`).join("");
  const bars = rows.map((row, i) => {
    const x = 56 + i * group;
    const w = Math.max(8, Math.min(12, group / 5));
    const gap = 3;
    const tip = `${row.label}: ${labelA} ${compact(row.a)}, ${labelB} ${compact(row.b)}, ${labelC} ${compact(row.c)}`;
    const hA = 196 - yFor(row.a);
    const hB = 196 - yFor(row.b);
    const hC = 196 - yFor(row.c);
    return `<rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x}" y="${yFor(row.a)}" width="${w}" height="${hA}" rx="3" fill="#77c7d5"/>
      <rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x + w + gap}" y="${yFor(row.b)}" width="${w}" height="${hB}" rx="3" fill="#d9b45f"/>
      <rect class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(tip)}" x="${x + (w + gap) * 2}" y="${yFor(row.c)}" width="${w}" height="${hC}" rx="3" fill="#65d08c"/>
      <text x="${x + w + gap}" y="220" text-anchor="middle" fill="#9ea99c" font-size="10">${escapeHtml(chartLabel(row.label))}</text>`;
  }).join("");
  return `<svg viewBox="0 0 620 260">
    <text class="axis-label" x="52" y="20">Y: Days</text>
    <text class="axis-label" x="590" y="246" text-anchor="end">X: Company</text>
    ${grid}
    <line class="axis-line" x1="52" x2="592" y1="196" y2="196"/>
    <line class="axis-line" x1="52" x2="52" y1="48" y2="196"/>
    <g class="chart-legend">
      <circle cx="318" cy="18" r="5" fill="#77c7d5"/><text x="328" y="22" fill="#cdd5ca" font-size="10">${escapeHtml(labelA)}</text>
      <circle cx="430" cy="18" r="5" fill="#d9b45f"/><text x="440" y="22" fill="#cdd5ca" font-size="10">${escapeHtml(labelB)}</text>
      <circle cx="542" cy="18" r="5" fill="#65d08c"/><text x="552" y="22" fill="#cdd5ca" font-size="10">${escapeHtml(labelC)}</text>
    </g>
    ${bars}
  </svg>`;
}

function lineChart(labels, values, label) {
  const nums = values.filter(Number.isFinite);
  if (!nums.length) {
    return `<div class="empty">No verified historical ${escapeHtml(label)} series available from company filings.</div>`;
  }
  const min = Math.min(...nums, 0);
  const max = Math.max(...nums, 1);
  const gradientId = `lineArea-${String(label).replace(/[^a-z0-9]/gi, "-")}`;
  const yFor = (value) => 198 - ((value - min) / (max - min || 1)) * 150;
  const points = values.map((value, i) => Number.isFinite(value) ? `${scale(i, 0, values.length - 1, 600, 55).toFixed(1)},${yFor(value).toFixed(1)}` : "");
  const grid = [min, (min + max) / 2, max].map((tick) => `<line class="grid-line" x1="55" x2="590" y1="${yFor(tick)}" y2="${yFor(tick)}"/><text x="48" y="${yFor(tick) + 4}" text-anchor="end" fill="#9ea99c" font-size="10">${compact(tick)}</text>`).join("");
  const plotted = points.map((point, index) => ({ point, index })).filter((row) => row.point);
  const pathPoints = plotted.map((row) => row.point);
  const firstX = pathPoints[0]?.split(",")[0] || "55";
  const lastX = pathPoints.at(-1)?.split(",")[0] || "590";
  const areaPath = `M${pathPoints.join(" L")} L${lastX},198 L${firstX},198 Z`;
  return `<svg viewBox="0 0 620 250"><defs><linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#77c7d5" stop-opacity=".38"/><stop offset="1" stop-color="#77c7d5" stop-opacity="0"/></linearGradient></defs><text class="axis-label" x="55" y="20">Y: ${escapeHtml(label)}</text><text class="axis-label" x="575" y="238" text-anchor="end">X: Fiscal year</text>${grid}<line class="axis-line" x1="55" x2="590" y1="198" y2="198"/><line class="axis-line" x1="55" x2="55" y1="42" y2="198"/><path d="${areaPath}" fill="url(#${gradientId})"/><polyline points="${pathPoints.join(" ")}" fill="none" stroke="#77c7d5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${plotted.map(({ point, index }) => `<circle class="chart-mark" data-tip="${escapeHtml(`${labels[index]}: ${label} ${compact(values[index])}`)}" cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="5" fill="#d9b45f"/><text x="${point.split(",")[0]}" y="220" text-anchor="middle" fill="#9ea99c" font-size="11">${labels[index]}</text>`).join("")}</svg>`;
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
    return `<circle class="chart-hit" data-select="${escapeHtml(row.id || "")}" data-tip="${escapeHtml(`${row.label}: ${labelX} ${compact(row.x)}, ${labelY} ${pct(row.y)}`)}" cx="${x}" cy="${y}" r="8" fill="#d9b45f" fill-opacity=".9"/><text x="${x + 11}" y="${y + 4}" fill="#cdd5ca" font-size="11">${escapeHtml(chartLabel(row.label))}</text>`;
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
  debtEquity: { key: "debtEquity", label: "debt/equity", format: ratio },
  revenue: { key: "revenue", label: "revenue", format: (value) => Number.isFinite(value) ? `\u20b9${compact(value)} Cr` : "--" },
  marketCap: { key: "marketCap", label: "market cap", format: (value) => Number.isFinite(value) ? `\u20b9${compact(value)} Cr` : "--" }
};

function getAnalystRows() {
  return dashboard.map((item) => {
    const extra = extraData[item.meta.id] || {};
    const quote = item.yahoo?.quote || {};
    const revenue = sourceMetric(item, "revenue");
    const patMargin = sourceMetric(item, "patMargin");
    return {
      id: item.meta.id,
      name: item.meta.name,
      price: quote.regularMarketPrice,
      dayMove: quote.regularMarketChangePercent,
      return1y: oneYearReturn(item),
      revenue: revenue.value,
      patMargin: patMargin.value,
      roce: liveMetric(item, "roce"),
      pe: liveMetric(item, "pe"),
      debtEquity: liveMetric(item, "debtEquity"),
      marketCap: liveMetric(item, "marketCapCr"),
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
    const priceRangeButton = event.target.closest?.("[data-price-range]");
    if (priceRangeButton) {
      activePriceRange = priceRangeButton.dataset.priceRange;
      const item = dashboard.find((d) => d.meta.id === selectedId) || dashboard[0];
      renderChart(item?.chart || []);
      return;
    }
    const target = event.target.closest?.("[data-select]");
    const id = target?.dataset.select;
    if (id && dashboard.some((item) => item.meta.id === id)) {
      selectedId = id;
      save();
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
    els.searchResults.innerHTML = results.map((row) => `<button data-symbol="${escapeHtml(row.symbol)}" data-name="${escapeHtml(row.longname || row.shortname || row.symbol)}" data-segment="${escapeHtml(row.industryDisp || row.sectorDisp || row.exchDisp || "Custom watchlist company")}">
      <strong>${escapeHtml(row.symbol)}</strong><br><small>${escapeHtml(row.longname || row.shortname || row.exchDisp || "")}</small>
    </button>`).join("");
    els.searchResults.style.display = results.length ? "block" : "none";
    els.searchResults.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => addCustom(button.dataset.symbol, button.dataset.name, { segment: button.dataset.segment })));
  }, 250);
}

function addManual() {
  const raw = els.companySearch.value.trim().toUpperCase();
  if (!raw) return;
  const symbol = raw.includes(".") ? raw : `${raw}.NS`;
  addCustom(symbol, raw);
}

async function addCustom(symbol, name, options = {}) {
  const normalizedSymbol = String(symbol || "").toUpperCase();
  const finalSymbol = normalizedSymbol.includes(".") ? normalizedSymbol : `${normalizedSymbol}.NS`;
  const catalogMatch = catalog.find((item) => item.symbol?.toUpperCase() === finalSymbol || item.nse?.toUpperCase() === finalSymbol.replace(".NS", ""));
  if (catalogMatch) {
    if (!watchIds.includes(catalogMatch.id)) watchIds.push(catalogMatch.id);
    selectedId = catalogMatch.id;
    els.companySearch.value = "";
    els.searchResults.style.display = "none";
    save();
    await refresh();
    return;
  }
  const id = `custom-${finalSymbol.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  const next = {
    id,
    name: name || finalSymbol,
    symbol: finalSymbol,
    nse: finalSymbol.replace(".NS", ""),
    bse: options.bse || "",
    segment: options.segment || "Custom watchlist company"
  };
  const existingIndex = custom.findIndex((item) => item.id === id);
  if (existingIndex >= 0) custom[existingIndex] = { ...custom[existingIndex], ...next };
  else custom.push(next);
  if (!watchIds.includes(id)) watchIds.push(id);
  selectedId = id;
  els.companySearch.value = "";
  els.searchResults.style.display = "none";
  save();
  renderWatchlist();
  if (els.marketStatus) els.marketStatus.textContent = `Adding ${next.name} and refreshing all tabs`;
  await refresh();
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
