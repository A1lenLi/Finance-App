/* global React, makeSeries, DATA */
// ─────────────────────────────────────────────────────────────
// Reusable primitives: Spark, AreaChart, Candles, Num,
// ChangeBadge, Pill, RegionFlag, GlossaryTerm, Logo
// ─────────────────────────────────────────────────────────────
const { useState, useRef, useEffect, useMemo, useContext, createContext } = React;

// ── Convention context ────────────────────────────────────────
// upColor = 漲色  (default: green CN/HK/TW convention switches)
const ConventionCtx = createContext({
  upColor:   'var(--green)',
  downColor: 'var(--red)',
  density:   'regular',   // compact | regular | comfy
  chartType: 'area',      // line | area | candle
});

function useConv() { return useContext(ConventionCtx); }

function dirColor(chg, conv) {
  if (chg > 0) return conv.upColor;
  if (chg < 0) return conv.downColor;
  return 'var(--text-muted)';
}

// ── Number formatting ─────────────────────────────────────────
function Num({ value, signed = false, suffix = '', className = '', style = {} }) {
  let s;
  if (typeof value === 'number') {
    s = (signed && value > 0 ? '+' : '') + value.toLocaleString('en-US', {
      minimumFractionDigits: Math.abs(value) < 10 ? 2 : 1,
      maximumFractionDigits: 2,
    });
  } else s = String(value);
  // Make minus sign look like a real minus, not hyphen
  s = s.replace(/^-/, '−');
  return <span className={`num ${className}`} style={style}>{s}{suffix}</span>;
}

function ChangeBadge({ chg, size = 'sm', pillStyle = 'tint' }) {
  const conv = useConv();
  const color = dirColor(chg, conv);
  const arrow = chg > 0 ? '▲' : chg < 0 ? '▼' : '·';
  const sizeStyles = {
    xs: { fontSize: 10, padding: '1px 5px', gap: 3 },
    sm: { fontSize: 11, padding: '2px 6px', gap: 3 },
    md: { fontSize: 12, padding: '3px 8px', gap: 4 },
    lg: { fontSize: 13, padding: '4px 10px', gap: 5 },
  };
  const base = {
    display: 'inline-flex', alignItems: 'center',
    fontFamily: 'var(--font-mono)', fontWeight: 600,
    fontVariantNumeric: 'tabular-nums', borderRadius: 4,
    color, ...sizeStyles[size],
  };
  if (pillStyle === 'tint') {
    base.background = chg > 0 ? 'color-mix(in srgb, ' + color + ' 12%, transparent)'
                    : chg < 0 ? 'color-mix(in srgb, ' + color + ' 12%, transparent)'
                    : 'rgba(100,116,139,0.10)';
  }
  const txt = (chg > 0 ? '+' : chg < 0 ? '−' : '') + Math.abs(chg).toFixed(2) + '%';
  return <span style={base}><span style={{ fontSize: '0.8em' }}>{arrow}</span>{txt}</span>;
}

