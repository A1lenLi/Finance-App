import { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react'

// ── Contexts ──────────────────────────────────────────────────
export const ConventionCtx = createContext({ upColor: 'var(--green)', downColor: 'var(--red)', density: 'regular', chartType: 'area' })
export const GlossaryCtx   = createContext({ open: () => {} })
export const DataContext    = createContext(null)
export function useConv() { return useContext(ConventionCtx) }
export function useData() { return useContext(DataContext) }

// ── Utilities ────────────────────────────────────────────────
export function seedRand(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}
export function makeSeries(seed, len = 60, drift = 0.001, vol = 0.015, start = 100) {
  const r = seedRand(seed), pts = [start]
  const floor = start > 0 ? start * 0.04 : 0.01
  for (let i = 1; i < len; i++) {
    const last = pts[i - 1]
    pts.push(Math.max(floor, last + last * (drift + (r() - 0.5) * vol)))
  }
  return pts
}
export function symbolSeed(sym) {
  let h = 0
  for (let i = 0; i < sym.length; i++) h = (Math.imul(31, h) + sym.charCodeAt(i)) | 0
  return Math.abs(h) % 9000 + 100
}
export function timeAgo(ts) {
  const d = Math.floor(Date.now() / 1000) - ts
  if (d < 60) return '剛剛'
  if (d < 3600) return `${Math.floor(d / 60)} 分鐘前`
  if (d < 86400) return `${Math.floor(d / 3600)} 小時前`
  return `${Math.floor(d / 86400)} 天前`
}

// ── Primitives ───────────────────────────────────────────────
export function Num({ value, signed = false, suffix = '', className = '', style = {} }) {
  let s = typeof value === 'number'
    ? (signed && value > 0 ? '+' : '') + value.toLocaleString('en-US', { minimumFractionDigits: Math.abs(value) < 10 ? 2 : 1, maximumFractionDigits: 2 })
    : String(value)
  s = s.replace(/^-/, '−')
  return <span className={`num ${className}`} style={style}>{s}{suffix}</span>
}

export function ChangeBadge({ chg, size = 'sm' }) {
  const conv = useConv()
  const color = chg > 0 ? conv.upColor : chg < 0 ? conv.downColor : 'var(--text-muted)'
  const arrow = chg > 0 ? '▲' : chg < 0 ? '▼' : '·'
  const sz = { xs: { fontSize: 10, padding: '1px 5px' }, sm: { fontSize: 11, padding: '2px 6px' }, md: { fontSize: 12, padding: '3px 8px' }, lg: { fontSize: 13, padding: '4px 10px' } }[size]
  const bg = chg !== 0 ? `color-mix(in srgb, ${color} 12%, transparent)` : 'rgba(100,116,139,0.10)'
  const txt = (chg > 0 ? '+' : chg < 0 ? '−' : '') + Math.abs(chg).toFixed(2) + '%'
  return <span style={{ display:'inline-flex', alignItems:'center', fontFamily:'var(--font-mono)', fontWeight:600, fontVariantNumeric:'tabular-nums', borderRadius:4, color, background:bg, gap:3, ...sz }}><span style={{ fontSize:'0.8em' }}>{arrow}</span>{txt}</span>
}

export function Sparkline({ seed, dir = 1, chg = 0, prices = null, w = 80, h = 22, stroke = 1.5, fill = false }) {
  const conv = useConv()
  const series = useMemo(() => {
    if (prices && prices.length > 2) return prices
    const len = 36, r = seedRand(seed), pts = [100]
    const target = 100 * (1 + chg / 100)
    const noise = Math.max(Math.abs(chg) * 0.28, 0.35)
    for (let i = 1; i < len; i++) {
      const prog = i / (len - 1)
      pts.push(Math.max(0.1, 100 + (target - 100) * prog + (r() - 0.5) * noise))
    }
    pts[len - 1] = target
    return pts
  }, [seed, chg, prices])
  const min = Math.min(...series), max = Math.max(...series)
  const stepX = w / (series.length - 1)
  const norm = v => h - ((v - min) / (max - min || 1)) * h
  const d = series.map((v, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)},${norm(v).toFixed(1)}`).join(' ')
  const color = dir > 0 ? conv.upColor : dir < 0 ? conv.downColor : 'var(--text-muted)'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:'block', overflow:'visible' }}>
      {fill && <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.12"/>}
      <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function BigChart({ seed, dir = 1, height = 220, kind: kindProp, len = 120, drift = 0.001, vol = 0.013, start = 100 }) {
  const conv = useConv()
  const kind = kindProp || conv.chartType
  const ref = useRef(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    const obs = new ResizeObserver(() => ref.current && setW(ref.current.clientWidth))
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  const series = useMemo(() => makeSeries(seed, len, drift * dir, vol, start), [seed, len, drift, vol, dir, start])
  const min = Math.min(...series), max = Math.max(...series)
  const padY = (max - min) * 0.1, yMin = min - padY, yMax = max + padY
  // internal vertical padding keeps labels & candle wicks inside the SVG viewBox
  const PT = 14, PB = 6, h = height
  const chartH = h - PT - PB
  const norm = v => PT + chartH - ((v - yMin) / (yMax - yMin || 1)) * chartH
  const stepX = w / (series.length - 1)
  const color = dir > 0 ? conv.upColor : dir < 0 ? conv.downColor : 'var(--text-muted)'
  const linePath = series.map((v, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)},${norm(v).toFixed(1)}`).join(' ')
  const ticks = Array.from({ length: 6 }, (_, i) => yMin + ((yMax - yMin) * i) / 5)
  const displayRange = yMax - yMin
  const dp = displayRange < 0.001 ? 6 : displayRange < 0.01 ? 4 : displayRange < 0.1 ? 3 : displayRange < 1 ? 2 : displayRange < 100 ? 1 : 0
  const fmtTick = v => Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(dp)
  const candles = []
  if (kind === 'candle') {
    for (let i = 0; i < series.length; i += 3) {
      const sl = series.slice(i, i + 3)
      if (sl.length < 2) continue
      const o = sl[0], c = sl[sl.length - 1], hi = Math.max(...sl), lo = Math.min(...sl)
      candles.push({ x: (i + 1) * stepX, o: norm(o), c: norm(c), hi: norm(hi), lo: norm(lo), up: c >= o })
    }
  }
  return (
    <div ref={ref} style={{ width: '100%', height }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {ticks.map((v, i) => {
          const y = norm(v)
          const labelY = Math.max(PT - 2, Math.min(h - PB, y - 3))
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={w} y2={y} stroke="var(--border)" strokeDasharray="2 4" strokeWidth="1"/>
              <text x={w - 4} y={labelY} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-muted)" opacity="0.7">{fmtTick(v)}</text>
            </g>
          )
        })}
        {kind === 'candle' ? candles.map((c, i) => (
          <g key={i}>
            <line x1={c.x} x2={c.x} y1={c.hi} y2={c.lo} stroke={c.up ? conv.upColor : conv.downColor} strokeWidth="1"/>
            <rect x={c.x - 2.5} width="5" y={Math.min(c.o, c.c)} height={Math.max(2, Math.abs(c.c - c.o))} fill={c.up ? conv.upColor : conv.downColor}/>
          </g>
        )) : (
          <>
            {kind === 'area' && (
              <><defs><linearGradient id={`ag-${seed}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.30"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
              <path d={`${linePath} L${w},${h - PB} L0,${h - PB} Z`} fill={`url(#ag-${seed})`}/></>
            )}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </>
        )}
      </svg>
    </div>
  )
}

export function RegionTag({ code }) {
  return <span style={{ fontSize:9, fontWeight:700, fontFamily:'var(--font-mono)', letterSpacing:0.4, color:'var(--text-muted)', padding:'2px 5px', borderRadius:3, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)' }}>{code}</span>
}

export function GTerm({ children }) {
  const { open } = useContext(GlossaryCtx)
  const term = typeof children === 'string' ? children : String(children)
  const data = useData()
  if (!data?.glossary?.[term]) return <>{children}</>
  return <button className="gterm" onClick={e => { e.stopPropagation(); open(term) }}>{children}<sup>?</sup></button>
}

export function LogoMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display:'block' }}>
      <defs><linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#2dd4bf"/></linearGradient></defs>
      <circle cx="16" cy="16" r="13" stroke="url(#logo-g)" strokeWidth="1.8"/>
      <path d="M 7 21 L 12 16 L 17 19 L 25 9" stroke="url(#logo-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M 22 8 L 26 8 L 26 12" stroke="url(#logo-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export function SectionTitle({ kicker, label, count, action }) {
  return (
    <div className="section-title">
      {kicker && <span className="kicker">{kicker}</span>}
      <span className="label">{label}</span>
      {count != null && <span className="count">{count}</span>}
      <div style={{ flex:1 }}/>
      {action}
    </div>
  )
}

