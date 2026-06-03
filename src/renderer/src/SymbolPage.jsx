import { useState, useEffect, useRef } from 'react'
import { useConv, useData, symbolSeed, timeAgo, Sparkline, BigChart, RegionTag, GTerm } from './Finance'
import { MiniLearnCard, CARDS as LEARN_CARDS } from './Learn'

const LEARN_MAP = {
  stock:   ['candlestick', 'ma', 'rsi', 'macd', 'kd', 'pe-ratio', 'eps', 'pb-ratio', 'roe'],
  index:   ['indices', 'rsi', 'macd', 'vix', 'market-cycle', 'asset-alloc'],
  forex:   ['forex', 'candlestick', 'ma', 'rsi', 'asset-alloc'],
  commod:  ['candlestick', 'ma', 'rsi', 'macd', 'asset-alloc'],
  crypto:  ['candlestick', 'rsi', 'vix', 'fear-greed', 'asset-alloc'],
  bond:    ['indices', 'vix', 'market-cycle', 'asset-alloc'],
}
export const NEWS_LEARN_MAP = {
  '央行':  ['vix', 'fear-greed', 'market-cycle'],
  '匯市':  ['forex', 'asset-alloc'],
  '科技':  ['candlestick', 'pe-ratio', 'eps', 'pb-ratio', 'roe'],
  '加密':  ['candlestick', 'rsi', 'vix', 'fear-greed'],
  '財經':  ['pe-ratio', 'eps', 'pb-ratio', 'roe', 'dividend'],
}
function getRelatedCards(kind) {
  return (LEARN_MAP[kind] || LEARN_MAP.stock)
    .filter(id => LEARN_CARDS.some(c => c.id === id))
    .slice(0, 5)
}

export function classify(item) {
  const s = item.sym || ''
  if (/USD|EUR|JPY|GBP|TWD|HKD|CNY|AUD|DXY/.test(s) && /\//.test(s)) return 'forex'
  if (/^US\d|^JP\d|^DE\d|^TW\d/.test(s)) return 'bond'
  if (['WTI','BRENT','GOLD','SILVER','COPPER','NATGAS'].includes(s) || ['CL','BZ','GC','SI','HG','NG','ZC','CT'].includes(s)) return 'commod'
  if (['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX'].includes(s) || /-USD$/.test(s)) return 'crypto'
  if (['SPX','NDX','DJI','TWII','HSI','N225','000300','KOSPI','SX5E','FTSE','DAX','BVSP'].includes(s)) return 'index'
  return 'stock'
}

function classifyNewsTag(title) {
  if (/央行|Fed|FOMC|利率|降息|升息|貨幣政策|鮑爾|Powell|聯準會|ECB|BOJ/.test(title)) return '央行'
  if (/匯率|美元|外匯|匯市|新台幣|人民幣|日圓|歐元|英鎊|澳幣|強升|弱勢|升值|貶值/.test(title)) return '匯市'
  if (/比特幣|BTC|以太|ETH|加密|虛擬貨幣|Crypto|USDT|Web3|NFT|幣圈/.test(title)) return '加密'
  if (/半導體|AI|人工智慧|科技|台積電|TSMC|輝達|NVIDIA|蘋果|Apple|Google|Meta|Amazon|Microsoft|三星|晶片|雲端|伺服器/.test(title)) return '科技'
  return '財經'
}

function formatPrice(price, sym) {
  if (price == null) return '--'
  if (sym?.endsWith('=X')) return price > 10 ? price.toFixed(3) : price.toFixed(5)
  if (['^TNX','^FVX','^TYX','^IRX'].includes(sym)) return price.toFixed(3) + '%'
  if (sym?.endsWith('-USD')) {
    if (price < 1)    return price.toFixed(4)
    if (price < 10)   return price.toFixed(3)
    if (price > 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
    return price.toFixed(2)
  }
  if (price > 1000) return price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })
  return price.toFixed(2)
}

