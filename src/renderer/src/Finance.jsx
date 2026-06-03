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
export function getMarketStatus() {
  const now = new Date()
  const day = now.getUTCDay()           // 0=Sun, 6=Sat
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes()
  const isWeekday = day >= 1 && day <= 5

  // TWSE: Mon-Fri 09:00-13:30 UTC+8 → 01:00-05:30 UTC
  const twseOpen = isWeekday && utcMin >= 60 && utcMin < 330

  // NYSE: Mon-Fri 09:30-16:00 ET
  // EDT (approx Mar-Nov): UTC-4 → 13:30-20:00 UTC
  // EST (approx Dec-Feb): UTC-5 → 14:30-21:00 UTC
  const mo = now.getUTCMonth() + 1
  const isEDT = mo >= 3 && mo <= 11
  const nyseStart = isEDT ? 810 : 870   // 13:30 or 14:30 in minutes
  const nyseEnd   = isEDT ? 1200 : 1260 // 20:00 or 21:00 in minutes
  const nyseOpen  = isWeekday && utcMin >= nyseStart && utcMin < nyseEnd

  if (twseOpen && nyseOpen) return { open: true, label: 'NYSE · TWSE 開盤中' }
  if (twseOpen)             return { open: true, label: 'TWSE 開盤中' }
  if (nyseOpen)             return { open: true, label: 'NYSE 開盤中' }
  return { open: false, label: '休市中' }
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
  { id:'feed',      label:'今日脈動',   icon:'pulse',     section:'pulse' },
  { id:'indices',   label:'全球股市',   icon:'chart',     section:'market', tab:'indices' },
  { id:'forex',     label:'外匯匯率',   icon:'forex',     section:'market', tab:'forex' },
  { id:'commod',    label:'大宗商品',   icon:'coin',      section:'market', tab:'commodities' },
  { id:'treas',     label:'公債殖利率', icon:'bank',      section:'market', tab:'treasuries' },
  { id:'crypto',    label:'加密貨幣',   icon:'crypto',    section:'market', tab:'crypto' },
  { id:'sep',       sep:true },
  { id:'watch',     label:'自選清單',   icon:'star',      section:'watch' },
  { id:'sep2',      sep:true },
  { id:'sentiment', label:'市場情緒',   icon:'gauge',     section:'sentiment' },
  { id:'calendar',  label:'財經日曆',   icon:'cal',       section:'calendar' },
  { id:'news',      label:'新聞動態',   icon:'news',      section:'news' },
  { id:'learn',     label:'投資百科',   icon:'book',      section:'learn' },
]

