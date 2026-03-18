# Dashboard Template — React/JSX

Ten plik zawiera szablon dashboardu React/JSX dla 4DX OvocxMalinovi.
Claude Code powinien użyć tego szablonu jako bazy i wypełnić go danymi
sparsowanymi z arkusza Google Sheets.

## Architektura komponentów

```
Dashboard4DX (główny)
├── Header (tytuł, data, week selector)
├── WigTabs (4 zakładki WIG)
├── WigHeroCard (opis, deadline, progress ring)
├── KpiCards (4 karty: DoD, LEAD, SUB-WIG, LAG TBD)
├── LagSection (LAG-01 checklist + LAG-02/03/04 TBD)
├── LeadSection (SUB-WIG-i z zadaniami)
└── ProcessMap (tabela 7 procesów)
```

## Wymagania techniczne

- **Framework:** React z Hooks (useState, useMemo)
- **Styl:** Inline styles (Tailwind core classes jako backup)
- **Fonty:** Google Fonts — DM Sans (body) + DM Serif Display (headings)
- **Eksport:** Default export — `export default function Dashboard4DX()`
- **Dane:** Zahardkodowane jako const na górze pliku (generowane z parsera)
- **Responsywność:** CSS Grid z auto-fit, flex-wrap

## Paleta kolorów

```javascript
const COLORS = {
  primary: '#6366f1',    // indigo — akcent główny
  success: '#22c55e',    // zielony — ukończone
  warning: '#f59e0b',    // żółty — TBD / uwaga
  danger: '#ef4444',     // czerwony — pilne / blocked
  bg: '#f8fafc',         // tło strony
  card: '#ffffff',       // tło kart
  border: '#e2e8f0',     // obramowania
  text: '#1e293b',       // tekst główny
  textMuted: '#94a3b8',  // tekst drugorzędny
  textLight: '#64748b',  // tekst pomocniczy
};
```

## Szablon komponentów

### ProgressRing

Kołowy progress bar do pokazywania WIG Status.

```jsx
const ProgressRing = ({ value, size = 90, stroke = 7, color = "#22c55e" }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(value, 1));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: "center",
                 fontSize: size * 0.26, fontWeight: 800, fill: "#1e293b" }}>
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
};
```

### ProgressBar

Liniowy progress bar.

```jsx
const ProgressBar = ({ value, max = 1, color = "#6366f1", height = 6 }) => (
  <div style={{ width: "100%", height, borderRadius: height, background: "#e2e8f0" }}>
    <div style={{
      width: `${Math.min((value / max) * 100, 100)}%`,
      height: "100%", borderRadius: height, background: color,
      transition: "width 0.5s ease"
    }} />
  </div>
);
```

### StatusBadge

Badge statusu procesu.

```jsx
const StatusBadge = ({ status }) => {
  const styles = {
    "Not started": { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
    "In progress": { bg: "#ecfdf5", text: "#059669", dot: "#10b981" },
    "Approved":    { bg: "#eff6ff", text: "#2563eb", dot: "#3b82f6" },
    "Blocked":     { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
  };
  const s = styles[status] || styles["Not started"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
      background: s.bg, color: s.text }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {status}
    </span>
  );
};
```

### KpiCard

Karta KPI (4 na dashboardzie).

```jsx
const KpiCard = ({ icon, label, value, sub, color, progress, alert }) => (
  <div style={{
    background: "#fff", borderRadius: 14, padding: "16px 18px",
    border: alert ? "1px solid #fde68a" : "1px solid #e2e8f0",
    background: alert ? "#fffbeb" : "#fff",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        color: "#94a3b8", letterSpacing: 1 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, color: alert ? "#92400e" : color }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
    {progress !== undefined && (
      <div style={{ marginTop: 8 }}>
        <ProgressBar value={progress} color={color} />
      </div>
    )}
  </div>
);
```

## Struktura głównego komponentu

```jsx
export default function Dashboard4DX() {
  const [selectedWeek, setSelectedWeek] = useState("T10");
  const [activeWig, setActiveWig] = useState("OS_MALINOVI");

  // Indeks tygodnia (0-5)
  const wi = WEEKS.indexOf(selectedWeek);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* 1. HEADER z week selector */}
      {/* 2. WIG TABS */}
      {/* 3. WIG HERO CARD z ProgressRing */}
      {/* 4. KPI CARDS (grid 4 kolumny) */}
      {/* 5. LAG + LEAD (grid 2 kolumny) */}
      {/* 6. MAPA PROCESÓW */}
    </div>
  );
}
```

## Zasady generowania danych

Gdy Claude Code generuje dashboard z parsera, powinien:

1. **Na górze pliku** umieścić dane jako stałe JavaScript (const)
2. **Dane muszą być generowane z parsera**, nie wpisywane ręcznie
3. **WEEKS** zawsze `["T10", "T11", "T12", "T13", "T14", "T15"]`
4. **Wartości LEAD** jako float: 0, 0.5, lub 1
5. **LAG TBD** — sprawdzać `is_tbd` flag i pokazywać badge zamiast progress
6. **WIG bez danych** — pokazywać placeholder "Brak danych"

## Przykład gotowego outputu

Plik `dashboard_4dx_light.jsx` powinien:
- Być self-contained (jeden plik, bez importów poza React)
- Mieć ~400-600 linii kodu
- Renderować się jako artifact w Claude.ai
- Być responsywny (min-width: 320px)
- Używać tylko inline styles i Tailwind core classes