// ── TA calculations ──────────────────────────────────────────────
function calcMA(prices, n) {
  if (prices.length < n) return null
  return prices.slice(-n).reduce((a, b) => a + b, 0) / n
}
function calcEMA(prices, n) {
  if (prices.length < n) return null
  const k = 2 / (n + 1)
  let ema = prices.slice(0, n).reduce((a, b) => a + b, 0) / n
  for (let i = n; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k)
  return ema
}
function calcRSI(prices, n = 14) {
  if (prices.length < n + 1) return null
  const changes = prices.slice(1).map((v, i) => v - prices[i])
  const recent = changes.slice(-n)
  const gains = recent.filter(c => c > 0).reduce((a, b) => a + b, 0) / n
  const losses = recent.filter(c => c < 0).map(Math.abs).reduce((a, b) => a + b, 0) / n
  if (losses === 0) return 100
  return +(100 - 100 / (1 + gains / losses)).toFixed(1)
}
function calcMACD(prices) {
  if (prices.length < 26) return null
  return +((calcEMA(prices, 12) - calcEMA(prices, 26))).toFixed(4)
}
function calcKD(data, n = 9) {
  if (data.length < n) return null
  const recent = data.slice(-n)
  const maxH = Math.max(...recent.map(d => d.h ?? d.c))
  const minL = Math.min(...recent.map(d => d.l ?? d.c))
  const rsv = maxH === minL ? 50 : (recent[recent.length - 1].c - minL) / (maxH - minL) * 100
  return { k: Math.round(rsv), d: Math.round(rsv * 2 / 3 + 50 / 3) }
}

// ── Timeframe configs ────────────────────────────────────────────
const TF_PARAMS = {
  '1D':  { len:  78, drift: 0.0002, vol: 0.003, seedOff:    0 },
  '5D':  { len: 100, drift: 0.0003, vol: 0.005, seedOff:  137 },
  '1M':  { len: 120, drift: 0.001,  vol: 0.013, seedOff:  274 },
  '3M':  { len: 180, drift: 0.001,  vol: 0.015, seedOff:  411 },
  '6M':  { len: 220, drift: 0.0012, vol: 0.018, seedOff:  548 },
  'YTD': { len: 200, drift: 0.0015, vol: 0.020, seedOff:  685 },
  '1Y':  { len: 250, drift: 0.002,  vol: 0.025, seedOff:  822 },
  '5Y':  { len: 300, drift: 0.003,  vol: 0.035, seedOff:  959 },
  'MAX': { len: 360, drift: 0.004,  vol: 0.045, seedOff: 1096 },
}
const TF_YAHOO = {
  '1D':  { range: '1d',  interval: '5m'  },
  '5D':  { range: '5d',  interval: '30m' },
  '1M':  { range: '1mo', interval: '1d'  },
  '3M':  { range: '3mo', interval: '1d'  },
  '6M':  { range: '6mo', interval: '1d'  },
  'YTD': { range: 'ytd', interval: '1d'  },
  '1Y':  { range: '1y',  interval: '1d'  },
  '5Y':  { range: '5y',  interval: '1wk' },
  'MAX': { range: 'max', interval: '1mo' },
}

// ── UI primitives ────────────────────────────────────────────────
function StatTile({ label, value }) {
  return <div className="sp-stat"><div className="sp-stat-lbl">{label}</div><div className="sp-stat-val">{value}</div></div>
}
function SPCard({ kicker, title, action, children, pad = true }) {
  return (
    <section className="sp-card">
      {(kicker || title) && <header className="sp-card-h">{kicker && <span className="sp-kicker">{kicker}</span>}<span className="sp-card-title">{title}</span><div style={{ flex:1 }}/>{action}</header>}
      <div className={`sp-card-b ${pad ? '' : 'np'}`}>{children}</div>
    </section>
  )
}
function GaugeBar({ value, min = 0, max = 100, zones }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return (
    <div className="sp-gauge">
      <div className="sp-gauge-track">
        {zones?.map((z, i) => <div key={i} className="sp-gauge-zone" style={{ left:`${z.from}%`, width:`${z.to-z.from}%`, background:z.color }}/>)}
        <div className="sp-gauge-fill" style={{ width:`${pct*100}%` }}/>
        <div className="sp-gauge-thumb" style={{ left:`${pct*100}%` }}/>
      </div>
      <div className="sp-gauge-scale"><span>{min}</span><span>{Math.round((min+max)/2)}</span><span>{max}</span></div>
    </div>
  )
}
function RangeRow({ label, lo, hi, val }) {
  const pct = Math.max(0, Math.min(1, (val - lo) / (hi - lo)))
  return (
    <div className="sp-range">
      <div className="sp-range-h"><span className="sp-range-lbl">{label}</span><span className="sp-range-pct">{(pct*100).toFixed(0)}%</span></div>
      <div className="sp-range-bar"><div className="sp-range-thumb" style={{ left:`${pct*100}%` }}/></div>
      <div className="sp-range-foot"><span>{typeof lo === 'number' ? lo.toFixed(2) : lo}</span><span>{typeof hi === 'number' ? hi.toFixed(2) : hi}</span></div>
    </div>
  )
}