function NavIcon({ name, watch = false }) {
  const paths = {
    pulse: <path d="M3 12h3l3-8 4 16 3-8h5"/>,
    chart: <><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></>,
    forex: <><path d="M5 8h13l-3-3"/><path d="M19 16H6l3 3"/></>,
    coin:  <><circle cx="12" cy="12" r="9"/><path d="M9 9c1-1 5-1 5 1s-5 1-5 3 4 2 5 1"/></>,
    bank:  <><path d="M3 21h18"/><path d="M5 10h14M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M3 8l9-5 9 5"/></>,
    crypto:<><circle cx="12" cy="12" r="9"/><path d="M9 8v8h3a3 3 0 1 0 0-6H9m0 3h4"/></>,
    star:  <path d="M12 3l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill={watch ? 'currentColor' : 'none'}/>,
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
          <button key={n.id} className={`ln-item ${active === n.id ? 'active' : ''} ${n.id === 'watch' ? 'ln-item-watch' : ''}`} onClick={() => onSelect(n)}>
            <span className="ln-icon"><NavIcon name={n.icon} watch={n.id === 'watch'}/></span>
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
  const [mktStatus, setMktStatus] = useState(() => getMarketStatus())
  const conv = useConv()
  const data = useData()
  const portfolio = data?.portfolio
  const inputRef = useRef(null)
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const id = setInterval(() => setMktStatus(getMarketStatus()), 60_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return (
    <header className="topbar">
      <div className="tb-l">
        <button className="tb-btn iconic" onClick={onToggleLeft} title="切換導覽">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <div className="tb-clock"><span className="tb-time">{time}</span><span className="tb-tz">GMT+8</span></div>
        <span className="tb-divider"/>
        <span className="tb-status">
          <i className={mktStatus.open ? 'dot-live' : 'dot-off'}/>
          {mktStatus.label}
        </span>
      </div>
      <div className="tb-c">
        <div className="tb-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋代碼、新聞、名詞…" onKeyDown={e => {
            if (e.key === 'Enter' && q.trim()) { onSearch(q.trim()); setQ('') }
            if (e.key === 'Escape') { setQ(''); inputRef.current?.blur() }
          }}/>
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
export function NewsFeed({ onOpen, onRefresh, refreshing, limit }) {
  const data = useData()
  const [tab, setTab] = useState('all')
  const ALL_TABS = [{ id:'all', label:'全部' }, { id:'頭條', label:'頭條' }, { id:'央行', label:'央行' }, { id:'匯市', label:'匯市' }, { id:'科技', label:'科技' }, { id:'加密', label:'加密' }]
  const news = data.news || []
  const hasContent = id => id === 'all' ? true
    : id === '頭條' ? news.some(n => n.tier === 'hero' || n.tier === 'major')
    : news.some(n => n.tag === id)
  const tabs = ALL_TABS.filter(t => hasContent(t.id))
  const allFiltered = tab === 'all' ? news
    : tab === '頭條' ? news.filter(n => n.tier === 'hero' || n.tier === 'major')
    : news.filter(n => n.tag === tab)
  const filtered = limit ? allFiltered.slice(0, limit) : allFiltered
  return (
    <section className="newsfeed panel">
      <div className="nf-head">
        <SectionTitle kicker="LIVE" label="今日新聞動態" count={filtered.length}
          action={<div className="nf-tabs">
            {tabs.map(t => <button key={t.id} className={`nf-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
            {onRefresh && <button className="nf-refresh" onClick={onRefresh} disabled={refreshing} title="重新整理">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
            </button>}
          </div>}/>
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

// ── QuickMarket (主頁精簡行情條) ──────────────────────────────
const QUICK_SYMS = ['SPX','TWII','USD/TWD','BTC','GOLD']
export function QuickMarket({ onSelect }) {
  const data = useData()
  const conv = useConv()
  const rows = useMemo(() => {
    const all = [...(data.indices||[]), ...(data.forex||[]), ...(data.commodities||[])]
    return QUICK_SYMS.map(s => all.find(r => r.sym === s)).filter(Boolean)
  }, [data.indices, data.forex, data.commodities])
  if (!rows.length) return null
  return (
    <div className="qm-strip">
      {rows.map(r => (
        <button key={r.sym} className="qm-cell" onClick={() => onSelect?.(r)}>
          <span className="qm-sym">{r.sym}</span>
          <span className="qm-val">{r.val}</span>
          <span className="qm-chg" style={{ color: r.chg > 0 ? conv.upColor : r.chg < 0 ? conv.downColor : 'var(--text-muted)' }}>
            {r.chg > 0 ? '▲' : r.chg < 0 ? '▼' : '·'} {Math.abs(r.chg).toFixed(2)}%
          </span>
        </button>
      ))}
    </div>
  )
}

// ── SentimentPage / CalendarPage (子頁包裝) ──────────────────
const MARKET_TAB_LABEL = {
  indices: '全球股市', forex: '外匯匯率', commodities: '大宗商品',
  treasuries: '公債殖利率', crypto: '加密貨幣',
}
const MARKET_TAB_SUB = {
  indices:     '各大指數即時報價與漲跌幅',
  forex:       '主要貨幣對即時匯率',
  commodities: '能源、金屬、農產品走勢',
  treasuries:  '美國公債各期殖利率',
  crypto:      '主流加密貨幣即時行情',
}

export function MarketPage({ tab = 'indices', onSelect }) {
  const label = MARKET_TAB_LABEL[tab] || '市場行情'
  const sub   = MARKET_TAB_SUB[tab]   || ''
  return (
    <div className="subpage">
      <div className="subpage-head">
        <div className="subpage-kicker">MARKET</div>
        <div className="subpage-title">{label}</div>
        <div className="subpage-sub">{sub}</div>
      </div>
      <MarketMatrix key={tab} onSelect={onSelect} defaultTab={tab}/>
    </div>
  )
}

export function SentimentPage() {
  return (
    <div className="subpage">
      <div className="subpage-head">
        <div className="subpage-kicker">SENTIMENT</div>
        <div className="subpage-title">市場情緒</div>
        <div className="subpage-sub">即時恐慌貪婪指數、波動率與漲跌統計</div>
      </div>
      <SentimentBar/>
    </div>
  )
}

export function CalendarPage() {
  return (
    <div className="subpage">
      <div className="subpage-head">
        <div className="subpage-kicker">CALENDAR</div>
        <div className="subpage-title">財經日曆</div>
        <div className="subpage-sub">重要經濟數據發布時間與預期值</div>
      </div>
      <Calendar/>
    </div>
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
  const fgVal = s.fearGreed.val
  const fgAngle = fgVal / 100 * 270 - 135
  const fgColor = fgVal > 75 ? '#22c55e' : fgVal > 55 ? '#86efac' : fgVal > 45 ? '#facc15' : fgVal > 25 ? '#f97316' : '#ef4444'
  return (
    <section className="senti panel">
      <SectionTitle kicker="SENTIMENT" label="市場情緒"/>
      <div className="senti-body">
        <div className="s-card s-card-fg">
          <div className="s-label"><GTerm>恐慌貪婪指數</GTerm></div>
          <div className="fg-gauge">
            <svg viewBox="-50 -48 100 86" width="100" height="86">
              <path d="M -29.7 29.7 A 42 42 0 1 1 29.7 29.7" stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="butt"/>
              <path d="M -29.7 29.7 A 42 42 0 1 1 29.7 29.7" stroke={fgColor} strokeWidth="6" fill="none" strokeLinecap="butt"
                pathLength="100" strokeDasharray={`${fgVal} 100`}/>
              <line x1="0" y1="0" x2={42 * Math.cos((fgAngle - 90) * Math.PI / 180)} y2={42 * Math.sin((fgAngle - 90) * Math.PI / 180)} stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="4" fill="var(--text)"/>
            </svg>
            <div className="fg-val"><span className="fg-num">{fgVal}</span><span className="fg-tx">{s.fearGreed.text}</span></div>
          </div>
        </div>
        <div className="s-card">
          <div className="s-label"><GTerm>波動率指數</GTerm> · VIX</div>
          <div className="s-val">{s.vix.val}<span className="s-chg" style={{ color: s.vix.chg > 0 ? conv.downColor : conv.upColor }}>{s.vix.chg > 0 ? '+' : '−'}{Math.abs(s.vix.chg).toFixed(2)}</span></div>
          <div className="s-sub">市場處於 <em>{s.vix.state}</em> 波動區間</div>
        </div>
        {s.advDec && (() => {
          const total = s.advDec.total ?? (s.advDec.adv + s.advDec.dec + s.advDec.unch)
          const advPct = s.advDec.adv / total * 100, decPct = s.advDec.dec / total * 100
          const isTwse = s.advDec.source === 'twse'
          return (
            <div className="s-card s-card-wide">
              <div className="s-label">
                <GTerm>漲跌家數</GTerm>
                {isTwse && <span style={{ fontSize:11, color:'var(--accent)', marginLeft:5, fontWeight:600 }}>台股</span>}
              </div>
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
              <div className="s-sub">{isTwse ? `共 ${total} 支上市股票` : '新高 -- · 新低 --'}</div>
            </div>
          )
        })()}
        {s.putCall && (
          <div className="s-card">
            <div className="s-label"><GTerm>Put/Call 比</GTerm></div>
            <div className="s-val">{s.putCall.val}<span className="s-chg" style={{ color:conv.upColor }}>{s.putCall.chg > 0 ? '+' : '−'}{Math.abs(s.putCall.chg).toFixed(2)}</span></div>
            <div className="s-sub">避險需求 <em>溫和</em></div>
          </div>
        )}
        {s.breadth && (
          <div className="s-card">
            <div className="s-label"><GTerm>市場廣度</GTerm></div>
            <div className="s-val">{s.breadth.val}<i style={{ fontSize:16, fontStyle:'normal' }}>%</i></div>
            <div className="s-sub">個股 <em>高於 200MA</em></div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── PortfolioBand ─────────────────────────────────────────────
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

export function WatchlistPage({ items, onAdd, onSelect, onRemove, groups = [], onManageGroups, activeGroup = null, onActiveGroupChange }) {
  const conv = useConv()
  const data = useData()
  const [sort, setSort] = useState({ col: 'default', dir: 1 })
  const setActiveGroup = onActiveGroupChange ?? (() => {})

  const symGroupMap = useMemo(() => {
    const m = {}
    groups.forEach(g => g.symbols.forEach(s => { if (!m[s.symbol]) m[s.symbol] = g }))
    return m
  }, [groups])

  const activeGroupSet = useMemo(() =>
    activeGroup ? new Set(activeGroup.symbols.map(s => s.symbol)) : null
  , [activeGroup])

  const visibleItems = activeGroupSet
    ? items.filter(it => activeGroupSet.has(it.rawSym))
    : items

  const upCount   = visibleItems.filter(i => i.chg > 0).length
  const downCount = visibleItems.filter(i => i.chg < 0).length

  const sorted = [...visibleItems].sort((a, b) => {
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
      <div className="wlp-head">
        <div className="wlp-head-l">
          <div className="wlp-kicker">WATCHLIST</div>
          <h1 className="wlp-title">自選清單</h1>
        </div>
        <div className="wlp-stats">
          <div className="wlp-stat">
            <span className="wlp-stat-n">{visibleItems.length}</span>
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
        <div className="wlp-head-btns">
          {onManageGroups && <button className="ghost-btn" onClick={onManageGroups}>群組設定</button>}
          <button className="primary-btn" onClick={onAdd}>＋ 新增標的</button>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="wlp-groups">
          <button className={`wlp-gtab ${activeGroup === null ? 'on' : ''}`}
            onClick={() => setActiveGroup(null)}>
            全部<span className="wlp-gtab-ct">{items.length}</span>
          </button>
          {groups.map(g => (
            <button key={g.id}
              className={`wlp-gtab ${activeGroup?.id === g.id ? 'on' : ''}`}
              onClick={() => setActiveGroup(activeGroup?.id === g.id ? null : g)}>
              <span className="wlp-gtab-dot" style={{ background: g.color }}/>
              <span className="wlp-gtab-name">{g.name}</span>
              <span className="wlp-gtab-ct">
                {items.filter(it => g.symbols.some(s => s.symbol === it.rawSym)).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="wlp-empty">
          <div className="wlp-empty-icon">☆</div>
          <div className="wlp-empty-title">{activeGroup ? `${activeGroup.name} 尚無已載入的標的` : '尚無自選標的'}</div>
          <div className="wlp-empty-sub">新增您想追蹤的股票、ETF 或加密貨幣</div>
          <button className="primary-btn" style={{ marginTop: 20 }} onClick={onAdd}>新增第一個標的</button>
        </div>
      ) : (
        <div className="wlp-table">
          <div className="wlp-thead">
            <SortTh col="name">名稱 / 代碼</SortTh>
            <SortTh col="price" align="right">最新價</SortTh>
            <SortTh col="chg"   align="right">漲跌幅</SortTh>
            <div className="wlp-th">今日走勢</div>
            <div className="wlp-th"/>
          </div>
          <div className="wlp-tbody">
            {sorted.map(it => {
              const grp = symGroupMap[it.rawSym]
              return (
                <div key={it.sym} className="wlp-row" onClick={() => onSelect(it)}>
                  <div className="wlp-td wlp-td-name">
                    {grp && <span className="wlp-row-dot" style={{ background: grp.color }}/>}
                    <span className="wlp-sym">{it.sym}</span>
                    <span className="wlp-name">{it.name}</span>
                  </div>
                  <div className="wlp-td wlp-td-price">
                    <span className="wlp-price">{it.val}</span>
                  </div>
                  <div className="wlp-td wlp-td-chg">
                    <span className="wlp-chg-badge" style={{
                      background: it.chg > 0 ? 'rgba(34,197,94,0.12)' : it.chg < 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                      color: it.chg > 0 ? conv.upColor : it.chg < 0 ? conv.downColor : 'var(--text-muted)'
                    }}>
                      {it.chg > 0 ? '▲' : it.chg < 0 ? '▼' : '·'}&nbsp;{Math.abs(it.chg).toFixed(2)}%
                    </span>
                  </div>
                  <div className="wlp-td wlp-td-spark">
                    <Sparkline seed={it.seed} dir={it.chg >= 0 ? 1 : -1} chg={it.chg}
                      prices={data.sparklines?.[it.rawSym] ?? null} w={150} h={34} fill/>
                  </div>
                  <div className="wlp-td wlp-td-act">
                    <button className="wlp-remove-btn"
                      onClick={e => { e.stopPropagation(); onRemove(it) }}>
                      移除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