// ── Chrome ────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:'feed',    label:'今日脈動',   icon:'pulse',  section:'pulse' },
  { id:'indices', label:'全球股市',   icon:'chart',  section:'market', tab:'indices' },
  { id:'forex',   label:'外匯匯率',   icon:'forex',  section:'market', tab:'forex' },
  { id:'commod',  label:'大宗商品',   icon:'coin',   section:'market', tab:'commodities' },
  { id:'treas',   label:'公債殖利率', icon:'bank',   section:'market', tab:'treasuries' },
  { id:'crypto',  label:'加密貨幣',   icon:'crypto', section:'market', tab:'crypto' },
  { id:'sep',     sep:true },
  { id:'watch',   label:'自選清單',   icon:'star',   section:'watch' },
  { id:'sep2',    sep:true },
  { id:'news',    label:'新聞動態',   icon:'news',   section:'news' },
  { id:'learn',   label:'投資百科',   icon:'book',   section:'learn' },
]

function NavIcon({ name }) {
  const paths = {
    pulse: <path d="M3 12h3l3-8 4 16 3-8h5"/>,
    chart: <><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></>,
    forex: <><path d="M5 8h13l-3-3"/><path d="M19 16H6l3 3"/></>,
    coin:  <><circle cx="12" cy="12" r="9"/><path d="M9 9c1-1 5-1 5 1s-5 1-5 3 4 2 5 1"/></>,
    bank:  <><path d="M3 21h18"/><path d="M5 10h14M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M3 8l9-5 9 5"/></>,
    crypto:<><circle cx="12" cy="12" r="9"/><path d="M9 8v8h3a3 3 0 1 0 0-6H9m0 3h4"/></>,
    star:  <path d="M12 3l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/>,
    cal:   <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    gauge: <><path d="M3 12a9 9 0 0 1 18 0"/><path d="M12 12l5-3"/></>,
    news:  <><rect x="3" y="5" width="14" height="14" rx="1"/><path d="M17 8h4v9a2 2 0 0 1-2 2H8M7 9h6M7 13h6M7 17h3"/></>,
    book:  <><path d="M4 4v14a2 2 0 0 1 2-2h12V4H6a2 2 0 0 0-2 2zM8 7h8M8 11h6"/></>,
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export function LeftNav({ active, onSelect, collapsed }) {
  return (
    <aside className={`leftnav ${collapsed ? 'collapsed' : ''}`}>
      <div className="ln-brand"><LogoMark size={22}/>{!collapsed && <span className="ln-brand-name">財經脈動<i>·</i><em>Worldwide Finance</em></span>}</div>
      <nav className="ln-list">
        {NAV_ITEMS.map(n => n.sep ? <div key={n.id} className="ln-sep"/> : (
          <button key={n.id} className={`ln-item ${active === n.id ? 'active' : ''}`} onClick={() => onSelect(n)}>
            <span className="ln-icon"><NavIcon name={n.icon}/></span>
            {!collapsed && <span className="ln-label">{n.label}</span>}
          </button>
        ))}
      </nav>
      <div className="ln-footer">{!collapsed && <div className="ln-mode">▌即時模式</div>}</div>
    </aside>
  )
}

export function WatchRail({ items, onAdd, onSelect, onRemove, collapsed, onToggle }) {
  const conv = useConv()
  return (
    <aside className={`watchrail ${collapsed ? 'collapsed' : ''}`}>
      <div className="wr-head">
        <button className="wr-toggle" onClick={onToggle} title={collapsed ? '展開自選' : '收起自選'}>{collapsed ? '◀' : '▶'}</button>
        {!collapsed && (<><div className="wr-title"><span className="wr-kicker">WATCHLIST</span><span className="wr-label">自選清單</span></div><button className="wr-add" onClick={onAdd}>＋ 新增</button></>)}
      </div>
      {!collapsed && (
        <>
          <div className="wr-stats">
            <span>{items.length} 項</span><span style={{ flex:1 }}/>
            <span style={{ color:conv.upColor }}>▲ {items.filter(i => i.chg > 0).length}</span>
            <span style={{ color:conv.downColor }}>▼ {items.filter(i => i.chg < 0).length}</span>
          </div>
          <div className="wr-list">
            {items.map(it => (
              <div key={it.sym} className="wr-row" onClick={() => onSelect(it)}>
                <div className="wr-r1">
                  <div className="wr-name-grp"><span className="wr-name">{it.name}</span><span className="wr-sym">{it.sym}</span></div>
                  <button className="wr-x" onClick={e => { e.stopPropagation(); onRemove(it) }} title="移除">×</button>
                </div>
                <div className="wr-r2">
                  <span className="wr-val">{it.val}</span>
                  <span style={{ color: it.chg > 0 ? conv.upColor : it.chg < 0 ? conv.downColor : 'var(--text-muted)', fontFamily:'var(--font-mono)', fontWeight:600, fontSize:11 }}>
                    {it.chg > 0 ? '+' : ''}{it.chg.toFixed(2)}%
                  </span>
                </div>
                <Sparkline seed={it.seed} dir={it.chg >= 0 ? 1 : -1} chg={it.chg} w={200} h={26} fill/>
              </div>
            ))}
          </div>
          <div className="wr-foot"><button className="ghost-btn" onClick={onAdd} style={{ width:'100%', justifyContent:'center' }}>+ 新增關注標的</button></div>
        </>
      )}
    </aside>
  )
}

export function TopBar({ onSearch, onGlossary, onSettings, onRefresh, onToggleLeft, onPortfolio, density, onCycleDensity }) {
  const [q, setQ] = useState('')
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }))
  const conv = useConv()
  const data = useData()
  const portfolio = data?.portfolio
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <header className="topbar">
      <div className="tb-l">
        <button className="tb-btn iconic" onClick={onToggleLeft} title="切換導覽">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <div className="tb-clock"><span className="tb-time">{time}</span><span className="tb-tz">GMT+8</span></div>
        <span className="tb-divider"/><span className="tb-status"><i className="dot-live"/>市場開盤中 · NYSE / TWSE</span>
      </div>
      <div className="tb-c">
        <div className="tb-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋代碼、新聞、名詞…" onKeyDown={e => { if (e.key === 'Enter') { onSearch(q); setQ('') } }}/>
          <span className="kbd">⌘K</span>
        </div>
      </div>
      <div className="tb-r">
        {portfolio && (
          <button className="tb-pnl" title="管理投資組合" onClick={onPortfolio} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <span className="tb-pnl-label">今日損益</span>
            <span className="tb-pnl-val" style={{ color: portfolio.todayChg >= 0 ? conv.upColor : conv.downColor }}>{portfolio.todayChg >= 0 ? '+' : ''}{portfolio.todayChg.toLocaleString('en-US', { maximumFractionDigits:0 })}<i>  {portfolio.todayPct >= 0 ? '+' : ''}{portfolio.todayPct.toFixed(2)}%</i></span>
          </button>
        )}
        <span className="tb-divider"/>
        <button className="tb-btn" onClick={onGlossary} title="財經百科">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 16.5v.01"/></svg>
          <span>百科</span>
        </button>
        <button className="tb-btn" onClick={onCycleDensity} title="切換密度">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h18M3 12h18M3 19h18"/></svg>
          <span>{density === 'compact' ? '密集' : density === 'comfy' ? '舒適' : '標準'}</span>
        </button>
        <button className="tb-btn iconic" onClick={onRefresh} title="重新整理">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 3M21 3v6h-6"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 21M3 21v-6h6"/></svg>
        </button>
        <button className="tb-btn iconic" onClick={onSettings} title="設定">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09c0 .67.4 1.27 1.04 1.51a1.7 1.7 0 0 0 1.87-.34l.06.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.24.64.84 1.04 1.51 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>
        </button>
      </div>
    </header>
  )
}