// ── Interactive chart ────────────────────────────────────────────
function RealChart({ data, color, height = 300, kind = 'area' }) {
  const conv = useConv()
  const ref = useRef(null)
  const [w, setW] = useState(600)
  const [hoverIdx, setHoverIdx] = useState(null)

  useEffect(() => {
    const obs = new ResizeObserver(() => ref.current && setW(ref.current.clientWidth))
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const AXIS_H = 18, PT = 8, PB = 4
  const chartH = height - PT - PB - AXIS_H
  const valid = data.filter(d => d.c != null)
  if (valid.length < 2) return <div ref={ref} style={{ width:'100%', height }}/>

  const hasOHLC = valid[0]?.h != null && valid[0]?.l != null && valid[0]?.o != null
  const useCandle = kind === 'candle' && hasOHLC

  const allPrices = useCandle
    ? valid.flatMap(d => [d.h, d.l]).filter(v => v != null)
    : valid.map(d => d.c)
  const pMin = Math.min(...allPrices), pMax = Math.max(...allPrices), span = pMax - pMin || 1
  const padY = span * 0.08
  const yMin = pMin - padY, yMax = pMax + padY, ySpan = yMax - yMin
  const toY = p => PT + chartH - ((p - yMin) / ySpan) * chartH
  const toX = i => (i / (valid.length - 1)) * w

  const ts = valid.map(d => d.t).filter(t => t != null)
  const tSpan = ts.length > 1 ? ts[ts.length - 1] - ts[0] : 0
  const fmtTick = t => {
    if (!t) return ''
    const d = new Date(t * 1000)
    if (tSpan < 2 * 86400) return d.toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit', hour12:false })
    if (tSpan < 180 * 86400) return `${d.getMonth()+1}/${d.getDate()}`
    return `${String(d.getFullYear()).slice(2)}/${String(d.getMonth()+1).padStart(2,'0')}`
  }
  const fmtFull = t => {
    if (!t) return ''
    const d = new Date(t * 1000)
    const date = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
    return tSpan < 2 * 86400
      ? date + ' ' + d.toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit', hour12:false })
      : date
  }
  const lblIdxs = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(p * (ts.length - 1)))
  const H = height

  const onMouseMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const idx = Math.max(0, Math.min(valid.length - 1, Math.round(relX / rect.width * (valid.length - 1))))
    setHoverIdx(idx)
  }

  const hd      = hoverIdx != null ? valid[hoverIdx] : null
  const hx      = hd ? toX(hoverIdx) : null
  const hy      = hd ? toY(hd.c) : null
  const hxPct   = hoverIdx != null ? hoverIdx / (valid.length - 1) * 100 : null
  const ttFlip  = hxPct != null && hxPct > 60

  if (useCandle) {
    const cw = Math.max(1.5, w / valid.length * 0.6)
    return (
      <div ref={ref} style={{ width:'100%', height, position:'relative', cursor:'crosshair' }}
        onMouseMove={onMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} style={{ display:'block' }}>
          {valid.map((d, i) => {
            const x = toX(i), isHov = i === hoverIdx
            const up = (d.c ?? 0) >= (d.o ?? 0)
            const c = up ? conv.upColor : conv.downColor
            const oc1 = Math.min(toY(d.o ?? d.c), toY(d.c))
            const oc2 = Math.max(toY(d.o ?? d.c), toY(d.c))
            return (
              <g key={i} opacity={hoverIdx != null && !isHov ? 0.45 : 1}>
                <line x1={x} x2={x} y1={toY(d.h ?? d.c)} y2={toY(d.l ?? d.c)} stroke={c} strokeWidth="1"/>
                <rect x={x-cw/2} width={cw} y={oc1} height={Math.max(1, oc2-oc1)} fill={c} rx="1"/>
                {isHov && <rect x={x-cw/2-1} width={cw+2} y={oc1-1} height={Math.max(3, oc2-oc1+2)}
                  fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" rx="1"/>}
              </g>
            )
          })}
          {hx != null && <>
            <line x1={hx} x2={hx} y1={PT} y2={PT+chartH} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 3"/>
            <line x1={0} x2={w} y1={hy} y2={hy} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 3"/>
          </>}
          {ts.length > 0 && lblIdxs.map(idx => (
            <text key={idx} x={toX(idx)} y={H-3} textAnchor="middle" fontSize="9"
              fontFamily="var(--font-mono)" fill="var(--text-muted)"
              opacity={hoverIdx != null ? '0.25' : '0.6'}>{fmtTick(ts[idx])}</text>
          ))}
          {hd && hy != null && (() => {
            const tagC = hd.c >= (hd.o ?? hd.c) ? conv.upColor : conv.downColor
            return <>
              <rect x={w-60} y={hy-9} width={60} height={18} fill={tagC} rx="3"/>
              <text x={w-30} y={hy+4.5} textAnchor="middle" fontSize="9.5"
                fontFamily="var(--font-mono)" fill="white" fontWeight="700">
                {hd.c?.toFixed(2) ?? '--'}
              </text>
            </>
          })()}
          {hd?.t && hx != null && (() => {
            const xc = Math.max(42, Math.min(w-42, hx))
            return <>
              <rect x={xc-38} y={H-AXIS_H+1} width={76} height={AXIS_H-1} fill="var(--surface-2)" rx="3"/>
              <text x={xc} y={H-4} textAnchor="middle" fontSize="9"
                fontFamily="var(--font-mono)" fill="var(--text)" fontWeight="600">
                {fmtTick(hd.t)}
              </text>
            </>
          })()}
        </svg>
        {hd && (
          <div className="rc-tt" style={{ left:`${hxPct}%`, transform: ttFlip ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)' }}>
            <div className="rc-tt-date">{fmtFull(hd.t)}</div>
            {[['開盤', hd.o, hd.c >= (hd.o ?? hd.c) ? conv.upColor : conv.downColor],
              ['最高', hd.h, conv.upColor], ['最低', hd.l, conv.downColor],
              ['收盤', hd.c, hd.c >= (hd.o ?? hd.c) ? conv.upColor : conv.downColor]
            ].map(([lbl, val, col]) => (
              <div key={lbl} className="rc-tt-row">
                <span className="rc-tt-lbl">{lbl}</span>
                <span className="rc-tt-val" style={{ color: col }}>{val?.toFixed(2) ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const linePath = valid.map((d, i) => `${i?'L':'M'}${toX(i).toFixed(1)},${toY(d.c).toFixed(1)}`).join(' ')
  const areaPath = `M${toX(0)},${PT+chartH} ` +
    valid.map((d, i) => `L${toX(i).toFixed(1)},${toY(d.c).toFixed(1)}`).join(' ') +
    ` L${toX(valid.length-1)},${PT+chartH} Z`

  return (
    <div ref={ref} style={{ width:'100%', height, position:'relative', cursor:'crosshair' }}
      onMouseMove={onMouseMove} onMouseLeave={() => setHoverIdx(null)}>
      <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} style={{ display:'block' }}>
        <defs>
          <linearGradient id="rc-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {kind !== 'line' && <path d={areaPath} fill="url(#rc-g)"/>}
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        {ts.length > 0 && lblIdxs.map(idx => (
          <text key={idx} x={toX(idx)} y={H-3} textAnchor="middle" fontSize="9"
            fontFamily="var(--font-mono)" fill="var(--text-muted)"
            opacity={hoverIdx != null ? '0.25' : '0.6'}>{fmtTick(ts[idx])}</text>
        ))}
        {hx != null && <>
          <line x1={hx} x2={hx} y1={PT} y2={PT+chartH} stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeDasharray="4 3"/>
          <line x1={0} x2={w} y1={hy} y2={hy} stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="4 3"/>
          <circle cx={hx} cy={hy} r="5" fill={color} stroke="var(--bg)" strokeWidth="2.5"/>
        </>}
        {hd && hy != null && <>
          <rect x={w-60} y={hy-9} width={60} height={18} fill={color} rx="3" opacity="0.92"/>
          <text x={w-30} y={hy+4.5} textAnchor="middle" fontSize="9.5"
            fontFamily="var(--font-mono)" fill="white" fontWeight="700">
            {hd.c?.toFixed(2) ?? '--'}
          </text>
        </>}
        {hd?.t && hx != null && (() => {
          const xc = Math.max(42, Math.min(w-42, hx))
          return <>
            <rect x={xc-38} y={H-AXIS_H+1} width={76} height={AXIS_H-1} fill="var(--surface-2)" rx="3"/>
            <text x={xc} y={H-4} textAnchor="middle" fontSize="9"
              fontFamily="var(--font-mono)" fill="var(--text)" fontWeight="600">
              {fmtTick(hd.t)}
            </text>
          </>
        })()}
      </svg>
      {hd && (
        <div className="rc-tt" style={{ left:`${hxPct}%`, transform: ttFlip ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)' }}>
          <div className="rc-tt-date">{fmtFull(hd.t)}</div>
          <div className="rc-tt-row">
            <span className="rc-tt-lbl">收盤</span>
            <span className="rc-tt-val" style={{ color }}>{hd.c?.toFixed(2) ?? '—'}</span>
          </div>
          {hoverIdx > 0 && valid[hoverIdx-1]?.c != null && (() => {
            const prev = valid[hoverIdx-1].c
            const chg = hd.c - prev
            const pct = chg / prev * 100
            return (
              <div className="rc-tt-row">
                <span className="rc-tt-lbl">漲跌</span>
                <span className="rc-tt-val" style={{ color: chg >= 0 ? conv.upColor : conv.downColor }}>
                  {chg >= 0 ? '+' : ''}{chg.toFixed(2)}<span className="rc-tt-pct"> ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
                </span>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function TFChart({ item, tf, chartType, chartData, chartLoading, height = 300 }) {
  const conv = useConv()
  const color = item.chg >= 0 ? conv.upColor : conv.downColor
  const price = item._price ?? (parseFloat(String(item.val).replace(/,/g, '')) || 100)
  if (chartLoading) {
    return <div style={{ padding:'8px 16px 16px', height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13 }}>載入中…</div>
  }
  if (chartData?.length > 1) {
    return <div style={{ padding:'8px 16px 16px' }}><RealChart data={chartData} color={color} height={height} kind={chartType}/></div>
  }
  const p = TF_PARAMS[tf] || TF_PARAMS['1M']
  const seed = (item.seed || 7) + p.seedOff
  return (
    <div style={{ padding:'8px 16px 16px' }}>
      <BigChart seed={seed} dir={item.chg >= 0 ? 1 : -1} height={height} kind={chartType} len={p.len} drift={p.drift} vol={p.vol} start={price}/>
    </div>
  )
}

// ── SymbolPage ───────────────────────────────────────────────────
export function SymbolPage({ item, onClose, onAddWatch, inWatchlist, onOpenSymbol, onOpenNews, onOpenAlert, groups = [], onSaveGroups, backLabel = '上一頁' }) {
  const conv = useConv()
  const data = useData()
  const [tf, setTf] = useState('3M')
  const [chartType, setChartType] = useState(conv.chartType)
  const [detail, setDetail] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [chartLoading, setChartLoading] = useState(false)
  const [indicatorData, setIndicatorData] = useState(null)
  const [symNews, setSymNews] = useState([])
  const [realPeers, setRealPeers] = useState(null)
  const [etfHoldings, setEtfHoldings] = useState(null)
  const holdingsCache = useRef({})
  const [groupPicker, setGroupPicker] = useState(false)
  const grpRef = useRef(null)
  const kind = classify(item)
  const isStock = kind === 'stock'

  useEffect(() => {
    if (!groupPicker) return
    const h = e => { if (grpRef.current && !grpRef.current.contains(e.target)) setGroupPicker(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [groupPicker])

  const itemGroups = groups.filter(g => g.symbols.some(s => s.symbol === item.rawSym))
  const toggleGroup = (gid) => {
    if (!onSaveGroups) return
    const updated = groups.map(g => {
      if (g.id !== gid) return g
      const has = g.symbols.some(s => s.symbol === item.rawSym)
      return has
        ? { ...g, symbols: g.symbols.filter(s => s.symbol !== item.rawSym) }
        : { ...g, symbols: [...g.symbols, { symbol: item.rawSym, name: item.name || item.sym }] }
    })
    onSaveGroups(updated)
  }
  const globalMatches = (data.news || []).filter(n => n.related?.some(r => r.includes(item.sym) || item.sym.includes(r)))
  const news = [...globalMatches, ...symNews].slice(0, 8)

  useEffect(() => {
    if (!item.rawSym) return
    setDetail(null)
    window.api.fetchDetail(item.rawSym).then(setDetail).catch(() => {})
  }, [item.rawSym])

  useEffect(() => {
    if (!item.rawSym) return
    setIndicatorData(null)
    window.api.fetchChart(item.rawSym, '1y', '1d').then(cd => {
      if (!cd?.length) return
      const closes = cd.map(d => d.c).filter(v => v != null)
      const rsi = calcRSI(closes)
      const macd = calcMACD(closes)
      const kd = calcKD(cd)
      const mas = { 5: calcMA(closes,5), 20: calcMA(closes,20), 60: calcMA(closes,60), 120: calcMA(closes,120), 240: calcMA(closes,240) }
      setIndicatorData({ rsi, macd, kd, mas })
    }).catch(() => {})
  }, [item.rawSym])

  useEffect(() => {
    if (!item.rawSym) return
    setChartData(null)
    setChartLoading(true)
    const p = TF_YAHOO[tf] || TF_YAHOO['1M']
    window.api.fetchChart(item.rawSym, p.range, p.interval)
      .then(cd => setChartData(cd))
      .catch(() => setChartData(null))
      .finally(() => setChartLoading(false))
  }, [item.rawSym, tf])

  useEffect(() => {
    if (!item.rawSym || kind !== 'stock') { setEtfHoldings(null); return }
    if (holdingsCache.current[item.rawSym]) {
      setEtfHoldings(holdingsCache.current[item.rawSym])
    } else {
      setEtfHoldings(null)
    }
    window.api.fetchEtfHoldings(item.rawSym).then(h => {
      if (h?.holdings?.length) {
        holdingsCache.current[item.rawSym] = h
        setEtfHoldings(h)
      }
    }).catch(() => {})
  }, [item.rawSym, kind])

  useEffect(() => {
    if (!item.rawSym || !isStock) return
    setRealPeers(null)
    window.api.fetchPeers(item.rawSym).then(list => {
      if (!list?.length) return
      setRealPeers(list.map(q => ({
        sym: q.symbol, name: q.name,
        val: formatPrice(q.price, q.symbol),
        chg: +(q.changePercent ?? 0).toFixed(2),
        seed: symbolSeed(q.symbol), rawSym: q.symbol,
      })))
    }).catch(() => {})
  }, [item.rawSym, isStock])

  useEffect(() => {
    if (!item.rawSym) return
    setSymNews([])
    window.api.fetchSymbolNews(item.rawSym).then(list => {
      setSymNews((list || []).map((n, i) => ({
        id: `sym-${n.id || i}`, tier: 'std',
        tag: classifyNewsTag(n.title),
        title: n.title, summary: n.summary || '',
        source: n.publisher || 'Yahoo Finance',
        time: timeAgo(n.publishAt),
        related: [item.sym], glossary: [],
        url: n.url, coverUrl: n.coverUrl || null,
      })))
    }).catch(() => {})
  }, [item.rawSym])

  const curPrice  = item._price ?? detail?.currentPrice ?? (parseFloat(String(item.val).replace(/,/g, '')) || 0)
  const displayVal  = (item.val && item.val !== '--') ? item.val : (detail?.currentPrice?.toFixed(2) ?? '--')
  const displayChg  = item.chg !== 0 ? item.chg : (detail?.currentChg ?? 0)
  const displayName = detail?.resolvedName || item.name

  return (
    <div className="sp-page">
      <header className="sp-head">
        <button className="sp-back" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span>返回{backLabel}</span>
        </button>
        <div className="sp-head-mid">
          <div className="sp-id">
            {item.region && <RegionTag code={item.region}/>}
            <span className="sp-sym">{item.sym}</span>
            <span className="sp-name">{displayName}</span>
            <span className="sp-exch">{kind === 'index' ? '指數' : kind === 'forex' ? '即期匯率' : kind === 'commod' ? '期貨' : kind === 'bond' ? '政府公債' : kind === 'crypto' ? '加密貨幣' : item.sym.includes('.TW') ? '臺灣證券交易所' : 'NASDAQ'}</span>
          </div>
        </div>
        <div className="sp-head-r">
          <div className="sp-price-wrap">
            <div className="sp-price">{displayVal}</div>
            <div className="sp-chg" style={{ color: displayChg > 0 ? conv.upColor : displayChg < 0 ? conv.downColor : 'var(--text-muted)' }}>
              {displayChg > 0 ? '+' : ''}{displayChg.toFixed(2)}%
            </div>
          </div>
          <div className="sp-act">
            <button className="primary-btn" onClick={() => onAddWatch(item)} disabled={inWatchlist}>{inWatchlist ? '✓ 已自選' : '＋ 加入自選'}</button>
            {groups.length > 0 && (
              <div className="sp-grp-wrap" ref={grpRef}>
                <button
                  className={`ghost-btn sp-grp-btn ${itemGroups.length > 0 ? 'has-grp' : ''}`}
                  onClick={() => setGroupPicker(v => !v)}
                >
                  {itemGroups.length > 0 && itemGroups.map(g => (
                    <span key={g.id} className="sp-grp-dot-sm" style={{ background: g.color }}/>
                  ))}
                  群組{itemGroups.length > 0 ? ` (${itemGroups.length})` : ''} ▾
                </button>
                {groupPicker && (
                  <div className="sp-grp-drop">
                    <div className="sp-grp-drop-title">加入群組</div>
                    {groups.map(g => {
                      const on = g.symbols.some(s => s.symbol === item.rawSym)
                      return (
                        <button key={g.id} className={`sp-grp-item ${on ? 'on' : ''}`} onClick={() => toggleGroup(g.id)}>
                          <span className="sp-grp-dot" style={{ background: g.color }}/>
                          <span className="sp-grp-name">{g.name}</span>
                          <span className="sp-grp-check">{on ? '✓' : ''}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            <button className="ghost-btn" onClick={() => onOpenAlert(item)}>設定提醒</button>
          </div>
        </div>
      </header>

      <div className="sp-scroll">
        <SPCard kicker="LIVE" title="即時走勢" pad={false}
          action={
            <div className="sp-chart-tools">
              <div className="sp-tf">{['1D','5D','1M','3M','6M','YTD','1Y','5Y','MAX'].map(p => <button key={p} className={`sp-tf-btn ${tf === p ? 'on' : ''}`} onClick={() => setTf(p)}>{p}</button>)}</div>
              <div className="sp-ct">{[{v:'line',l:'折線'},{v:'area',l:'面積'},{v:'candle',l:'K'}].map(o => <button key={o.v} className={`sp-ct-btn ${chartType === o.v ? 'on' : ''}`} onClick={() => setChartType(o.v)}>{o.l}</button>)}</div>
            </div>
          }>
          <div className="sp-quickstat">
            <StatTile label="開盤" value={detail?.open?.toFixed(2) ?? '--'}/>
            <StatTile label="最高" value={detail?.dayHigh?.toFixed(2) ?? '--'}/>
            <StatTile label="最低" value={detail?.dayLow?.toFixed(2) ?? '--'}/>
            <StatTile label="前收" value={detail?.previousClose?.toFixed(2) ?? '--'}/>
            <StatTile label="成交量" value={detail?.volume ? `${(detail.volume/1e6).toFixed(1)}M` : '--'}/>
            <StatTile label="52週高" value={detail?.fiftyTwoWeekHigh?.toFixed(2) ?? '--'}/>
            <StatTile label="52週低" value={detail?.fiftyTwoWeekLow?.toFixed(2) ?? '--'}/>
          </div>
          <TFChart item={item} tf={tf} chartType={chartType} chartData={chartData} chartLoading={chartLoading} height={300}/>
        </SPCard>

        <div className="sp-grid">
          <div className="sp-col">
            <SPCard kicker="TECH" title="技術指標" action={<span className="sp-card-aux">{indicatorData ? '真實數據 · 1Y' : '計算中…'}</span>}>
              {indicatorData ? (
                <div className="sp-tech">
                  {indicatorData.rsi != null && (
                    <div className="sp-tech-row">
                      <div className="sp-tech-l">
                        <div className="sp-tech-name"><GTerm>RSI</GTerm></div>
                        <div className="sp-tech-tag" style={{ color: indicatorData.rsi > 70 ? conv.downColor : indicatorData.rsi < 30 ? conv.upColor : 'var(--text-muted)' }}>
                          {indicatorData.rsi > 70 ? '超買' : indicatorData.rsi < 30 ? '超賣' : '中性'}
                        </div>
                      </div>
                      <div className="sp-tech-r">
                        <div className="sp-tech-val">{indicatorData.rsi.toFixed(1)}</div>
                        <GaugeBar value={indicatorData.rsi} zones={[{from:0,to:30,color:'color-mix(in srgb, var(--green) 25%, transparent)'},{from:70,to:100,color:'color-mix(in srgb, var(--red) 25%, transparent)'}]}/>
                      </div>
                    </div>
                  )}
                  {indicatorData.macd != null && (
                    <div className="sp-tech-row">
                      <div className="sp-tech-l">
                        <div className="sp-tech-name">MACD</div>
                        <div className="sp-tech-tag" style={{ color: indicatorData.macd > 0 ? conv.upColor : conv.downColor }}>{indicatorData.macd > 0 ? '黃金交叉' : '死亡交叉'}</div>
                      </div>
                      <div className="sp-tech-r">
                        <div className="sp-tech-val">{indicatorData.macd > 0 ? '+' : ''}{indicatorData.macd.toFixed(4)}</div>
                        <GaugeBar value={Math.max(-2, Math.min(2, indicatorData.macd))} min={-2} max={2}/>
                      </div>
                    </div>
                  )}
                  {indicatorData.kd != null && (
                    <div className="sp-tech-row">
                      <div className="sp-tech-l">
                        <div className="sp-tech-name">KD</div>
                        <div className="sp-tech-tag">K {indicatorData.kd.k} · D {indicatorData.kd.d}</div>
                      </div>
                      <div className="sp-tech-r">
                        <div className="sp-tech-val">{indicatorData.kd.k > indicatorData.kd.d ? '↗' : '↘'} {indicatorData.kd.k > 80 ? '高檔' : indicatorData.kd.k < 20 ? '低檔' : '中性'}</div>
                        <GaugeBar value={indicatorData.kd.k}/>
                      </div>
                    </div>
                  )}
                  {indicatorData.mas && (
                    <div className="sp-ma">
                      {[5,20,60,120,240].map(n => {
                        const mv = indicatorData.mas[n]
                        if (mv == null) return null
                        const above = curPrice > mv
                        return <div key={n} className="sp-ma-pill"><span className="sp-ma-p">{n}MA</span><span className="sp-ma-v">{mv.toFixed(2)}</span><span className="sp-ma-state" style={{ color: above ? conv.upColor : conv.downColor }}>{above ? '上' : '下'}</span></div>
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="sp-empty" style={{ padding:'32px 0', fontSize:13 }}>技術指標計算中…</div>
              )}
            </SPCard>

            <SPCard kicker="LEARN" title="相關指標教學" action={<span className="sp-card-aux">點擊展開 · 閱讀進度自動儲存</span>}>
              <div className="sp-learn-list">
                {getRelatedCards(kind).map(id => <MiniLearnCard key={id} cardId={id}/>)}
              </div>
            </SPCard>
          </div>

          <div className="sp-col">
            {detail && (detail.dayLow != null) && (
              <SPCard kicker="RANGE" title="價格區間">
                <div className="sp-quote">
                  <RangeRow label="本日區間" lo={detail.dayLow} hi={detail.dayHigh} val={curPrice}/>
                  <RangeRow label="52 週區間" lo={detail.fiftyTwoWeekLow} hi={detail.fiftyTwoWeekHigh} val={curPrice}/>
                </div>
              </SPCard>
            )}

            {etfHoldings && (
              <SPCard kicker="ETF" title="前十大成分股"
                action={<span className="sp-card-aux">{etfHoldings.stockPosition ? `股票 ${etfHoldings.stockPosition}` : 'Yahoo Finance'}</span>}>
                <div className="sp-holdings">
                  {etfHoldings.holdings.slice(0,10).map((h, i) => (
                    <button key={i} className="sp-holding-row" onClick={() => h.symbol && onOpenSymbol({ sym: h.symbol, name: h.name, val: '--', chg: 0, seed: symbolSeed(h.symbol), rawSym: h.symbol })}>
                      <span className="sp-holding-rank">{i + 1}</span>
                      <span className="sp-holding-sym">{h.symbol || '—'}</span>
                      <span className="sp-holding-name">{h.name}</span>
                      <span className="sp-holding-bar-wrap">
                        <span className="sp-holding-bar" style={{ width: `${Math.min(h.pct * 100, 100)}%` }}/>
                      </span>
                      <span className="sp-holding-pct">{h.pctFmt}</span>
                    </button>
                  ))}
                </div>
              </SPCard>
            )}

            {isStock && (
              <SPCard kicker="PEERS" title="同業比較" action={realPeers ? <span className="sp-card-aux">即時數據</span> : <span className="sp-card-aux" style={{ color:'var(--text-muted)' }}>載入中…</span>}>
                {!realPeers ? (
                  <div className="sp-empty" style={{ padding:'32px 0', fontSize:13 }}>載入中…</div>
                ) : realPeers.length === 0 ? (
                  <div className="sp-empty" style={{ padding:'24px 0', fontSize:13 }}>無同業數據</div>
                ) : (
                  <div className="sp-peers">
                    {realPeers.map(p => (
                      <button key={p.sym} className="sp-peer" onClick={() => onOpenSymbol(p)}>
                        <div className="sp-peer-l"><div className="sp-peer-sym">{p.sym}</div><div className="sp-peer-name">{p.name}</div></div>
                        <Sparkline seed={p.seed} dir={p.chg >= 0 ? 1 : -1} chg={p.chg} w={64} h={20} fill/>
                        <div className="sp-peer-r"><div className="sp-peer-val">{p.val}</div><div className="sp-peer-chg" style={{ color: p.chg > 0 ? conv.upColor : conv.downColor }}>{p.chg > 0 ? '+' : ''}{p.chg.toFixed(2)}%</div></div>
                      </button>
                    ))}
                  </div>
                )}
              </SPCard>
            )}

            <SPCard kicker="NEWS" title="相關新聞" action={<span className="sp-card-aux">{news.length} 則</span>}>
              {news.length === 0 ? <div className="sp-empty">尚無相關新聞</div> : (
                <div className="sp-news">
                  {news.map(n => (
                    <button key={n.id} className="sp-news-row" onClick={() => onOpenNews(n)}>
                      <div className="sp-news-tag">{n.tag}</div>
                      <div className="sp-news-title">{n.title}</div>
                      {n.summary && <div className="sp-news-sum">{n.summary}</div>}
                      <div className="sp-news-meta"><span>{n.source}</span><span>·</span><span>{n.time}</span></div>
                    </button>
                  ))}
                </div>
              )}
            </SPCard>
          </div>
        </div>
        <div className="sp-bottom">資料來源：Yahoo Finance · <strong style={{ color:'var(--text)', margin:'0 4px' }}>僅供參考，不構成投資建議</strong></div>
      </div>
    </div>
  )
}
