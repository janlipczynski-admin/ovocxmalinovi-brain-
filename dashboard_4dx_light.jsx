const { useState, useMemo } = React;

// ─── DANE (wygenerowane przez parser z 2026_Ovocxmalinovi_dashboard.xlsx) ────

const WEEKS = ["T10", "T11", "T12", "T13", "T14", "T15"];

const DATA = {
  wigs: [
    { key: "OS", name: "OS MALINOVI", id: "WIG#1", owner: "Jan", color: "#6366f1",
      description: "Do 31.03 opisać 100% procesów OvocxMalinovi wg DoD. Do 30.04 usprawnić 3 kluczowe procesy o min. 20% vs baseline.",
      deadline: "2026-04-30" },
    { key: "HARVEST", name: "HARVEST 50", id: "WIG#2", owner: "Kacper", color: "#f59e0b", description: "", deadline: "" },
    { key: "NOCOMPLAINTS", name: "NO COMPLAINTS", id: "WIG#3", owner: "Olgierd", color: "#22c55e", description: "", deadline: "" },
    { key: "XPRODUCT", name: "PRODUCT X", id: "WIG#4", owner: "Jan", color: "#ef4444", description: "", deadline: "" },
  ],
  wig_data: {
    OS: {
      has_data: true,
      lag: {
        wig_status: 0.1429,
        lag01: {
          processes: [
            { name: "Sprzedaż i Handel",                      target: "100%", values: [0,0,0,0,0,0] },
            { name: "Obsługa zamówień OxM",                   target: "100%", values: [0,0,0,0,0,0] },
            { name: "Rozliczenia tygodniowe",                  target: "100%", values: [0,0,0,0,0,0] },
            { name: "Obsługa reklamacji",                      target: "100%", values: [0,0,0,0,0,0] },
            { name: "Gospodarka magazynowa",                   target: "100%", values: [1,1,1,1,1,1] },
            { name: "Komunikacja wewnętrzna",                  target: "100%", values: [0,0,0,0,0,0] },
            { name: "Certyfikacja i wymogi formalno-prawne",   target: "100%", values: [0,0,0,0,0,0] },
          ],
          progress: [0.1429,0.1429,0.1429,0.1429,0.1429,0.1429],
          plan:     [0.1429,0.1429,0.1429,0.1429,0.1429,0.1429],
          on_track: [0,0,0,0,0,0],
        },
        additional_lags: [
          { name: "LAG-02 — Obsługa zamówień (optymalizacja w marcu)", is_tbd: true,
            criteria: ["Kryterium 1 (TBD)","Kryterium 2 (TBD)","Kryterium 3 (TBD)","Kryterium 4 (TBD)","Kryterium 5 (TBD)"] },
          { name: "LAG-03 — Rozliczenia tygodniowe (optymalizacja)", is_tbd: true,
            criteria: ["Kryterium 1 (TBD)","Kryterium 2 (TBD)","Kryterium 3 (TBD)","Kryterium 4 (TBD)","Kryterium 5 (TBD)"] },
          { name: "LAG-04 — Reklamacje (optymalizacja)", is_tbd: true,
            criteria: ["Kryterium 1 (TBD)","Kryterium 2 (TBD)","Kryterium 3 (TBD)","Kryterium 4 (TBD)","Kryterium 5 (TBD)"] },
        ],
      },
      lead: {
        lead_score: { target: 1, values: [0.1667,0,0,0,0,0] },
        sub_wigs: [
          { name: "SUB-WIG 0 — Procesy i role (DoD)", progress: [0.1667,0,0,0,0,0],
            tasks: [
              { deadline:"T10", description:"Gospodarka magazynowa — karta procesu wg DoD",            values:[1,0,0,0,0,0] },
              { deadline:"T10", description:"Sprzedaż i Handel — karta procesu wg DoD",                values:[0,0,0,0,0,0] },
              { deadline:"T11", description:"Rozliczenia tygodniowe — karta procesu wg DoD",           values:[0,0,0,0,0,0] },
              { deadline:"T11", description:"Reklamacje — karta procesu wg DoD",                       values:[0,0,0,0,0,0] },
              { deadline:"T12", description:"Komunikacja wewnętrzna + Certyfikacja — karty procesów", values:[0,0,0,0,0,0] },
              { deadline:"T13", description:"Przegląd CEO — final (wszystkie procesy DoD)",            values:[0,0,0,0,0,0] },
            ]},
          { name: "SUB-WIG 1 — Obsługa zamówień", progress: [0.2778,0,0,0,0,0],
            tasks: [
              { deadline:"T10", description:"Ustalić właściciela procesu i definicję końca procesu",            values:[0,0,0,0,0,0] },
              { deadline:"T11", description:"Przeprowadzić warsztat uproszczenia procesu",                      values:[0,0,0,0,0,0] },
              { deadline:"T12", description:"Wdrożyć 1 zmianę redukującą obciążenie pracy",                    values:[0,0,0,0,0,0] },
              { deadline:"T13", description:"Wdrożyć 1 standard / checklistę / szablon",                       values:[0,0,0,0,0,0] },
              { deadline:"T14", description:"Przetestować proces end-to-end z użytkownikiem",                   values:[0,0,0,0,0,0] },
              { deadline:"T15", description:"Wykonać ponowną healthcheck (ankietę) i zamknąć iterację",        values:[0,0,0,0,0,0] },
            ]},
          { name: "SUB-WIG 2 — Rozliczenia tygodniowe", progress: [0,0,0,0,0,0],
            tasks: [
              { deadline:"T10", description:"Zebrać healthcheck (ankietę) od właściciela + wykonawcy",        values:[0,0,0,0,0,0] },
              { deadline:"T11", description:"Uzgodnić uproszczony przebieg rozliczeń tygodniowych",           values:[0,0,0,0,0,0] },
              { deadline:"T12", description:"Wdrożyć 1 zmianę ograniczającą ręczne poprawki",                 values:[0,0,0,0,0,0] },
              { deadline:"T15", description:"Wykonać ponowną healthcheck (ankietę) po zmianach",              values:[0,0,0,0,0,0] },
            ]},
          { name: "SUB-WIG 3 — Obsługa reklamacji", progress: [0,0,0,0,0,0],
            tasks: [
              { deadline:"T10", description:"Zebrać healthcheck (ankietę) od właściciela + wykonawcy",        values:[0,0,0,0,0,0] },
              { deadline:"T11", description:"Przeprojektować ścieżkę obsługi reklamacji",                     values:[0,0,0,0,0,0] },
              { deadline:"T13", description:"Wdrożyć 1 standard odpowiedzi / checklistę",                     values:[0,0,0,0,0,0] },
              { deadline:"T15", description:"Wykonać ponowną healthcheck (ankietę) po zmianach",              values:[0,0,0,0,0,0] },
            ]},
        ],
      },
    },
    HARVEST:      { has_data: false },
    NOCOMPLAINTS: { has_data: false },
    XPRODUCT:     { has_data: false },
  },
  processes: [
    { id:1, type:"Główny",      name:"Sprzedaż i Handel",                     owner:"Jan",     status:"Not started" },
    { id:2, type:"Główny",      name:"Obsługa zamówień OxM",                  owner:"Kacper",  status:"In progress" },
    { id:3, type:"Główny",      name:"Rozliczenia tygodniowe",                 owner:"Iza",     status:"Not started" },
    { id:4, type:"Wspierający", name:"Obsługa reklamacji",                     owner:"Olgierd", status:"Not started" },
    { id:5, type:"Wspierający", name:"Gospodarka magazynowa",                  owner:"Renia",   status:"In progress" },
    { id:6, type:"Wspierający", name:"Komunikacja wewnętrzna",                 owner:"Jan",     status:"Not started" },
    { id:7, type:"Wspierający", name:"Certyfikacja i wymogi formalno-prawne",  owner:"Jan",     status:"Not started" },
  ],
  backlog_count: 29,
};