// ── Main Panels ───────────────────────────────────────────────
export function Hero({ onOpenNews }) {
  const data = useData()
  const conv = useConv()
  const { todayStory, news } = data
  const heroNews = news?.find(n => n.tier === 'hero')
  return (
    <section className="hero" style={{ ...(heroNews?.coverUrl ? { backgroundImage:`url(${heroNews.coverUrl})`, backgroundSize:'cover', backgroundPosition:'center' } : {}), position:'relative' }}>
      {heroNews?.coverUrl && <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, rgba(10,14,26,0.97) 45%, rgba(10,14,26,0.65) 100%)', pointerEvents:'none' }}/>}
      <div className="hero-l" style={{ position:'relative', zIndex:1 }}>
        <div className="hero-stamp">
          <span className="hero-date">{todayStory.date}</span><span className="hero-sep">·</span>
          <span className="hero-day">{todayStory.weekday}</span><span className="hero-sep">·</span>
          <span className="hero-time">{todayStory.time} <em>{todayStory.tz}</em></span><span className="hero-sep">·</span>
          <span className="hero-kicker">{todayStory.kicker}</span>
        </div>
        <h1 className="hero-h">{todayStory.headline}</h1>
        <p className="hero-sub">{todayStory.subhead}</p>
        <div className="hero-tags">
          {todayStory.tags.map(t => <span key={t} className="hero-tag">#{t}</span>)}
          <button className="hero-cta" onClick={() => heroNews && onOpenNews(heroNews)}>完整脈絡 →</button>
        </div>
      </div>
      <div className="hero-r" style={{ position:'relative', zIndex:1 }}>
        <div className="hero-bullets">
          {todayStory.bullets.map((b, i) => (
            <div key={i} className="bullet">
              <div className="b-label">{b.label}</div>
              <div className="b-val">{b.value}</div>
              <div className="b-chg" style={{ color: b.dir > 0 ? conv.upColor : b.dir < 0 ? conv.downColor : 'var(--text-muted)' }}>{b.chg}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PulseStrip({ onSelect }) {
  const data = useData()
  const conv = useConv()
  return (
    <section className="pulse">
      <div className="pulse-rail">
        {(data.pulseStrip || []).map(p => (
          <button key={p.sym} className="pulse-card" onClick={() => onSelect(p)}>
            <div className="pulse-row1">{p.region && <RegionTag code={p.region}/>}<span className="pulse-sym">{p.sym}</span></div>
            <div className="pulse-name">{p.name}</div>
            <div className="pulse-val">{p.val}</div>
            <div className="pulse-bot">
              <Sparkline seed={p.seed} dir={p.chg >= 0 ? 1 : -1} chg={p.chg} prices={data.sparklines?.[p.rawSym] ?? null} w={80} h={22} fill/>
              <span className="pulse-chg" style={{ color: p.chg > 0 ? conv.upColor : p.chg < 0 ? conv.downColor : 'var(--text-muted)' }}>
                {p.chg > 0 ? '+' : ''}{p.chg.toFixed(2)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

const MATRIX_TABS = [
  { id:'indices',     label:'全球股市',   data:'indices',     hasSpark:true },
  { id:'forex',       label:'外匯匯率',   data:'forex',       hasSpark:true },
  { id:'commodities', label:'大宗商品',   data:'commodities', hasSpark:true },
  { id:'treasuries',  label:'公債殖利率', data:'treasuries',  hasSpark:false },
  { id:'crypto',      label:'加密貨幣',   data:'crypto',      hasSpark:true },
]

const MX_TF = {
  '1D': { len:  78, drift: 0.0002, vol: 0.003, off:    0 },
  '5D': { len: 100, drift: 0.0003, vol: 0.005, off:  137 },
  '1M': { len: 120, drift: 0.001,  vol: 0.013, off:  274 },
  '3M': { len: 180, drift: 0.001,  vol: 0.015, off:  411 },
  '6M': { len: 220, drift: 0.0012, vol: 0.018, off:  548 },
  '1Y': { len: 250, drift: 0.002,  vol: 0.025, off:  822 },
}

export function MarketMatrix({ onSelect, defaultTab = 'indices' }) {
  const [tab, setTab] = useState(defaultTab)
  const [featured, setFeatured] = useState(null)
  const [tf, setTf] = useState('1D')
  const conv = useConv()
  const data = useData()
  const cfg = MATRIX_TABS.find(t => t.id === tab)
  const rows = data[cfg.data] || []
  const feat = (featured?.tab === tab ? featured.item : null) || rows[0]
  return (
    <section className="matrix panel">
      <div className="matrix-head">
        <SectionTitle kicker="MARKETS" label="市場矩陣" count={rows.length}
          action={<div className="matrix-tabs">{MATRIX_TABS.map(t => <button key={t.id} className={`mtab ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); setFeatured(null) }}>{t.label}</button>)}</div>}/>
      </div>
      <div className="matrix-body">
        <div className="matrix-table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th className="al">名稱</th>
                {tab === 'crypto' && <th>市值</th>}
                <th>現價</th><th>漲跌幅</th>
                {cfg.hasSpark && <th>走勢</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.sym} className={feat?.sym === r.sym ? 'sel' : ''} onClick={() => setFeatured({ tab, item: r })}>
                  <td className="al">
                    <div className="cellname">
                      {r.region && <RegionTag code={r.region}/>}
                      <div className="cellname-txt"><span className="t">{r.name}</span><span className="s">{r.sym}</span></div>
                    </div>
                  </td>
                  {tab === 'crypto' && <td className="mono">{r.mcap}</td>}
                  <td className="mono">{r.val}</td>
                  <td><span style={{ color: r.chg > 0 ? conv.upColor : r.chg < 0 ? conv.downColor : 'var(--text-muted)', fontFamily:'var(--font-mono)', fontWeight:600 }}>{r.chg > 0 ? '+' : ''}{r.chg.toFixed(2)}%</span></td>
                  {cfg.hasSpark && <td className="ar"><Sparkline seed={r.seed} dir={r.chg >= 0 ? 1 : -1} chg={r.chg} prices={data.sparklines?.[r.rawSym] ?? null} w={70} h={20}/></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {feat && (
          <div className="matrix-featured">
            <div className="mf-head">
              {feat.region && <RegionTag code={feat.region}/>}
              <div><div className="mf-name">{feat.name}</div><div className="mf-sym">{feat.sym}</div></div>
              <div className="mf-price">
                <div className="mf-val">{feat.val}</div>
                <div style={{ color: feat.chg > 0 ? conv.upColor : feat.chg < 0 ? conv.downColor : 'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600 }}>{feat.chg > 0 ? '+' : ''}{feat.chg.toFixed(2)}%</div>
              </div>
            </div>
            <BigChart seed={(feat.seed || 7) + (MX_TF[tf]?.off ?? 0)} dir={feat.chg >= 0 ? 1 : -1} height={180} len={MX_TF[tf]?.len} drift={MX_TF[tf]?.drift} vol={MX_TF[tf]?.vol} start={feat._price ?? (parseFloat(String(feat.val).replace(/,/g,'')) || 100)}/>
            <div className="mf-tfs">
              {Object.keys(MX_TF).map(t => <button key={t} className={`tfbtn ${tf === t ? 'active' : ''}`} onClick={() => setTf(t)}>{t}</button>)}
              <div style={{ flex:1 }}/><button className="mf-detail" onClick={() => onSelect(feat)}>查看完整數據 →</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Feed Panels ───────────────────────────────────────────────
export function NewsFeed({ onOpen }) {
  const data = useData()
  const [tab, setTab] = useState('all')
  const ALL_TABS = [{ id:'all', label:'全部' }, { id:'頭條', label:'頭條' }, { id:'央行', label:'央行' }, { id:'匯市', label:'匯市' }, { id:'科技', label:'科技' }, { id:'加密', label:'加密' }]
  const news = data.news || []
  const hasContent = id => id === 'all' ? true
    : id === '頭條' ? news.some(n => n.tier === 'hero' || n.tier === 'major')
    : news.some(n => n.tag === id)
  const tabs = ALL_TABS.filter(t => hasContent(t.id))
  const filtered = tab === 'all' ? news
    : tab === '頭條' ? news.filter(n => n.tier === 'hero' || n.tier === 'major')
    : news.filter(n => n.tag === tab)
  return (
    <section className="newsfeed panel">
      <div className="nf-head">
        <SectionTitle kicker="LIVE" label="今日新聞動態" count={filtered.length}
          action={<div className="nf-tabs">{tabs.map(t => <button key={t.id} className={`nf-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>}/>
      </div>
      <div className="nf-body">
        {filtered.map((n, i) => (
          <article key={n.id} className={`ncard tier-${n.tier}${i === 0 ? ' ncard-first' : ''}`} onClick={() => onOpen(n)}>
            {/* 縮圖 */}
            <div className="ncard-thumb">
              {n.coverUrl
                ? <img src={n.coverUrl} alt="" className="ncard-img"/>
                : <div className={`ncard-img ncard-img-ph ntag-ph-${n.tag}`}><span className="ncard-img-ph-txt">{n.tag}</span></div>
              }
            </div>
            {/* 文字區 */}
            <div className="ncard-body">
              <div className="ncard-meta">
                <span className={`ntag ntag-${n.tag}`}>{n.tag}</span>
                <span className="nsrc">{n.source}</span>
                <span className="ndot">·</span>
                <span className="ntime">{n.time}</span>
                {n.impact && <><span className="ndot">·</span><span className="nimpact">影響 <strong>{n.impact.sym}</strong>&nbsp;<span style={{ color: n.impact.dir > 0 ? 'var(--green)' : 'var(--red)', fontFamily:'var(--font-mono)', fontWeight:600 }}>{n.impact.chg}</span></span></>}
              </div>
              <h3 className="ncard-h">{n.title}</h3>
              {n.summary && <p className="ncard-sum-preview">{n.summary}</p>}
              <span className="ncard-go">閱讀摘要 →</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function Calendar() {
  const data = useData()
  const calendar = data.calendar || []
  const byDate = {}
  calendar.forEach(c => { (byDate[c.date] = byDate[c.date] || []).push(c) })
  const impColor = i => i === 3 ? 'var(--red)' : i === 2 ? 'var(--amber)' : 'var(--text-muted)'
  return (
    <section className="cal panel">
      <SectionTitle kicker="CALENDAR" label="本週經濟日曆" count={calendar.length} action={<button className="ghost-btn">全部 →</button>}/>
      <div className="cal-body">
        {Object.entries(byDate).map(([date, items]) => (
          <div key={date} className="cal-group">
            <div className="cal-date"><span className="cd-num">{date}</span><span className="cd-day">週{items[0].day}</span></div>
            <div className="cal-items">
              {items.map((c, i) => (
                <div key={i} className="cal-row">
                  <span className="cal-time">{c.time}</span>
                  <span className="cal-flag"><span style={{ width:6, height:6, borderRadius:'50%', background:impColor(c.imp), display:'inline-block' }}/>{c.region}</span>
                  <span className="cal-evt">{c.evt}</span>
                  <span className="cal-prev"><em>前值</em> {c.prev}</span>
                  <span className="cal-est"><em>預期</em> {c.est}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SentimentBar() {
  const data = useData()
  const conv = useConv()
  const s = data.sentiment
  if (!s) return null
  const total = s.advDec.adv + s.advDec.dec + s.advDec.unch
  const advPct = s.advDec.adv / total * 100, decPct = s.advDec.dec / total * 100
  const fgAngle = s.fearGreed.val / 100 * 270 - 135
  return (
    <section className="senti panel">
      <SectionTitle kicker="SENTIMENT" label="市場情緒"/>
      <div className="senti-body">
        <div className="s-card s-card-fg">
          <div className="s-label"><GTerm>恐慌貪婪指數</GTerm></div>
          <div className="fg-gauge">
            <svg viewBox="-60 -55 120 95" width="120" height="95">
              <path d="M -42 -20 A 47 47 0 1 1 42 -20" stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="round"/>
              <line x1="0" y1="0" x2={42 * Math.cos((fgAngle - 90) * Math.PI / 180)} y2={42 * Math.sin((fgAngle - 90) * Math.PI / 180)} stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="4" fill="var(--text)"/>
            </svg>
            <div className="fg-val"><span className="fg-num">{s.fearGreed.val}</span><span className="fg-tx">{s.fearGreed.text}</span></div>
          </div>
        </div>
        <div className="s-card">
          <div className="s-label"><GTerm>波動率指數</GTerm> · VIX</div>
          <div className="s-val">{s.vix.val}<span className="s-chg" style={{ color:conv.downColor }}>{s.vix.chg > 0 ? '+' : '−'}{Math.abs(s.vix.chg).toFixed(2)}</span></div>
          <div className="s-sub">市場處於 <em>{s.vix.state}</em> 波動區間</div>
        </div>
        <div className="s-card s-card-wide">
          <div className="s-label"><GTerm>漲跌家數</GTerm></div>
          <div className="ad-row">
            <span style={{ color:conv.upColor, fontFamily:'var(--font-mono)', fontWeight:700 }}>▲ {s.advDec.adv}</span>
            <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>· {s.advDec.unch}</span>
            <span style={{ color:conv.downColor, fontFamily:'var(--font-mono)', fontWeight:700 }}>▼ {s.advDec.dec}</span>
          </div>
          <div className="ad-bar">
            <span style={{ width:`${advPct}%`, background:conv.upColor }}/>
            <span style={{ width:`${100-advPct-decPct}%`, background:'var(--text-muted)' }}/>
            <span style={{ width:`${decPct}%`, background:conv.downColor }}/>
          </div>
          <div className="s-sub">新高 <em style={{ color:conv.upColor }}>{s.highsLows.newHigh}</em> · 新低 <em style={{ color:conv.downColor }}>{s.highsLows.newLow}</em></div>
        </div>
        <div className="s-card">
          <div className="s-label"><GTerm>Put/Call 比</GTerm></div>
          <div className="s-val">{s.putCall.val}<span className="s-chg" style={{ color:conv.upColor }}>{s.putCall.chg > 0 ? '+' : '−'}{Math.abs(s.putCall.chg).toFixed(2)}</span></div>
          <div className="s-sub">避險需求 <em>溫和</em></div>
        </div>
        <div className="s-card">
          <div className="s-label"><GTerm>市場廣度</GTerm></div>
          <div className="s-val">{s.breadth.val}<i style={{ fontSize:16, fontStyle:'normal' }}>%</i></div>
          <div className="s-sub">個股 <em>高於 200MA</em></div>
        </div>
      </div>
    </section>
  )
}

// ── Modals ────────────────────────────────────────────────────
export function ModalShell({ children, onClose, width = 640, kicker, title, subtitle }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-card" style={{ width }} onClick={e => e.stopPropagation()}>
        <button className="overlay-x" onClick={onClose} aria-label="關閉">×</button>
        {(kicker || title) && <div className="overlay-head">{kicker && <div className="overlay-kicker">{kicker}</div>}{title && <h2 className="overlay-h">{title}</h2>}{subtitle && <div className="overlay-sub">{subtitle}</div>}</div>}
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  )
}

function SetRow({ label, hint, children }) {
  return <div className="set-row"><div className="set-row-l"><div className="set-row-label">{label}</div>{hint && <div className="set-row-hint">{hint}</div>}</div><div className="set-row-r">{children}</div></div>
}
function SetSeg({ value, options, onChange }) {
  return <div className="set-seg" role="tablist">{options.map(o => <button key={o.value} role="tab" aria-selected={value === o.value} className={`set-seg-btn ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>
}
function SetSwatches({ value, options, onChange }) {
  return <div className="set-sw-list">{options.map(o => <button key={o.value} className={`set-sw ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)} title={o.label}><span className="set-sw-dot" style={{ background:o.color }}/><span className="set-sw-name">{o.label}</span></button>)}</div>
}
function SetSwitch({ value, onChange }) {
  return <button role="switch" aria-checked={value} className={`set-switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)}><span className="set-switch-thumb"/></button>
}
function SetSelect({ value, options, onChange }) {
  return <div className="set-select-wrap"><select className="set-select" value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><svg width="10" height="6" viewBox="0 0 10 6" className="set-select-caret"><path fill="currentColor" d="M0 0h10L5 6z"/></svg></div>
}

export function SettingsModal({ t, setTweak, onClose, onReset, themes }) {
  return (
    <ModalShell onClose={onClose} width={620} kicker="PREFERENCES" title="設定" subtitle="個人化你的儀表板顯示與互動偏好。所有變更即時生效並自動保存。">
      <div className="set-list">
        <div className="set-sect">
          <div className="set-sect-h"><span className="set-sect-num">01</span><span className="set-sect-name">顯示偏好</span></div>
          <SetRow label="漲跌色慣例" hint="台股習慣紅漲綠跌；歐美習慣綠漲紅跌。">
            <SetSeg value={t.convention} onChange={v => setTweak('convention', v)} options={[{ value:'red_up', label:'紅漲綠跌' }, { value:'green_up', label:'綠漲紅跌' }]}/>
          </SetRow>
          <SetRow label="主題色" hint="影響強調按鈕、連結與圖表筆觸的主要色相。">
            <SetSwatches value={t.theme} onChange={v => setTweak('theme', v)} options={[{ value:'blue', label:'海軍藍', color:themes.blue.accent }, { value:'teal', label:'青藍', color:themes.teal.accent }, { value:'amber', label:'琥珀', color:themes.amber.accent }]}/>
          </SetRow>
        </div>
        <div className="set-sect">
          <div className="set-sect-h"><span className="set-sect-num">02</span><span className="set-sect-name">版面密度</span></div>
          <SetRow label="資訊密度" hint="調整列高、間距與基礎字級。">
            <SetSeg value={t.density} onChange={v => setTweak('density', v)} options={[{ value:'compact', label:'密集' }, { value:'regular', label:'標準' }, { value:'comfy', label:'舒適' }]}/>
          </SetRow>
          <SetRow label="圖表樣式" hint="詳情頁的預設圖表呈現方式。">
            <SetSeg value={t.chartType} onChange={v => setTweak('chartType', v)} options={[{ value:'line', label:'折線' }, { value:'area', label:'面積' }, { value:'candle', label:'蠟燭' }]}/>
          </SetRow>
        </div>
        <div className="set-sect">
          <div className="set-sect-h"><span className="set-sect-num">03</span><span className="set-sect-name">介面元件</span></div>
          <SetRow label="顯示左側導覽" hint="關閉後可獲得更大主視窗。"><SetSwitch value={t.leftNav} onChange={v => setTweak('leftNav', v)}/></SetRow>
          <SetRow label="顯示自選清單側欄" hint="右側自選即時報價欄。"><SetSwitch value={t.sidebar} onChange={v => setTweak('sidebar', v)}/></SetRow>
        </div>
      </div>
      <div className="set-foot">
        <div style={{ flex:1 }}/>
        <button className="ghost-btn" onClick={onReset}>回復預設</button>
        <button className="primary-btn" onClick={onClose}>完成</button>
      </div>
    </ModalShell>
  )
}

export function NewsDetail({ news, onClose }) {
  const conv = useConv()
  return (
    <ModalShell onClose={onClose} width={720} kicker={`${news.tag} · ${news.source} · ${news.time}`} title={news.title}>
      {news.coverUrl && <img src={news.coverUrl} alt="" style={{ width:'100%', borderRadius:8, marginBottom:16, aspectRatio:'16/9', objectFit:'cover' }}/>}
      {news.summary && <p className="nd-lead">{news.summary}</p>}
      {news.impact && (
        <div className="nd-impact">
          <div className="nd-impact-label">即時影響</div>
          <div className="nd-impact-row">
            <div className="nd-imp-sym">{news.impact.sym}</div>
            <div className="nd-imp-chg" style={{ color: news.impact.dir > 0 ? conv.upColor : conv.downColor }}>{news.impact.chg}</div>
            <div style={{ flex:1 }}/><Sparkline seed={101 + (news.impact.sym.length || 3)} dir={news.impact.dir} w={120} h={32} fill/>
          </div>
        </div>
      )}
      {news.related?.length > 0 && <div className="nd-section"><div className="nd-section-h">相關標的</div><div className="nd-related">{news.related.map(r => <span key={r} className="nd-pill">{r}</span>)}</div></div>}
      {news.glossary?.length > 0 && <div className="nd-section"><div className="nd-section-h">本則用語</div><div className="nd-gl">{news.glossary.map(t => <GTerm key={t}>{t}</GTerm>)}</div></div>}
      {news.url && (
        <div className="nd-foot">
          <div style={{ flex:1 }}/>
          <button className="primary-btn" onClick={() => window.api.openExternal(news.url)}>在瀏覽器閱讀全文 →</button>
        </div>
      )}
    </ModalShell>
  )
}

export function GlossaryPopup({ term, onClose, onJump }) {
  const data = useData()
  const def = data.glossary?.[term]
  const related = Object.keys(data.glossary || {}).filter(k => k !== term).slice(0, 6)
  return (
    <ModalShell onClose={onClose} width={520} kicker="財經百科 · 名詞解釋" title={term}>
      <p className="gl-def">{def}</p>
      <div className="gl-related"><div className="gl-related-h">相關詞彙</div><div className="gl-related-chips">{related.map(r => <button key={r} className="gl-chip" onClick={() => onJump(r)}>{r}</button>)}</div></div>
      <div className="gl-foot"><button className="ghost-btn" onClick={onClose}>知道了</button></div>
    </ModalShell>
  )
}

export function GlossaryIndex({ onClose, onPick }) {
  const [q, setQ] = useState('')
  const data = useData()
  const all = Object.entries(data.glossary || {})
  const filtered = q ? all.filter(([k, v]) => k.toLowerCase().includes(q.toLowerCase()) || v.includes(q)) : all
  return (
    <ModalShell onClose={onClose} width={720} kicker="LEARN" title="財經百科 · 名詞索引" subtitle="點擊任一詞彙查看完整解釋。">
      <div className="gi-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋名詞…"/><span className="gi-count">{filtered.length} 個結果</span></div>
      <div className="gi-list">
        {filtered.map(([term, def]) => <button key={term} className="gi-item" onClick={() => onPick(term)}><span className="gi-term">{term}</span><span className="gi-def">{def}</span></button>)}
        {filtered.length === 0 && <div className="gi-empty">找不到相關詞彙</div>}
      </div>
    </ModalShell>
  )
}

export function PortfolioModal({ holdings, onSave, onClose }) {
  const [items, setItems] = useState(holdings)
  const [newSym, setNewSym] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newCost, setNewCost] = useState('')
  const [looking, setLooking] = useState(false)
  const [err, setErr] = useState(null)

  const addHolding = async () => {
    if (!newSym || !newQty || !newCost) return
    setLooking(true); setErr(null)
    try {
      const result = await window.api.lookupSymbol(newSym.trim())
      if (!result) { setErr('找不到代碼，請確認後重試'); setLooking(false); return }
      const next = [...items.filter(i => i.rawSym !== result.symbol), {
        sym: result.symbol, name: result.name, rawSym: result.symbol,
        qty: parseFloat(newQty), avgCost: parseFloat(newCost)
      }]
      setItems(next)
      setNewSym(''); setNewQty(''); setNewCost('')
    } catch { setErr('查詢失敗，請稍後再試') }
    finally { setLooking(false) }
  }

  return (
    <ModalShell onClose={onClose} width={600} kicker="PORTFOLIO" title="投資組合" subtitle="記錄您的持倉，系統將自動計算即時損益。資料僅儲存於本機裝置。">
      <div className="port-list">
        {items.map(h => (
          <div key={h.rawSym} className="port-row">
            <div className="port-sym"><span className="port-s">{h.sym}</span><span className="port-n">{h.name}</span></div>
            <div className="port-nums"><span>數量 {h.qty.toLocaleString()}</span><span>均價 {h.avgCost.toFixed(2)}</span></div>
            <button className="port-x" onClick={() => setItems(items.filter(i => i.rawSym !== h.rawSym))}>×</button>
          </div>
        ))}
        {items.length === 0 && <div className="port-empty">尚無持倉，請在下方新增</div>}
      </div>
      <div className="port-add">
        <div className="port-add-h">新增持倉</div>
        <div className="port-add-row">
          <input placeholder="代碼（如 AAPL）" value={newSym} onChange={e => { setNewSym(e.target.value); setErr(null) }} style={{ flex:2 }}/>
          <input placeholder="數量" type="number" value={newQty} onChange={e => setNewQty(e.target.value)} style={{ flex:1 }}/>
          <input placeholder="均價" type="number" value={newCost} onChange={e => setNewCost(e.target.value)} style={{ flex:1.5 }} onKeyDown={e => e.key === 'Enter' && addHolding()}/>
          <button className="primary-btn" onClick={addHolding} disabled={!newSym || !newQty || !newCost || looking}>{looking ? '查詢中…' : '新增'}</button>
        </div>
        {err && <div style={{ color:'var(--red)', fontSize:12, marginTop:4 }}>{err}</div>}
      </div>
      <div className="set-foot">
        <div style={{ flex:1 }}/>
        <button className="ghost-btn" onClick={onClose}>取消</button>
        <button className="primary-btn" onClick={() => { onSave(items); onClose() }}>儲存</button>
      </div>
    </ModalShell>
  )
}

export function AlertModal({ item, alerts, onSave, onClose }) {
  const conv = useConv()
  const myAlerts = alerts.filter(a => a.rawSym === item.rawSym)
  const [direction, setDirection] = useState('above')
  const [price, setPrice] = useState('')

  const add = () => {
    const p = parseFloat(price)
    if (isNaN(p)) return
    onSave([...alerts, { id: Date.now(), sym: item.sym, name: item.name, rawSym: item.rawSym, direction, price: p }])
    setPrice('')
  }

  return (
    <ModalShell onClose={onClose} width={460} kicker="ALERT" title={`設定提醒 · ${item.sym}`} subtitle={`現價 ${item.val}，當觸及目標價時系統將提示。`}>
      <div className="alt-list">
        {myAlerts.map(a => (
          <div key={a.id} className="alt-row">
            <span className="alt-dir" style={{ color: a.direction === 'above' ? conv.upColor : conv.downColor }}>{a.direction === 'above' ? '突破' : '跌破'}</span>
            <span className="alt-price">{a.price.toFixed(2)}</span>
            <div style={{ flex:1 }}/>
            <button className="port-x" onClick={() => onSave(alerts.filter(al => al.id !== a.id))}>×</button>
          </div>
        ))}
        {myAlerts.length === 0 && <div className="port-empty">尚無設定的提醒</div>}
      </div>
      <div className="alt-add">
        <div className="alt-add-row">
          <div className="set-seg" style={{ flexShrink:0 }}>
            <button className={`set-seg-btn ${direction === 'above' ? 'on' : ''}`} onClick={() => setDirection('above')}>突破</button>
            <button className={`set-seg-btn ${direction === 'below' ? 'on' : ''}`} onClick={() => setDirection('below')}>跌破</button>
          </div>
          <input type="number" placeholder="目標價" value={price} onChange={e => setPrice(e.target.value)} style={{ flex:1 }} onKeyDown={e => e.key === 'Enter' && add()}/>
          <button className="primary-btn" onClick={add} disabled={!price}>新增</button>
        </div>
      </div>
      <div className="set-foot"><div style={{ flex:1 }}/><button className="ghost-btn" onClick={onClose}>關閉</button></div>
    </ModalShell>
  )
}

export function PortfolioBand({ onManage }) {
  const data = useData()
  const conv = useConv()
  const p = data.portfolio
  if (!p) return null
  return (
    <section className="pband panel">
      <div className="pband-head">
        <SectionTitle kicker="PORTFOLIO" label="投資組合" action={<button className="ghost-btn" onClick={onManage}>管理持倉</button>}/>
      </div>
      <div className="pband-stats">
        <div className="pband-stat"><div className="pband-sl">總市值</div><div className="pband-sv">${p.totalValue.toLocaleString('en-US', { maximumFractionDigits:0 })}</div></div>
        <div className="pband-stat"><div className="pband-sl">今日損益</div><div className="pband-sv" style={{ color: p.todayChg >= 0 ? conv.upColor : conv.downColor }}>{p.todayChg >= 0 ? '+' : ''}{p.todayChg.toLocaleString('en-US', { maximumFractionDigits:0 })} ({p.todayPct >= 0 ? '+' : ''}{p.todayPct.toFixed(2)}%)</div></div>
        <div className="pband-stat"><div className="pband-sl">累計損益</div><div className="pband-sv" style={{ color: p.totalPnL >= 0 ? conv.upColor : conv.downColor }}>{p.totalPnL >= 0 ? '+' : ''}{p.totalPnL.toLocaleString('en-US', { maximumFractionDigits:0 })} ({p.totalPnLPct >= 0 ? '+' : ''}{p.totalPnLPct.toFixed(2)}%)</div></div>
      </div>
      <div className="pband-positions">
        {p.positions.map(pos => (
          <div key={pos.rawSym} className="pband-pos">
            <div className="pband-pos-l"><span className="pband-pos-sym">{pos.sym}</span><span className="pband-pos-name">{pos.name}</span></div>
            <div className="pband-pos-r">
              <span className="pband-pos-val">{pos.val}</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, color: pos.pnl >= 0 ? conv.upColor : conv.downColor }}>{pos.pnl >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const QUICK_PICKS = [
  { symbol:'2330.TW', name:'台積電',    exchange:'TWSE' },
  { symbol:'2317.TW', name:'鴻海',      exchange:'TWSE' },
  { symbol:'2454.TW', name:'聯發科',    exchange:'TWSE' },
  { symbol:'0050.TW', name:'元大台灣50',exchange:'TWSE' },
  { symbol:'NVDA',    name:'NVIDIA',    exchange:'NASDAQ' },
  { symbol:'AAPL',    name:'Apple',     exchange:'NASDAQ' },
  { symbol:'BTC-USD', name:'Bitcoin',   exchange:'Crypto' },
]

// ── Watchlist Page ────────────────────────────────────────────
export function WatchlistPage({ items, onAdd, onSelect, onRemove }) {
  const conv = useConv()
  const data = useData()
  const [sort, setSort] = useState({ col: 'default', dir: 1 })

  const upCount   = items.filter(i => i.chg > 0).length
  const downCount = items.filter(i => i.chg < 0).length

  const sorted = [...items].sort((a, b) => {
    if (sort.col === 'default') return 0
    if (sort.col === 'name')  return a.name.localeCompare(b.name, 'zh-TW') * sort.dir
    if (sort.col === 'price') return ((parseFloat(a.val) || 0) - (parseFloat(b.val) || 0)) * sort.dir
    if (sort.col === 'chg')   return (a.chg - b.chg) * sort.dir
    return 0
  })

  const toggleSort = (col) =>
    setSort(s => s.col === col ? { col, dir: -s.dir } : { col, dir: -1 })

  const SortTh = ({ col, children, align = 'left' }) => (
    <div className={`wlp-th wlp-th-${col}`} onClick={() => toggleSort(col)}
      style={{ textAlign: align, cursor: 'pointer', userSelect: 'none' }}>
      {children}
      {sort.col === col && <span className="wlp-sort-arrow">{sort.dir === 1 ? ' ↑' : ' ↓'}</span>}
    </div>
  )

  return (
    <div className="wlp">
      {/* 頁首 */}
      <div className="wlp-head">
        <div className="wlp-head-l">
          <div className="wlp-kicker">WATCHLIST</div>
          <h1 className="wlp-title">自選清單</h1>
        </div>
        <div className="wlp-stats">
          <div className="wlp-stat">
            <span className="wlp-stat-n">{items.length}</span>
            <span className="wlp-stat-l">項目</span>
          </div>
          <div className="wlp-stat-sep"/>
          <div className="wlp-stat" style={{ color: conv.upColor }}>
            <span className="wlp-stat-n">{upCount}</span>
            <span className="wlp-stat-l">上漲</span>
          </div>
          <div className="wlp-stat" style={{ color: conv.downColor }}>
            <span className="wlp-stat-n">{downCount}</span>
            <span className="wlp-stat-l">下跌</span>
          </div>
        </div>
        <button className="primary-btn" onClick={onAdd}>＋ 新增標的</button>
      </div>

      {items.length === 0 ? (
        <div className="wlp-empty">
          <div className="wlp-empty-icon">☆</div>
          <div className="wlp-empty-title">尚無自選標的</div>
          <div className="wlp-empty-sub">新增您想追蹤的股票、ETF 或加密貨幣</div>
          <button className="primary-btn" style={{ marginTop: 20 }} onClick={onAdd}>新增第一個標的</button>
        </div>
      ) : (
        <div className="wlp-table">
          {/* 欄位標題 */}
          <div className="wlp-thead">
            <SortTh col="name">名稱 / 代碼</SortTh>
            <SortTh col="price" align="right">最新價</SortTh>
            <SortTh col="chg"   align="right">漲跌幅</SortTh>
            <div className="wlp-th">今日走勢</div>
            <div className="wlp-th"/>
          </div>
          {/* 資料列 */}
          <div className="wlp-tbody">
            {sorted.map(it => (
              <div key={it.sym} className="wlp-row" onClick={() => onSelect(it)}>
                {/* 名稱 + 代碼 */}
                <div className="wlp-td wlp-td-name">
                  <span className="wlp-sym">{it.sym}</span>
                  <span className="wlp-name">{it.name}</span>
                </div>
                {/* 最新價 */}
                <div className="wlp-td wlp-td-price">
                  <span className="wlp-price">{it.val}</span>
                </div>
                {/* 漲跌幅 */}
                <div className="wlp-td wlp-td-chg">
                  <span className="wlp-chg-badge" style={{
                    background: it.chg > 0 ? 'rgba(34,197,94,0.12)' : it.chg < 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                    color: it.chg > 0 ? conv.upColor : it.chg < 0 ? conv.downColor : 'var(--text-muted)'
                  }}>
                    {it.chg > 0 ? '▲' : it.chg < 0 ? '▼' : '·'}&nbsp;{Math.abs(it.chg).toFixed(2)}%
                  </span>
                </div>
                {/* 走勢 */}
                <div className="wlp-td wlp-td-spark">
                  <Sparkline seed={it.seed} dir={it.chg >= 0 ? 1 : -1} chg={it.chg}
                    prices={data.sparklines?.[it.rawSym] ?? null} w={150} h={34} fill/>
                </div>
                {/* 移除 */}
                <div className="wlp-td wlp-td-act">
                  <button className="wlp-remove-btn"
                    onClick={e => { e.stopPropagation(); onRemove(it) }}>
                    移除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AddWatchModal({ onClose, onAdd, existingSymbols = [] }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState(null)

  const isIn = (sym) => existingSymbols.includes(sym)

  const addItem = (r) => {
    if (isIn(r.symbol)) return   // 已存在，不重複加入
    onAdd({ sym: r.symbol, name: r.name, val: '--', chg: 0, seed: symbolSeed(r.symbol), rawSym: r.symbol })
    onClose()
  }

  const search = async () => {
    const s = q.trim()
    if (!s) return
    setSearching(true); setErr(null); setResults([])
    try {
      let list = []
      // Primary: searchSymbol (TWSE cache for Chinese/digits, Yahoo for English)
      try { list = await window.api.searchSymbol(s) } catch {}
      // Fallback: treat input as a direct ticker code
      if (!list?.length) {
        try {
          const r = await window.api.lookupSymbol(s)
          if (r?.symbol) list = [{ symbol: r.symbol, name: r.name, exchange: '', type: 'EQUITY' }]
        } catch {}
      }
      if (!list?.length) setErr('找不到相關結果，請嘗試其他關鍵字或代碼')
      else setResults(list)
    } catch { setErr('搜尋失敗，請稍後再試') }
    finally { setSearching(false) }
  }

  return (
    <ModalShell onClose={onClose} width={500} kicker="自選清單" title="新增標的" subtitle="輸入代碼（AAPL、2330.TW）或中文名稱搜尋。">
      <div className="aw-search-row">
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setErr(null); setResults([]) }}
          placeholder="代碼 或 名稱，例如：台積電、NVDA"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && search()}
          style={{ flex:1 }}
        />
        <button className="primary-btn" onClick={search} disabled={!q.trim() || searching}>
          {searching ? '搜尋中…' : '搜尋'}
        </button>
      </div>
      {err && <div style={{ color:'var(--red)', fontSize:12, marginTop:6 }}>{err}</div>}
      {results.length > 0 && (
        <div className="aw-results">
          {results.map(r => {
            const already = isIn(r.symbol)
            return (
              <button key={r.symbol} className={`aw-result-row${already ? ' aw-result-row--in' : ''}`}
                onClick={() => addItem(r)} disabled={already}>
                <div className="aw-res-l">
                  <span className="aw-res-sym">{r.symbol}</span>
                  <span className="aw-res-name">{r.name}</span>
                </div>
                <div className="aw-res-r">
                  {r.exchange && <span className="aw-res-exch">{r.exchange}</span>}
                  <span className={`aw-res-add${already ? ' aw-res-add--in' : ''}`}>
                    {already ? '✓ 已在自選' : '＋'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
      <div className="aw-quick">
        <div className="aw-quick-h">熱門</div>
        <div className="aw-quick-grid">
          {QUICK_PICKS.map(r => {
            const already = isIn(r.symbol)
            return (
              <button key={r.symbol} className={`aw-qpick${already ? ' aw-qpick--in' : ''}`}
                onClick={() => addItem(r)} disabled={already} title={already ? '已在自選清單' : r.name}>
                <span className="aw-qp-sym">{r.symbol}</span>
                <span className="aw-qp-name">{already ? '✓ 已加入' : r.name}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="aw-actions">
        <button className="ghost-btn" onClick={onClose}>取消</button>
      </div>
    </ModalShell>
  )
}