// ── Sparkline / Area ─────────────────────────────────────────
function Sparkline({ seed, dir = 1, w = 80, h = 22, stroke = 1.5, fill = false }) {
  const conv = useConv();
  const series = useMemo(() => {
    const base = makeSeries(seed, 36, 0.0008 * dir, 0.018);
    // tilt the end to match dir
    if (dir > 0) base[base.length - 1] = Math.max(...base) * 1.005;
    if (dir < 0) base[base.length - 1] = Math.min(...base) * 0.998;
    return base;
  }, [seed, dir]);
  const min = Math.min(...series), max = Math.max(...series);
  const stepX = w / (series.length - 1);
  const norm = v => h - ((v - min) / (max - min || 1)) * h;
  const d = series.map((v, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(2)},${norm(v).toFixed(2)}`).join(' ');
  const color = dir > 0 ? conv.upColor : dir < 0 ? conv.downColor : 'var(--text-muted)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.12"/>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Big interactive chart ────────────────────────────────────
function BigChart({ seed, dir = 1, height = 220, kind: kindProp }) {
  const conv = useConv();
  const kind = kindProp || conv.chartType;
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const obs = new ResizeObserver(() => ref.current && setW(ref.current.clientWidth));
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const series = useMemo(
    () => makeSeries(seed, 120, 0.001 * dir, 0.013),
    [seed, dir]
  );
  const min = Math.min(...series), max = Math.max(...series);
  const padY = (max - min) * 0.1;
  const yMin = min - padY, yMax = max + padY;
  const h = height;
  const stepX = w / (series.length - 1);
  const norm = v => h - ((v - yMin) / (yMax - yMin || 1)) * h;
  const color = dir > 0 ? conv.upColor : dir < 0 ? conv.downColor : 'var(--text-muted)';
  const linePath = series.map((v, i) =>
    `${i ? 'L' : 'M'}${(i * stepX).toFixed(2)},${norm(v).toFixed(2)}`).join(' ');

  // grid Y ticks
  const ticks = 5;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);

  // candle data (group every 3 points)
  const candles = [];
  if (kind === 'candle') {
    for (let i = 0; i < series.length; i += 3) {
      const slice = series.slice(i, i + 3);
      if (slice.length < 2) continue;
      const o = slice[0], c = slice[slice.length - 1];
      const hi = Math.max(...slice), lo = Math.min(...slice);
      const x = (i + 1) * stepX;
      candles.push({
        x, o: norm(o), c: norm(c), hi: norm(hi), lo: norm(lo),
        up: c >= o,
      });
    }
  }

  return (
    <div ref={ref} style={{ width: '100%', height }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {/* grid */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1="0" y1={norm(v)} x2={w} y2={norm(v)}
                  stroke="var(--border)" strokeDasharray="2 4" strokeWidth="1"/>
            <text x={w - 4} y={norm(v) - 3} textAnchor="end"
                  fontSize="10" fontFamily="var(--font-mono)"
                  fill="var(--text-muted)" opacity="0.7">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {kind === 'candle' ? (
          candles.map((c, i) => (
            <g key={i}>
              <line x1={c.x} x2={c.x} y1={c.hi} y2={c.lo}
                    stroke={c.up ? conv.upColor : conv.downColor} strokeWidth="1"/>
              <rect
                x={c.x - 2.5} width="5"
                y={Math.min(c.o, c.c)} height={Math.max(2, Math.abs(c.c - c.o))}
                fill={c.up ? conv.upColor : conv.downColor}/>
            </g>
          ))
        ) : (
          <>
            {kind === 'area' && (
              <>
                <defs>
                  <linearGradient id={`area-${seed}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.30"/>
                    <stop offset="100%" stopColor={color} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d={`${linePath} L${w},${h} L0,${h} Z`} fill={`url(#area-${seed})`}/>
              </>
            )}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </>
        )}
      </svg>
    </div>
  );
}

// ── Region flag — typographic, never a vector flag ───────────
const REGION_LABEL = {
  US: 'US', TW: 'TW', JP: 'JP', HK: 'HK', CN: 'CN', KR: 'KR',
  EU: 'EU', UK: 'UK', DE: 'DE', BR: 'BR', AU: 'AU', CA: 'CA',
};
function RegionTag({ code }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
      letterSpacing: 0.4, color: 'var(--text-muted)',
      padding: '2px 5px', borderRadius: 3,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border)',
    }}>{REGION_LABEL[code] || code}</span>
  );
}

// ── Glossary term — clickable term opens overlay ─────────────
const GlossaryCtx = createContext({ open: () => {} });

function GTerm({ children }) {
  const { open } = useContext(GlossaryCtx);
  const term = typeof children === 'string' ? children : String(children);
  if (!DATA.glossary[term]) return <>{children}</>;
  return (
    <button className="gterm" onClick={(e) => { e.stopPropagation(); open(term); }}>
      {children}<sup>?</sup>
    </button>
  );
}

// ── Logo glyph ───────────────────────────────────────────────
function LogoMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
         style={{ display: 'block' }}>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6"/>
          <stop offset="100%" stopColor="#2dd4bf"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" stroke="url(#logo-g)" strokeWidth="1.8"/>
      <path d="M 7 21 L 12 16 L 17 19 L 25 9" stroke="url(#logo-g)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M 22 8 L 26 8 L 26 12" stroke="url(#logo-g)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ── Section header (used everywhere) ────────────────────────
function SectionTitle({ kicker, label, count, action }) {
  return (
    <div className="section-title">
      {kicker && <span className="kicker">{kicker}</span>}
      <span className="label">{label}</span>
      {count != null && <span className="count">{count}</span>}
      <div style={{ flex: 1 }} />
      {action}
    </div>
  );
}

// expose to babel siblings
Object.assign(window, {
  ConventionCtx, useConv, dirColor,
  Num, ChangeBadge, Sparkline, BigChart,
  RegionTag, GTerm, GlossaryCtx, LogoMark, SectionTitle,
});