// ─── KOMPONENTY POMOCNICZE ────────────────────────────────────────────────────

const ProgressRing = ({ value, size = 100, stroke = 8, color = "#6366f1" }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(value, 0), 1));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform:"rotate(90deg)", transformOrigin:"center",
                 fontSize: size * 0.22, fontWeight:800, fill:"#1e293b", fontFamily:"DM Sans" }}>
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
};

const ProgressBar = ({ value, max = 1, color = "#6366f1", height = 6 }) => (
  <div style={{ width:"100%", height, borderRadius:height, background:"#e2e8f0" }}>
    <div style={{
      width: `${Math.min((value/max)*100, 100)}%`, height:"100%", borderRadius:height,
      background: color, transition:"width 0.5s ease"
    }} />
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    "Not started": { bg:"#f1f5f9", text:"#64748b", dot:"#94a3b8" },
    "In progress":  { bg:"#ecfdf5", text:"#059669", dot:"#10b981" },
    "Approved":     { bg:"#eff6ff", text:"#2563eb", dot:"#3b82f6" },
    "Blocked":      { bg:"#fef2f2", text:"#dc2626", dot:"#ef4444" },
  };
  const s = map[status] || map["Not started"];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11,
      fontWeight:600, padding:"2px 9px", borderRadius:20, background:s.bg, color:s.text, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
      {status}
    </span>
  );
};

const TbdBadge = () => (
  <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
    background:"#fffbeb", color:"#92400e", border:"1px solid #fde68a" }}>TBD</span>
);

const LeadDot = ({ val }) => {
  const cfg = val === 1
    ? { bg:"#22c55e", label:"✓" }
    : val === 0.5
    ? { bg:"#f59e0b", label:"…" }
    : { bg:"#e2e8f0", label:"" };
  return (
    <span title={val === 1 ? "Zrobione" : val === 0.5 ? "W toku" : "Nie rozpoczęte"}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:20, height:20, borderRadius:"50%", background:cfg.bg,
        fontSize:10, fontWeight:700, color:"#fff" }}>
      {cfg.label}
    </span>
  );
};

// ─── GŁÓWNY KOMPONENT ─────────────────────────────────────────────────────────

export default function Dashboard4DX() {
  const [activeWig, setActiveWig] = useState("OS");
  const [selectedWeek, setSelectedWeek] = useState("T10");
  const wi = WEEKS.indexOf(selectedWeek);

  const wigMeta  = DATA.wigs.find(w => w.key === activeWig);
  const wigData  = DATA.wig_data[activeWig];

  const daysLeft = useMemo(() => {
    if (!wigMeta.deadline) return null;
    const diff = new Date(wigMeta.deadline) - new Date("2026-03-05");
    return Math.ceil(diff / 86400000);
  }, [wigMeta]);

  // KPI obliczenia dla aktywnego WIG
  const kpi = useMemo(() => {
    if (!wigData.has_data) return null;
    const lag = wigData.lag;
    const lead = wigData.lead;
    const doneProcs = lag.lag01.processes.filter(p => (p.values[wi] || 0) >= 1).length;
    const totalProcs = lag.lag01.processes.length;
    const tbdLags = lag.additional_lags.filter(l => l.is_tbd).length;
    const subWigs = lead.sub_wigs.length;
    const leadPct = lead.lead_score.values[wi] || 0;
    return { doneProcs, totalProcs, tbdLags, subWigs, leadPct };
  }, [activeWig, wi, wigData]);

  return (
    <div style={{ fontFamily:"'DM Sans', system-ui, sans-serif", background:"#f8fafc", minHeight:"100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)", padding:"20px 28px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:22 }}>🫐</span>
              <span style={{ fontSize:20, fontWeight:800, color:"#fff", fontFamily:"DM Serif Display" }}>
                4DX Scoreboard
              </span>
              <span style={{ fontSize:12, color:"#a5b4fc", marginLeft:4 }}>OvocxMalinovi 2026</span>
            </div>
            <div style={{ fontSize:12, color:"#a5b4fc", marginTop:3 }}>Stan na: 5 marca 2026</div>
          </div>
          {/* Week selector */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {WEEKS.map(w => (
              <button key={w} onClick={() => setSelectedWeek(w)}
                style={{ padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                  background: w === selectedWeek ? "#fff" : "rgba(255,255,255,0.12)",
                  color: w === selectedWeek ? "#4f46e5" : "#e0e7ff",
                  transition:"all 0.2s" }}>
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── WIG TABS ──────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", overflowX:"auto" }}>
          {DATA.wigs.map(wig => {
            const d = DATA.wig_data[wig.key];
            const status = d.has_data ? Math.round((d.lag.wig_status||0)*100) : null;
            const isActive = wig.key === activeWig;
            return (
              <button key={wig.key} onClick={() => setActiveWig(wig.key)}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"14px 20px", border:"none", cursor:"pointer",
                  background:"transparent", borderBottom: isActive ? `3px solid ${wig.color}` : "3px solid transparent",
                  transition:"all 0.2s", whiteSpace:"nowrap" }}>
                <span style={{ fontSize:13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? wig.color : "#64748b" }}>
                  {wig.id}
                </span>
                <span style={{ fontSize:13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#1e293b" : "#64748b" }}>
                  {wig.name}
                </span>
                {status !== null ? (
                  <span style={{ fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:20,
                    background: status > 0 ? "#ecfdf5" : "#f1f5f9",
                    color: status > 0 ? "#059669" : "#94a3b8" }}>
                    {status}%
                  </span>
                ) : (
                  <span style={{ fontSize:11, color:"#cbd5e1" }}>—</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 16px" }}>

        {/* ── WIG HERO CARD ──────────────────────────────────── */}
        <div style={{ background:"#fff", borderRadius:16, padding:"22px 26px", marginBottom:20,
          border:`1px solid ${wigMeta.color}30`, boxShadow:`0 0 0 1px ${wigMeta.color}15` }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap" }}>
            <ProgressRing value={wigData.has_data ? wigData.lag.wig_status : 0}
              size={100} stroke={9} color={wigMeta.color} />
            <div style={{ flex:1, minWidth:220 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1,
                  color: wigMeta.color, background:`${wigMeta.color}15`, padding:"2px 10px", borderRadius:20 }}>
                  {wigMeta.id}
                </span>
                <span style={{ fontSize:20, fontWeight:800, color:"#1e293b", fontFamily:"DM Serif Display" }}>
                  {wigMeta.name}
                </span>
                <span style={{ fontSize:12, color:"#94a3b8" }}>Właściciel: <b>{wigMeta.owner}</b></span>
              </div>
              {wigMeta.description ? (
                <p style={{ fontSize:13, color:"#475569", margin:"0 0 10px", lineHeight:1.6 }}>
                  {wigMeta.description}
                </p>
              ) : (
                <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 10px", fontStyle:"italic" }}>
                  Cel WIG-a nie jest jeszcze zdefiniowany.
                </p>
              )}
              {wigMeta.deadline && (
                <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                  <span style={{ fontSize:12, color:"#64748b" }}>
                    Deadline: <b style={{ color:"#1e293b" }}>{wigMeta.deadline}</b>
                  </span>
                  {daysLeft !== null && (
                    <span style={{ fontSize:12, fontWeight:700,
                      color: daysLeft < 30 ? "#ef4444" : daysLeft < 60 ? "#f59e0b" : "#22c55e" }}>
                      {daysLeft > 0 ? `${daysLeft} dni do końca` : "TERMIN MINĄŁ"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BRAK DANYCH ──────────────────────────────────────── */}
        {!wigData.has_data && (
          <div style={{ background:"#f8fafc", borderRadius:16, border:"2px dashed #e2e8f0",
            padding:"48px 24px", textAlign:"center", marginBottom:20 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:18, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>
              Brak danych dla {wigMeta.name}
            </div>
            <div style={{ fontSize:14, color:"#cbd5e1" }}>
              Uzupełnij arkusz Google Sheets, aby zobaczyć dane dla tego WIG-a.
            </div>
          </div>
        )}

        {wigData.has_data && (() => {
          const lag = wigData.lag;
          const lead = wigData.lead;

          return (
            <>
              {/* ── KPI CARDS ──────────────────────────────────── */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:22 }}>

                {/* Procesy DoD */}
                <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#94a3b8", letterSpacing:1, marginBottom:8 }}>
                    Procesy wg DoD
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, color:"#6366f1" }}>
                    {kpi.doneProcs}/{kpi.totalProcs}
                  </div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginBottom:8 }}>
                    ukończonych procesów
                  </div>
                  <ProgressBar value={kpi.doneProcs} max={kpi.totalProcs} color="#6366f1" />
                </div>

                {/* LEAD score */}
                <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#94a3b8", letterSpacing:1, marginBottom:8 }}>
                    Działania LEAD
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, color:"#22c55e" }}>
                    {Math.round(kpi.leadPct * 100)}%
                  </div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginBottom:8 }}>
                    wykonanych w {selectedWeek}
                  </div>
                  <ProgressBar value={kpi.leadPct} color="#22c55e" />
                </div>

                {/* SUB-WIG */}
                <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#94a3b8", letterSpacing:1, marginBottom:8 }}>
                    Aktywne SUB-WIG-i
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, color:"#f59e0b" }}>
                    {kpi.subWigs}
                  </div>
                  <div style={{ fontSize:12, color:"#94a3b8" }}>
                    strumieni pracy
                  </div>
                </div>

                {/* LAG TBD */}
                <div style={{ background: kpi.tbdLags > 0 ? "#fffbeb" : "#fff", borderRadius:14,
                  padding:"16px 18px", border: kpi.tbdLags > 0 ? "1px solid #fde68a" : "1px solid #e2e8f0" }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#94a3b8", letterSpacing:1, marginBottom:8 }}>
                    LAG do ustalenia
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, color: kpi.tbdLags > 0 ? "#92400e" : "#22c55e" }}>
                    {kpi.tbdLags}
                  </div>
                  <div style={{ fontSize:12, color: kpi.tbdLags > 0 ? "#b45309" : "#94a3b8" }}>
                    {kpi.tbdLags > 0 ? "LAG-ów wymaga definicji" : "wszystkie zdefiniowane"}
                  </div>
                </div>
              </div>

              {/* ── LAG + LEAD grid ──────────────────────────────── */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:18, marginBottom:22 }}>

                {/* LAG SECTION */}
                <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9",
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>LAG Measures</div>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>tydzień {selectedWeek}</div>
                  </div>

                  {/* LAG-01 */}
                  <div style={{ padding:"14px 20px" }}>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", color:"#6366f1",
                      letterSpacing:1, marginBottom:12 }}>
                      LAG-01 — Procesy opisane wg DoD
                    </div>
                    {lag.lag01.processes.map((p, i) => {
                      const val = p.values[wi] || 0;
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                          <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                            border: val >= 1 ? "none" : "2px solid #e2e8f0",
                            background: val >= 1 ? "#22c55e" : "#f8fafc",
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {val >= 1 && <span style={{ color:"#fff", fontSize:12, fontWeight:800 }}>✓</span>}
                          </div>
                          <span style={{ fontSize:13, color: val >= 1 ? "#1e293b" : "#64748b",
                            textDecoration: val >= 1 ? "none" : "none", flex:1 }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize:11, color:"#94a3b8" }}>{p.target}</span>
                        </div>
                      );
                    })}
                    <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid #f1f5f9" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Postęp</span>
                        <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>
                          {Math.round((lag.lag01.progress[wi]||0)*100)}%
                        </span>
                      </div>
                      <ProgressBar value={lag.lag01.progress[wi]||0} color="#6366f1" height={8} />
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                        <span style={{ fontSize:11, color:"#94a3b8" }}>Plan: {Math.round((lag.lag01.plan[wi]||0)*100)}%</span>
                        <span style={{ fontSize:11, fontWeight:700,
                          color: lag.lag01.on_track[wi] ? "#22c55e" : "#f59e0b" }}>
                          {lag.lag01.on_track[wi] ? "On track" : "Monitoring"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LAG-02/03/04 TBD */}
                  {lag.additional_lags.map((l, i) => (
                    <div key={i} style={{ padding:"12px 20px", borderTop:"1px solid #f1f5f9",
                      background: l.is_tbd ? "#fffbeb" : "#fff" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:12, fontWeight:700, color: l.is_tbd ? "#92400e" : "#1e293b" }}>
                          {l.name.split('—')[0].trim()}
                        </span>
                        {l.is_tbd && <TbdBadge />}
                      </div>
                      <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>
                        {l.name.split('—').slice(1).join('—').trim()}
                      </div>
                      {l.is_tbd && (
                        <div style={{ fontSize:11, color:"#b45309" }}>
                          Kryteria do zdefiniowania: {l.criteria.length} pkt
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* LEAD SECTION */}
                <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9",
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>LEAD Measures</div>
                    <div style={{ display:"flex", gap:6 }}>
                      {WEEKS.map(w => (
                        <span key={w} style={{ fontSize:10, fontWeight: w === selectedWeek ? 700 : 400,
                          color: w === selectedWeek ? "#6366f1" : "#94a3b8" }}>{w}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding:"14px 20px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <span style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>LEAD Score ogólny</span>
                      <span style={{ fontSize:14, fontWeight:800, color:"#22c55e" }}>
                        {Math.round((lead.lead_score.values[wi]||0)*100)}%
                      </span>
                    </div>
                    <ProgressBar value={lead.lead_score.values[wi]||0} color="#22c55e" height={8} />
                  </div>

                  {lead.sub_wigs.map((sw, si) => {
                    const swProgress = sw.progress[wi] || 0;
                    return (
                      <div key={si} style={{ padding:"12px 20px", borderTop:"1px solid #f1f5f9" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{sw.name}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:"#6366f1" }}>
                            {Math.round(swProgress*100)}%
                          </span>
                        </div>
                        <ProgressBar value={swProgress} color="#6366f1" height={4} />
                        <div style={{ marginTop:10 }}>
                          {sw.tasks.map((t, ti) => {
                            const val = t.values[wi] || 0;
                            return (
                              <div key={ti} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
                                <LeadDot val={val} />
                                <span style={{ fontSize:12, color: val === 1 ? "#1e293b" : "#64748b",
                                  flex:1, lineHeight:1.4 }}>
                                  <span style={{ fontSize:10, fontWeight:700, color:"#a5b4fc",
                                    marginRight:4 }}>{t.deadline}</span>
                                  {t.description}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* ── MAPA PROCESÓW ────────────────────────────────────── */}
        <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", marginBottom:20 }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>Mapa procesów</div>
            <span style={{ fontSize:12, color:"#94a3b8" }}>{DATA.processes.length} procesów</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["#","Typ","Proces","Właściciel","Status"].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:0.8, color:"#94a3b8", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DATA.processes.map((p, i) => (
                  <tr key={p.id} style={{ borderTop:"1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding:"10px 16px", fontSize:13, color:"#94a3b8", fontWeight:600 }}>{p.id}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20,
                        background: p.type === "Główny" ? "#eff6ff" : "#f5f3ff",
                        color: p.type === "Główny" ? "#2563eb" : "#7c3aed", fontWeight:600 }}>
                        {p.type}
                      </span>
                    </td>
                    <td style={{ padding:"10px 16px", fontSize:13, color:"#1e293b", fontWeight:500 }}>{p.name}</td>
                    <td style={{ padding:"10px 16px", fontSize:13, color:"#64748b" }}>{p.owner}</td>
                    <td style={{ padding:"10px 16px" }}><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── BACKLOG SUMMARY ───────────────────────────────────── */}
        <div style={{ background:"linear-gradient(135deg,#fafafe 0%,#f0f9ff 100%)", borderRadius:16,
          border:"1px solid #e0e7ff", padding:"18px 24px",
          display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ fontSize:32 }}>📋</div>
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>BACKLOG zmian</div>
            <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>
              {DATA.backlog_count} pomysłów i usprawnień oczekuje na ocenę
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:32, fontWeight:800, color:"#6366f1" }}>{DATA.backlog_count}</div>
            <div style={{ fontSize:11, color:"#94a3b8" }}>pozycji</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign:"center", padding:"24px 0 8px", fontSize:12, color:"#cbd5e1" }}>
          4DX Scoreboard · OvocxMalinovi 2026 · Tydzień {selectedWeek}
        </div>

      </div>
    </div>
  );
}
