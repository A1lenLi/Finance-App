import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ConventionCtx, GlossaryCtx, DataContext,
  useConv, useData, seedRand, makeSeries, symbolSeed, timeAgo,
  Sparkline, BigChart, RegionTag, GTerm, LogoMark, SectionTitle,
  LeftNav, WatchRail, TopBar,
  Hero, PulseStrip, MarketMatrix, NewsFeed,
  ModalShell, SettingsModal, NewsDetail, GlossaryPopup, GlossaryIndex, AddWatchModal,
  PortfolioModal, AlertModal, PortfolioBand,
  WatchlistPage,
} from './Finance'
import { LearnPage, MiniLearnCard, CARDS as LEARN_CARDS } from './Learn'

// 個股頁面 → 相關教學卡片 mapping
const LEARN_MAP = {
  stock:   ['candlestick', 'ma', 'rsi', 'macd', 'kd', 'pe-ratio', 'eps'],
  index:   ['indices', 'rsi', 'macd', 'vix', 'market-cycle'],
  forex:   ['forex', 'candlestick', 'ma', 'rsi'],
  commod:  ['candlestick', 'ma', 'rsi', 'macd'],
  crypto:  ['candlestick', 'rsi', 'vix', 'fear-greed'],
  bond:    ['indices', 'vix', 'market-cycle'],
}
function getRelatedCards(kind) {
  return (LEARN_MAP[kind] || LEARN_MAP.stock)
    .filter(id => LEARN_CARDS.some(c => c.id === id))
    .slice(0, 5)
}

// ═══════════════════════════════════════════════════════════════
// SYMBOL PAGE
// ═══════════════════════════════════════════════════════════════
function classify(item) {
  const s = item.sym || ''
  if (/USD|EUR|JPY|GBP|TWD|HKD|CNY|AUD|DXY/.test(s) && /\//.test(s)) return 'forex'
  if (/^US\d|^JP\d|^DE\d|^TW\d/.test(s)) return 'bond'
  if (['WTI','BRENT','GOLD','SILVER','COPPER','NATGAS'].includes(s) || ['CL','BZ','GC','SI','HG','NG','ZC','CT'].includes(s)) return 'commod'
  if (['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX'].includes(s) || /-USD$/.test(s)) return 'crypto'
  if (['SPX','NDX','DJI','TWII','HSI','N225','000300','KOSPI','SX5E','FTSE','DAX','BVSP'].includes(s)) return 'index'
  return 'stock'
}

function synth(item) {
  const r = seedRand((item.seed || 7) * 11)
  const val = parseFloat(String(item.val).replace(/,/g, '')) || 100
  const prev = val - val * item.chg / 100
  const open = prev + (r() - 0.5) * val * 0.005
  const high = Math.max(val, open) * (1 + r() * 0.014)
  const low  = Math.min(val, open) * (1 - r() * 0.012)
  const vol  = Math.floor(r() * 60 + 8)
  const hi52 = val * (1 + r() * 0.32), lo52 = val * (1 - r() * 0.28)
  const rangePos = (val - lo52) / (hi52 - lo52)
  const hist = ['1週','1月','3月','6月','YTD','1年','3年','5年'].map((p, i) => ({ p, pct: +((r() - 0.42) * (i + 1) * 4.5).toFixed(2) }))
  const peers = ['ABC','XYZ','MNO','QRS','TUV'].map((p, i) => ({ sym:p, name:`${p} Inc.`, val:(val*(0.4+r())).toFixed(2), chg:+((r()-0.45)*4).toFixed(2), seed:(item.seed||7)*7+i }))
  const rsi = Math.floor(20 + r() * 60), macd = +((r() - 0.45) * 2).toFixed(2)
  const k = Math.floor(15 + r() * 70), d = Math.floor(20 + r() * 65)
  const chips = [
    { who:'外資',   d1:Math.floor((r()-0.4)*5000),  d5:Math.floor((r()-0.4)*22000), mtd:Math.floor((r()-0.4)*84000) },
    { who:'投信',   d1:Math.floor((r()-0.5)*800),   d5:Math.floor((r()-0.5)*3600),  mtd:Math.floor((r()-0.5)*12000) },
    { who:'自營商', d1:Math.floor((r()-0.5)*1200),  d5:Math.floor((r()-0.5)*5200),  mtd:Math.floor((r()-0.5)*18000) },
  ]
  const quarters = ['24Q2','24Q3','24Q4','25Q1','25Q2','25Q3','25Q4','26Q1']
  const eps = quarters.map((_, i) => +((1.2 + r() * 2 + i * 0.1) * (1 + (r()-0.5)*0.2)).toFixed(2))
  const rev = quarters.map((_, i) => Math.floor(420 + r() * 180 + i * 24))
  const margin = quarters.map(() => +(38 + r() * 14).toFixed(1))
  return { val, prev, open, high, low, vol, hi52, lo52, rangePos, hist, peers, rsi, macd, k, d, chips, quarters, eps, rev, margin }
}

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
function MiniBars({ data, labels, color = 'var(--accent)', fmt = v => v }) {
  const max = Math.max(...data) * 1.15
  return (
    <div className="sp-bars">
      {data.map((v, i) => (
        <div key={i} className="sp-bar-col">
          <div className="sp-bar-val">{fmt(v)}</div>
          <div className="sp-bar-track"><div className="sp-bar-fill" style={{ height:`${(v/max)*100}%`, background:color }}/></div>
          <div className="sp-bar-lbl">{labels[i]}</div>
        </div>
      ))}
    </div>
  )
}

// ── TA calculation utilities ──────────────────────────────────
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

function RealChart({ data, color, height = 300, kind = 'area' }) {
  const conv = useConv()
  const ref = useRef(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    const obs = new ResizeObserver(() => ref.current && setW(ref.current.clientWidth))
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const AXIS_H = 16, PT = 8, PB = 4
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
  const fmtDate = t => {
    const d = new Date(t * 1000)
    if (tSpan < 2 * 86400) return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    if (tSpan < 180 * 86400) return `${d.getMonth() + 1}/${d.getDate()}`
    return `${String(d.getFullYear()).slice(2)}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const lblIdxs = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(p * (ts.length - 1)))
  const H = height

  if (useCandle) {
    const cw = Math.max(1.5, w / valid.length * 0.6)
    return (
      <div ref={ref} style={{ width: '100%', height }}>
        <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} style={{ display: 'block' }}>
          {valid.map((d, i) => {
            const x = toX(i)
            const up = (d.c ?? 0) >= (d.o ?? 0)
            const c = up ? conv.upColor : conv.downColor
            const oc1 = Math.min(toY(d.o ?? d.c), toY(d.c))
            const oc2 = Math.max(toY(d.o ?? d.c), toY(d.c))
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={toY(d.h ?? d.c)} y2={toY(d.l ?? d.c)} stroke={c} strokeWidth="1"/>
                <rect x={x - cw / 2} width={cw} y={oc1} height={Math.max(1, oc2 - oc1)} fill={c}/>
              </g>
            )
          })}
          {ts.length > 0 && lblIdxs.map(idx => (
            <text key={idx} x={toX(idx)} y={H - 2} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-muted)" opacity="0.6">{fmtDate(ts[idx])}</text>
          ))}
        </svg>
      </div>
    )
  }

  const line = valid.map((d, i) => `${i ? 'L' : 'M'}${toX(i).toFixed(1)},${toY(d.c).toFixed(1)}`).join(' ')
  const area = `M${toX(0)},${PT + chartH} ` + valid.map((d, i) => `L${toX(i).toFixed(1)},${toY(d.c).toFixed(1)}`).join(' ') + ` L${toX(valid.length - 1)},${PT + chartH} Z`
  return (
    <div ref={ref} style={{ width: '100%', height }}>
      <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} style={{ display: 'block' }}>
        <defs><linearGradient id="rc-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
        {kind !== 'line' && <path d={area} fill="url(#rc-g)"/>}
        <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        {ts.length > 0 && lblIdxs.map(idx => (
          <text key={idx} x={toX(idx)} y={H - 2} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-muted)" opacity="0.6">{fmtDate(ts[idx])}</text>
        ))}
      </svg>
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
    return (
      <div style={{ padding:'8px 16px 16px' }}>
        <RealChart data={chartData} color={color} height={height} kind={chartType}/>
      </div>
    )
  }
  const p = TF_PARAMS[tf] || TF_PARAMS['1M']
  const seed = (item.seed || 7) + p.seedOff
  return (
    <div style={{ padding:'8px 16px 16px' }}>
      <BigChart seed={seed} dir={item.chg >= 0 ? 1 : -1} height={height} kind={chartType} len={p.len} drift={p.drift} vol={p.vol} start={price}/>
    </div>
  )
}

function SymbolPage({ item, onClose, onAddWatch, inWatchlist, onOpenSymbol, onOpenNews, onOpenAlert }) {
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
  const kind = classify(item)
  const d = useMemo(() => synth(item), [item])
  const isStock = kind === 'stock'
  const globalMatches = (data.news || []).filter(n => n.related?.some(r => r.includes(item.sym) || item.sym.includes(r)))
  const news = [...globalMatches, ...symNews].slice(0, 8)

  useEffect(() => {
    if (!item.rawSym) return
    window.api.fetchDetail(item.rawSym).then(setDetail).catch(() => {})
  }, [item.rawSym])

  useEffect(() => {
    if (!item.rawSym) return
    setIndicatorData(null)
    window.api.fetchChart(item.rawSym, '1y', '1d').then(data => {
      if (!data?.length) return
      const closes = data.map(d => d.c).filter(v => v != null)
      const rsi = calcRSI(closes)
      const macd = calcMACD(closes)
      const kd = calcKD(data)
      const mas = {
        5: calcMA(closes, 5), 20: calcMA(closes, 20),
        60: calcMA(closes, 60), 120: calcMA(closes, 120), 240: calcMA(closes, 240)
      }
      setIndicatorData({ rsi, macd, kd, mas })
    }).catch(() => {})
  }, [item.rawSym])

  useEffect(() => {
    if (!item.rawSym) return
    setChartData(null)
    setChartLoading(true)
    const p = TF_YAHOO[tf] || TF_YAHOO['1M']
    window.api.fetchChart(item.rawSym, p.range, p.interval)
      .then(data => setChartData(data))
      .catch(() => setChartData(null))
      .finally(() => setChartLoading(false))
  }, [item.rawSym, tf])

  useEffect(() => {
    if (!item.rawSym) return
    setRealPeers(null)
    window.api.fetchPeers(item.rawSym).then(list => {
      if (!list?.length) return
      setRealPeers(list.map(q => ({
        sym: q.symbol,
        name: q.name,
        val: formatPrice(q.price, q.symbol),
        chg: +(q.changePercent ?? 0).toFixed(2),
        seed: symbolSeed(q.symbol),
        rawSym: q.symbol,
      })))
    }).catch(() => {})
  }, [item.rawSym])

  useEffect(() => {
    if (!item.rawSym) return
    setSymNews([])
    window.api.fetchSymbolNews(item.rawSym).then(list => {
      setSymNews((list || []).map((n, i) => ({
        id: `sym-${n.id || i}`,
        tier: 'std',
        tag: classifyNewsTag(n.title),
        title: n.title,
        summary: n.summary || '',
        source: n.publisher || 'Yahoo Finance',
        time: timeAgo(n.publishAt),
        related: [item.sym],
        glossary: [],
        url: n.url,
        coverUrl: n.coverUrl || null,
      })))
    }).catch(() => {})
  }, [item.rawSym])

  return (
    <div className="sp-page">
      <header className="sp-head">
        <button className="sp-back" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span>返回脈動</span>
        </button>
        <div className="sp-head-mid">
          <div className="sp-id">
            {item.region && <RegionTag code={item.region}/>}
            <span className="sp-sym">{item.sym}</span><span className="sp-name">{item.name}</span>
            <span className="sp-exch">{kind === 'index' ? '指數' : kind === 'forex' ? '即期匯率' : kind === 'commod' ? '期貨' : kind === 'bond' ? '政府公債' : kind === 'crypto' ? '加密貨幣' : item.sym.includes('.TW') ? '臺灣證券交易所' : 'NASDAQ'}</span>
          </div>
        </div>
        <div className="sp-head-r">
          <div className="sp-price-wrap">
            <div className="sp-price">{item.val}</div>
            <div className="sp-chg" style={{ color: item.chg > 0 ? conv.upColor : item.chg < 0 ? conv.downColor : 'var(--text-muted)' }}>
              {item.chg > 0 ? '+' : ''}{item.chg.toFixed(2)}%
            </div>
          </div>
          <div className="sp-act">
            <button className="primary-btn" onClick={() => onAddWatch(item)} disabled={inWatchlist}>{inWatchlist ? '✓ 已自選' : '＋ 加入自選'}</button>
            <button className="ghost-btn" onClick={() => onOpenAlert(item)}>設定提醒</button>
          </div>
        </div>
      </header>
      <div className="sp-scroll">
        <SPCard kicker="LIVE" title="即時走勢" pad={false}
          action={
            <div className="sp-chart-tools">
              <div className="sp-tf">{['1D','5D','1M','3M','6M','YTD','1Y','5Y','MAX'].map(p => <button key={p} className={`sp-tf-btn ${tf === p ? 'on' : ''}`} onClick={() => setTf(p)}>{p}</button>)}</div>
              <div className="sp-ct">{[{ v:'line', l:'折線' }, { v:'area', l:'面積' }, { v:'candle', l:'K' }].map(o => <button key={o.v} className={`sp-ct-btn ${chartType === o.v ? 'on' : ''}`} onClick={() => setChartType(o.v)}>{o.l}</button>)}</div>
            </div>
          }>
          <div className="sp-quickstat">
            <StatTile label="開盤" value={detail?.open?.toFixed(2) ?? d.open.toFixed(2)}/>
            <StatTile label="最高" value={detail?.dayHigh?.toFixed(2) ?? d.high.toFixed(2)}/>
            <StatTile label="最低" value={detail?.dayLow?.toFixed(2) ?? d.low.toFixed(2)}/>
            <StatTile label="前收" value={detail?.previousClose?.toFixed(2) ?? d.prev.toFixed(2)}/>
            <StatTile label="成交量" value={detail?.volume ? `${(detail.volume/1e6).toFixed(1)}M` : `${d.vol.toFixed(1)}M`}/>
            <StatTile label="52週高" value={detail?.fiftyTwoWeekHigh?.toFixed(2) ?? d.hi52.toFixed(2)}/>
            <StatTile label="52週低" value={detail?.fiftyTwoWeekLow?.toFixed(2) ?? d.lo52.toFixed(2)}/>
          </div>
          <TFChart item={item} tf={tf} chartType={chartType} chartData={chartData} chartLoading={chartLoading} height={300}/>
        </SPCard>

        <div className="sp-grid">
          <div className="sp-col">
            <SPCard kicker="TECH" title="技術指標" action={<span className="sp-card-aux">{indicatorData ? '真實數據 · 1Y' : '計算中…'}</span>}>
              {(() => {
                const rsi = indicatorData?.rsi ?? d.rsi
                const macd = indicatorData?.macd ?? d.macd
                const kd = indicatorData?.kd ?? { k: d.k, d: d.d }
                const MAS = [5, 20, 60, 120, 240]
                const FALLBACKS = [0.012, 0.028, 0.052, 0.084, 0.114]
                const curPrice = item._price ?? (parseFloat(String(item.val).replace(/,/g, '')) || 0)
                return (
                  <div className="sp-tech">
                    <div className="sp-tech-row">
                      <div className="sp-tech-l"><div className="sp-tech-name"><GTerm>RSI</GTerm></div><div className="sp-tech-tag" style={{ color: rsi > 70 ? conv.downColor : rsi < 30 ? conv.upColor : 'var(--text-muted)' }}>{rsi > 70 ? '超買' : rsi < 30 ? '超賣' : '中性'}</div></div>
                      <div className="sp-tech-r"><div className="sp-tech-val">{typeof rsi === 'number' ? rsi.toFixed(1) : rsi}</div><GaugeBar value={rsi} zones={[{ from:0, to:30, color:'color-mix(in srgb, var(--green) 25%, transparent)' }, { from:70, to:100, color:'color-mix(in srgb, var(--red) 25%, transparent)' }]}/></div>
                    </div>
                    <div className="sp-tech-row">
                      <div className="sp-tech-l"><div className="sp-tech-name">MACD</div><div className="sp-tech-tag" style={{ color: macd > 0 ? conv.upColor : conv.downColor }}>{macd > 0 ? '黃金交叉' : '死亡交叉'}</div></div>
                      <div className="sp-tech-r"><div className="sp-tech-val">{macd > 0 ? '+' : ''}{typeof macd === 'number' ? macd.toFixed(4) : macd}</div><GaugeBar value={Math.max(-2, Math.min(2, macd))} min={-2} max={2}/></div>
                    </div>
                    <div className="sp-tech-row">
                      <div className="sp-tech-l"><div className="sp-tech-name">KD</div><div className="sp-tech-tag">K {kd.k} · D {kd.d}</div></div>
                      <div className="sp-tech-r"><div className="sp-tech-val">{kd.k > kd.d ? '↗' : '↘'} {kd.k > 80 ? '高檔' : kd.k < 20 ? '低檔' : '中性'}</div><GaugeBar value={kd.k}/></div>
                    </div>
                    <div className="sp-ma">
                      {MAS.map((n, i) => {
                        const mv = indicatorData?.mas?.[n] ?? (curPrice * (1 - FALLBACKS[i]))
                        const above = curPrice > mv
                        return <div key={n} className="sp-ma-pill"><span className="sp-ma-p">{n}MA</span><span className="sp-ma-v">{mv != null ? mv.toFixed(2) : '--'}</span><span className="sp-ma-state" style={{ color: above ? conv.upColor : conv.downColor }}>{above ? '上' : '下'}</span></div>
                      })}
                    </div>
                  </div>
                )
              })()}
            </SPCard>

            {(isStock || kind === 'index') && (
              <SPCard kicker="CHIPS" title="籌碼面 · 三大法人買賣超" action={<span className="sp-card-aux">單位：張</span>}>
                <table className="sp-chips">
                  <thead><tr><th>法人</th><th>本日</th><th>5 日</th><th>本月累計</th></tr></thead>
                  <tbody>
                    {d.chips.map(c => (
                      <tr key={c.who}>
                        <td className="sp-chips-who">{c.who}</td>
                        {[c.d1, c.d5, c.mtd].map((v, i) => <td key={i} className="sp-chips-num" style={{ color: v > 0 ? conv.upColor : v < 0 ? conv.downColor : 'var(--text-muted)' }}>{v > 0 ? '+' : ''}{v.toLocaleString()}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SPCard>
            )}

            {isStock && (
              <SPCard kicker="FUND" title="基本面 · 季度財報">
                <div className="sp-fund">
                  <div className="sp-fund-block"><div className="sp-fund-h"><span>每股盈餘 EPS</span></div><MiniBars data={d.eps} labels={d.quarters} color={conv.upColor} fmt={v => v.toFixed(2)}/></div>
                  <div className="sp-fund-block"><div className="sp-fund-h"><span>營收（億）</span></div><MiniBars data={d.rev} labels={d.quarters} color="var(--accent)" fmt={v => v}/></div>
                  <div className="sp-fund-block"><div className="sp-fund-h"><span><GTerm>毛利率</GTerm>（%）</span></div><MiniBars data={d.margin} labels={d.quarters} color="#2dd4bf" fmt={v => v.toFixed(0) + '%'}/></div>
                </div>
              </SPCard>
            )}

            <SPCard kicker="PERF" title="歷史報酬">
              <div className="sp-perf">
                {d.hist.map(h => (
                  <div key={h.p} className="sp-perf-cell">
                    <div className="sp-perf-p">{h.p}</div>
                    <div className="sp-perf-v" style={{ color: h.pct > 0 ? conv.upColor : h.pct < 0 ? conv.downColor : 'var(--text-muted)' }}>{h.pct > 0 ? '+' : ''}{h.pct.toFixed(2)}%</div>
                    <div className="sp-perf-bar">
                      <div className="sp-perf-bar-fill" style={{ width:`${Math.min(60, Math.abs(h.pct))}%`, background: h.pct > 0 ? conv.upColor : conv.downColor, marginLeft: h.pct < 0 ? `${50-Math.min(50,Math.abs(h.pct))}%` : '50%' }}/>
                      <div className="sp-perf-bar-axis"/>
                    </div>
                  </div>
                ))}
              </div>
            </SPCard>

            <SPCard kicker="LEARN" title="相關指標教學"
              action={<span className="sp-card-aux">點擊展開 · 閱讀進度自動儲存</span>}>
              <div className="sp-learn-list">
                {getRelatedCards(kind).map(id => (
                  <MiniLearnCard key={id} cardId={id}/>
                ))}
              </div>
            </SPCard>
          </div>

          <div className="sp-col">
            <SPCard kicker="QUOTE" title="即時報價">
              <div className="sp-quote">
                <div className="sp-quote-pair">
                  <div className="sp-quote-side"><div className="sp-quote-label">買價</div><div className="sp-quote-val" style={{ color:conv.upColor }}>{(d.val - 0.01).toFixed(2)}</div></div>
                  <div className="sp-quote-side"><div className="sp-quote-label">賣價</div><div className="sp-quote-val" style={{ color:conv.downColor }}>{(d.val + 0.01).toFixed(2)}</div></div>
                </div>
                <RangeRow label="本日區間" lo={detail?.dayLow ?? d.low} hi={detail?.dayHigh ?? d.high} val={d.val}/>
                <RangeRow label="52 週區間" lo={detail?.fiftyTwoWeekLow ?? d.lo52} hi={detail?.fiftyTwoWeekHigh ?? d.hi52} val={d.val}/>
              </div>
            </SPCard>

            <SPCard kicker="STATS" title="關鍵統計">
              <dl className="sp-kv">
                {[
                  ['市值', isStock ? `${(d.val * 0.012).toFixed(2)}T USD` : '—'],
                  ['本益比 P/E', isStock ? (12 + (d.rsi % 20)).toFixed(1) : '—'],
                  ['股息殖利率', isStock ? `${(0.8 + (d.d % 4)).toFixed(2)}%` : '—'],
                  ['Beta', (0.6 + d.rsi / 100).toFixed(2)],
                  ['週轉率', `${(d.vol / 200).toFixed(2)}%`],
                ].map(([k, v]) => <div key={k} className="sp-kv-row"><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            </SPCard>

            {isStock && (
              <SPCard kicker="PEERS" title="同業比較" action={realPeers ? <span className="sp-card-aux">即時數據</span> : <span className="sp-card-aux" style={{ color:'var(--text-muted)' }}>載入中…</span>}>
                <div className="sp-peers">
                  {(realPeers ?? d.peers).map(p => (
                    <button key={p.sym} className="sp-peer" onClick={() => onOpenSymbol(p)}>
                      <div className="sp-peer-l"><div className="sp-peer-sym">{p.sym}</div><div className="sp-peer-name">{p.name}</div></div>
                      <Sparkline seed={p.seed} dir={p.chg >= 0 ? 1 : -1} chg={p.chg} w={64} h={20} fill/>
                      <div className="sp-peer-r"><div className="sp-peer-val">{p.val}</div><div className="sp-peer-chg" style={{ color: p.chg > 0 ? conv.upColor : conv.downColor }}>{p.chg > 0 ? '+' : ''}{p.chg.toFixed(2)}%</div></div>
                    </button>
                  ))}
                </div>
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

// ═══════════════════════════════════════════════════════════════
// STATIC MOCK DATA
// ═══════════════════════════════════════════════════════════════
const MOCK_CRYPTO = [
  { sym:'BTC',  name:'Bitcoin',   val:'68,420', chg: 2.35, mcap:'1.34T', seed:173 },
  { sym:'ETH',  name:'Ethereum',  val:'3,842',  chg: 1.81, mcap:'462B',  seed:179 },
  { sym:'SOL',  name:'Solana',    val:'174.2',  chg: 4.21, mcap:'82B',   seed:181 },
  { sym:'BNB',  name:'BNB',       val:'612.4',  chg: 0.92, mcap:'94B',   seed:191 },
  { sym:'XRP',  name:'Ripple',    val:'0.5421', chg:-1.24, mcap:'31B',   seed:193 },
  { sym:'ADA',  name:'Cardano',   val:'0.4823', chg: 0.34, mcap:'17B',   seed:197 },
  { sym:'DOGE', name:'Dogecoin',  val:'0.1742', chg: 3.14, mcap:'25B',   seed:199 },
  { sym:'AVAX', name:'Avalanche', val:'38.4',   chg: 1.12, mcap:'15B',   seed:211 },
]
const MOCK_CALENDAR = [
  { date:'05.20', day:'三', time:'02:00', region:'US', evt:'Fed 主席 Powell 演講',  imp:3, prev:'—',    est:'—'    },
  { date:'05.20', day:'三', time:'20:30', region:'US', evt:'4 月成屋銷售',           imp:2, prev:'4.19M', est:'4.22M' },
  { date:'05.21', day:'四', time:'02:00', region:'US', evt:'FOMC 5 月會議紀要',     imp:3, prev:'—',    est:'—'    },
  { date:'05.22', day:'五', time:'20:30', region:'US', evt:'上週初領失業金',         imp:2, prev:'231K',  est:'220K'  },
  { date:'05.22', day:'五', time:'21:45', region:'US', evt:'5 月 PMI 初值',          imp:3, prev:'51.2',  est:'51.5'  },
]
const MOCK_SENTIMENT = {
  vix: { val:14.82, chg:-1.24, state:'低' },
  fearGreed: { val:72, state:'greed', text:'貪婪' },
  advDec: { adv:1842, dec:632, unch:124 },
  putCall: { val:0.82, chg:-0.04 },
  highsLows: { newHigh:124, newLow:18 },
  breadth: { val:68 },
}
const MOCK_PORTFOLIO = { totalValue:1284530, todayChg:12840, todayPct:1.01, totalPnL:184320, totalPnLPct:16.74 }
const MOCK_NEWS = [
  { id:'n1', tier:'hero',  tag:'頭條', title:'輝達財報遠超預期，AI 資本支出延燒至 2026 下半年', summary:'NVDA Q1 營收 320 億美元、年增 78%，毛利率穩在 74% 高檔。', source:'路透社', time:'12 分鐘前', related:['NVDA','TSMC'], impact:{ sym:'NDX', dir:1, chg:'+1.81%' }, glossary:['毛利率','資本支出'] },
  { id:'n2', tier:'major', tag:'央行', title:'Fed 會議紀要顯示 6 月有降息空間，市場押注機率突破 70%', summary:'FOMC 5 月會議紀要透露多數委員認為通膨已朝目標收斂，降息 25bp 機率攀升至 72%。', source:'Bloomberg', time:'32 分鐘前', related:['SPX','US10Y'], impact:{ sym:'US10Y', dir:-1, chg:'−6 bp' }, glossary:['FOMC','bp'] },
  { id:'n3', tier:'major', tag:'匯市', title:'新台幣升破 31.5 元，央行升匯壓力釋放', summary:'美元指數走弱，新台幣早盤強升 4 分至 31.42。', source:'工商時報', time:'1 小時前', related:['USD/TWD','TWII'], impact:{ sym:'USD/TWD', dir:-1, chg:'−0.40%' }, glossary:['美元指數','拋匯'] },
  { id:'n4', tier:'std',   tag:'原物料', title:'OPEC+ 維持自願性減產到第四季，油價反彈', source:'CNBC', time:'2 小時前', related:['WTI'], impact:{ sym:'WTI', dir:1, chg:'+0.92%' }, glossary:['OPEC+'] },
  { id:'n5', tier:'std',   tag:'科技', title:'台積電 4 月營收月減 2%，仍年增 60%', source:'經濟日報', time:'3 小時前', related:['2330.TW','TWII'], impact:{ sym:'2330.TW', dir:1, chg:'+0.84%' }, glossary:['年增'] },
  { id:'n6', tier:'std',   tag:'加密', title:'BTC 重返 6.8 萬美元，現貨 ETF 連兩日淨流入', source:'CoinDesk', time:'4 小時前', related:['BTC'], impact:{ sym:'BTC', dir:1, chg:'+2.35%' }, glossary:['現貨 ETF'] },
]
const MOCK_TODAY_STORY = {
  date:'2026.05.20', weekday:'週二', time:'14:32', tz:'GMT+8', kicker:'本日重點',
  headline:'美科技股創高、Fed 鴿派轉向期待升溫，新台幣強升 0.4%',
  subhead:'輝達 Q1 財報超預期帶動 Nasdaq 收高 1.8%，市場押注 6 月降息機率突破 70%；美元指數走弱拖累亞幣全面走強。',
  tags:['Fed','輝達','台積電','USD/TWD'],
  bullets:[
    { label:'S&P 500',    value:'5,847.12', chg:'+1.24%', dir:1 },
    { label:'Nasdaq',     value:'19,213.4', chg:'+1.81%', dir:1 },
    { label:'10Y 殖利率', value:'4.18%',    chg:'−0.06',  dir:-1 },
    { label:'USD / TWD',  value:'31.42',    chg:'−0.40%', dir:-1 },
    { label:'WTI 原油',   value:'78.34',    chg:'+0.92%', dir:1 },
    { label:'BTC',        value:'68,420',   chg:'+2.35%', dir:1 },
  ],
}
const WEEKDAYS = ['日','一','二','三','四','五','六']
const BULLET_CFG = [
  { sym:'SPX',     label:'S&P 500' },
  { sym:'NDX',     label:'Nasdaq' },
  { sym:'TWII',    label:'台股加權' },
  { sym:'USD/TWD', label:'USD / TWD' },
  { sym:'WTI',     label:'WTI 原油' },
  { sym:'BTC',     label:'BTC' },
]

function buildTodayStory(news, indices, forex, commodities, crypto) {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const date = `${yyyy}.${mm}.${dd}`
  const weekday = `週${WEEKDAYS[now.getDay()]}`
  const time = now.toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit', hour12:false })

  const hero = news[0]
  const headline = hero?.title || '市場資料載入中…'
  const subhead = hero?.summary || news[1]?.title || ''
  const kicker = hero?.source || '本日重點'
  const tags = [...new Set(news.slice(0, 6).map(n => n.tag).filter(Boolean))].slice(0, 5)

  const allRows = [...(indices || []), ...(forex || []), ...(commodities || []), ...(crypto || [])]
  const bullets = BULLET_CFG.map(({ sym, label }) => {
    const r = allRows.find(row => row.sym === sym)
    if (!r || r.val === '--') return null
    const dir = r.chg > 0 ? 1 : r.chg < 0 ? -1 : 0
    const chg = `${r.chg > 0 ? '+' : ''}${r.chg.toFixed(2)}%`
    return { label, value: r.val, chg, dir }
  }).filter(Boolean)

  return { date, weekday, time, tz:'GMT+8', kicker, headline, subhead, tags, bullets }
}

const GLOSSARY = {
  'FOMC':'聯邦公開市場委員會（Federal Open Market Committee），每年召開 8 次會議，決定聯邦資金利率目標。',
  'bp':'基點（basis point）。1 基點 = 0.01%。常用於描述利率或殖利率的小幅變動。',
  '毛利率':'營收扣除直接成本後的比率。高毛利率代表產品定價能力強或成本控制好。',
  '資本支出':'企業為購置長期資產的支出，常稱 CapEx。',
  '主權 AI':'由國家或政府主導建置的 AI 基礎設施，確保數據與運算主權。',
  '會議紀要':'FOMC 開會三週後公布的會議內容詳細紀錄（Minutes）。',
  '美元指數':'DXY，衡量美元相對於六種主要貨幣的綜合強弱。指數上升 = 美元走強。',
  '調節':'央行進入外匯市場買賣外幣以影響匯率的動作。',
  '拋匯':'出口商或外資將外幣兌換成本國貨幣的動作。',
  'OPEC+':'石油輸出國家組織加上俄羅斯等非 OPEC 產油國組成的聯盟。',
  '自願性減產':'OPEC+ 部分成員國在組織配額外額外宣布的自主減產。',
  '月減':'較上月（Month-over-Month, MoM）的變化幅度。',
  '年增':'較去年同期（Year-over-Year, YoY）的變化幅度。',
  '現貨 ETF':'直接持有現貨資產的交易所交易基金。',
  '淨流入':'ETF 申購金額減去贖回金額的淨值。',
  'YCC':'殖利率曲線控制（Yield Curve Control），日本央行 2024 年起逐步退場。',
  '殖利率':'公債持有至到期的年化報酬率。殖利率上升 = 債券價格下跌。',
  '波動率指數':'VIX，反映 S&P 500 未來 30 天的隱含波動率，俗稱「恐慌指數」。',
  '恐慌貪婪指數':'CNN Money 編製的市場情緒指標，0 = 極度恐慌、100 = 極度貪婪。',
  '漲跌家數':'當日上漲家數與下跌家數的比較。',
  'Put/Call 比':'選擇權市場中賣權與買權的成交比。比值高 = 避險需求強。',
  '市場廣度':'衡量上漲股票佔總股票的比例。',
  '降息':'中央銀行調降基準利率。',
  'RSI':'相對強弱指標（Relative Strength Index），衡量超買超賣程度。>70 超買，<30 超賣。',
}

// ═══════════════════════════════════════════════════════════════
// IPC ADAPTERS
// ═══════════════════════════════════════════════════════════════
const DISPLAY_SYM = {
  '^GSPC':'SPX',    '^DJI':'DJI',     '^IXIC':'NDX',    '^TWII':'TWII',
  '^N225':'N225',   '^HSI':'HSI',     '^GDAXI':'DAX',   '^FTSE':'FTSE',
  'USDTWD=X':'USD/TWD', 'EURUSD=X':'EUR/USD', 'USDJPY=X':'USD/JPY',
  'GBPUSD=X':'GBP/USD', 'USDCNY=X':'USD/CNY', 'AUDUSD=X':'AUD/USD',
  'CL=F':'WTI',    'BZ=F':'BRENT',   'GC=F':'GOLD',    'SI=F':'SILVER',
  'NG=F':'NATGAS', 'HG=F':'COPPER',
  '^TNX':'US10Y',  '^FVX':'US5Y',    '^TYX':'US30Y',   '^IRX':'US3M',
  'BTC-USD':'BTC', 'ETH-USD':'ETH',  'SOL-USD':'SOL',  'BNB-USD':'BNB',
  'XRP-USD':'XRP', 'ADA-USD':'ADA',  'DOGE-USD':'DOGE','AVAX-USD':'AVAX',
}
const REGION_MAP = {
  '^GSPC':'US', '^DJI':'US',  '^IXIC':'US', '^TWII':'TW', '^N225':'JP',
  '^HSI':'HK',  '^GDAXI':'DE', '^FTSE':'UK',
  'USDTWD=X':'TW', 'EURUSD=X':'EU', 'USDJPY=X':'JP', 'GBPUSD=X':'UK', 'USDCNY=X':'CN', 'AUDUSD=X':'AU',
  'CL=F':'US', 'BZ=F':'EU', 'GC=F':'US', 'SI=F':'US', 'NG=F':'US', 'HG=F':'US',
  '^TNX':'US', '^FVX':'US', '^TYX':'US', '^IRX':'US',
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
function formatMcap(mc) {
  if (!mc) return '--'
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`
  if (mc >= 1e9)  return `$${(mc / 1e9).toFixed(0)}B`
  return `$${(mc / 1e6).toFixed(0)}M`
}
function toRow(item) {
  return {
    sym: DISPLAY_SYM[item.symbol] || item.symbol,
    name: item.name,
    val: item.error ? '--' : formatPrice(item.price, item.symbol),
    chg: item.error ? 0 : (item.changePercent ?? 0),
    seed: symbolSeed(item.symbol),
    region: REGION_MAP[item.symbol],
    rawSym: item.symbol,
    _price: item.price,
  }
}
function toCryptoRow(item) {
  return { ...toRow(item), mcap: formatMcap(item.marketCap) }
}
function classifyNewsTag(title) {
  if (/央行|Fed|FOMC|利率|降息|升息|貨幣政策|鮑爾|Powell|聯準會|ECB|BOJ/.test(title)) return '央行'
  if (/匯率|美元|外匯|匯市|新台幣|人民幣|日圓|歐元|英鎊|澳幣|強升|弱勢|升值|貶值/.test(title)) return '匯市'
  if (/比特幣|BTC|以太|ETH|加密|虛擬貨幣|Crypto|USDT|Web3|NFT|幣圈/.test(title)) return '加密'
  if (/半導體|AI|人工智慧|科技|台積電|TSMC|輝達|NVIDIA|蘋果|Apple|Google|Meta|Amazon|Microsoft|三星|晶片|雲端|伺服器/.test(title)) return '科技'
  return '財經'
}
function adaptNews(n, i) {
  const related = (n.stocks || []).map(s => /^\d/.test(s) ? s + '.TW' : s)
  return {
    id: String(n.id || i),
    tier: i === 0 ? 'hero' : i < 4 ? 'major' : 'std',
    tag: classifyNewsTag(n.title),
    title: n.title,
    summary: n.summary || '',
    source: '鉅亨網',
    time: timeAgo(n.publishAt),
    related,
    impact: null,
    glossary: [],
    url: n.url,
    coverUrl: n.coverUrl,
  }
}

// ═══════════════════════════════════════════════════════════════
// TWEAKS / THEMES
// ═══════════════════════════════════════════════════════════════
const THEMES = {
  blue:  { accent:'#3b82f6', accent2:'#2563eb', tint:'rgba(59,130,246,0.10)' },
  teal:  { accent:'#2dd4bf', accent2:'#14b8a6', tint:'rgba(45,212,191,0.10)' },
  amber: { accent:'#f59e0b', accent2:'#d97706', tint:'rgba(245,158,11,0.10)' },
}
const CONVENTIONS = {
  green_up: { up:'#10b981', down:'#ef4444' },
  red_up:   { up:'#ef4444', down:'#10b981' },
}
const TWEAK_DEFAULTS = { theme:'blue', convention:'red_up', density:'regular', chartType:'area', sidebar:true, leftNav:true }

function useTweaks(defaults) {
  const KEY = 'wf-tweaks'
  const [t, setT] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') } }
    catch { return defaults }
  })
  const setTweak = useCallback((key, value) => {
    if (typeof key === 'object') {
      setT(key); localStorage.setItem(KEY, JSON.stringify(key))
    } else {
      setT(prev => { const next = { ...prev, [key]: value }; localStorage.setItem(KEY, JSON.stringify(next)); return next })
    }
  }, [])
  return [t, setTweak]
}

function usePortfolio() {
  const KEY = 'wf-portfolio'
  const [holdings, setHoldings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })
  const save = (h) => { setHoldings(h); localStorage.setItem(KEY, JSON.stringify(h)) }
  return [holdings, save]
}

function useAlerts() {
  const KEY = 'wf-alerts'
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })
  const save = (a) => { setAlerts(a); localStorage.setItem(KEY, JSON.stringify(a)) }
  return [alerts, save]
}

// ═══════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const [marketData, setMarketData] = useState(null)
  const [sparklines, setSparklines] = useState({})
  const [watchlistMeta, setWatchlistMeta] = useState([])
  const [watchlistData, setWatchlistData] = useState([])
  const [news, setNews] = useState(MOCK_NEWS)
  const [loading, setLoading] = useState(false)
  const [activeNav, setActiveNav] = useState('feed')
  const [matrixTab, setMatrixTab] = useState('indices')
  const [leftCollapsed, setLeftCollapsed] = useState(!t.leftNav)
  const [rightCollapsed, setRightCollapsed] = useState(!t.sidebar)
  const [symbolPage, setSymbolPage] = useState(null)
  const [watchlistPage, setWatchlistPage] = useState(false)
  const [learnPage, setLearnPage] = useState(false)
  const [newsModal, setNewsModal] = useState(null)
  const [glossPopup, setGlossPopup] = useState(null)
  const [glossIndex, setGlossIndex] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [alertItem, setAlertItem] = useState(null)
  const [firedAlerts, setFiredAlerts] = useState([])
  const [externalSentiment, setExternalSentiment] = useState(null)
  const [holdings, saveHoldings] = usePortfolio()
  const [alerts, saveAlerts] = useAlerts()

  useEffect(() => { setLeftCollapsed(!t.leftNav) }, [t.leftNav])
  useEffect(() => { setRightCollapsed(!t.sidebar) }, [t.sidebar])

  const loadMarketData = useCallback(async () => {
    setLoading(true)
    try {
      const [md, wlData] = await Promise.all([
        window.api.fetchMarketData(),
        window.api.fetchWatchlistData(),
      ])
      setMarketData(md)
      setWatchlistData((wlData || []).map(toRow))
      // fetch sparklines for all market symbols in background
      const allSymbols = [
        ...(md?.indices || []), ...(md?.forex || []),
        ...(md?.commodities || []), ...(md?.bonds || []),
        ...(md?.crypto || []),
      ].filter(s => !s.error).map(s => s.symbol)
      if (allSymbols.length) {
        window.api.fetchSparklines(allSymbols).then(data => setSparklines(data)).catch(() => {})
      }
    } catch (e) { console.error('fetchMarketData failed', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    window.api.getWatchlist().then(list => setWatchlistMeta(list || []))
    loadMarketData()
    window.api.fetchNews('tw_stock').then(items => {
      if (items?.length) setNews(items.map(adaptNews))
    }).catch(() => {})
    window.api.fetchSentiment().then(s => { if (s) setExternalSentiment(s) }).catch(() => {})
  }, [loadMarketData])

  useEffect(() => {
    const id = setInterval(loadMarketData, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadMarketData])

  useEffect(() => {
    if (!alerts.length || !marketData) return
    const allRows = [...indices, ...forex, ...commodities, ...treasuries, ...cryptoRows, ...watchlistData]
    const fired = []
    const remaining = alerts.filter(a => {
      const row = allRows.find(r => r.rawSym === a.rawSym)
      if (!row || row._price == null) return true
      const triggered = a.direction === 'above' ? row._price >= a.price : row._price <= a.price
      if (triggered) fired.push({ ...a, currentPrice: row._price, val: row.val })
      return !triggered
    })
    if (fired.length) {
      setFiredAlerts(f => [...f, ...fired])
      saveAlerts(remaining)
    }
  }, [marketData])

  const handleAdd = useCallback(async (item) => {
    const sym = item.rawSym || item.sym
    if (!sym || watchlistMeta.some(w => w.symbol === sym)) return   // 防止重複加入
    const newMeta = [...watchlistMeta, { symbol: sym, name: item.name }]
    setWatchlistMeta(newMeta)
    await window.api.saveWatchlist(newMeta)
    const wlData = await window.api.fetchWatchlistData()
    setWatchlistData((wlData || []).map(toRow))
  }, [watchlistMeta])

  const handleRemove = useCallback(async (item) => {
    const sym = item.rawSym || item.sym
    const newMeta = watchlistMeta.filter(w => w.symbol !== sym)
    setWatchlistMeta(newMeta)
    setWatchlistData(prev => prev.filter(w => w.rawSym !== sym))
    await window.api.saveWatchlist(newMeta)
  }, [watchlistMeta])

  const indices     = (marketData?.indices     || []).map(toRow)
  const forex       = (marketData?.forex       || []).map(toRow)
  const commodities = (marketData?.commodities || []).map(toRow)
  const treasuries  = (marketData?.bonds       || []).map(toRow)
  const cryptoRows  = (marketData?.crypto      || []).map(toCryptoRow)

  const sentimentData = useMemo(() => {
    const vixItem = marketData?.vix
    const vixVal = (vixItem && !vixItem.error) ? +(vixItem.price ?? MOCK_SENTIMENT.vix.val).toFixed(2) : MOCK_SENTIMENT.vix.val
    const vixChg = (vixItem && !vixItem.error) ? +(vixItem.changePercent ?? MOCK_SENTIMENT.vix.chg).toFixed(2) : MOCK_SENTIMENT.vix.chg
    const vixState = vixVal < 15 ? '低' : vixVal < 25 ? '中' : '高'
    let fearGreed = externalSentiment?.stockFG
    if (!fearGreed) {
      const fgVal = Math.round(Math.max(0, Math.min(100, 90 - (vixVal - 10) * 2.5)))
      const fgText = fgVal > 75 ? '極度貪婪' : fgVal > 55 ? '貪婪' : fgVal > 45 ? '中性' : fgVal > 25 ? '恐慌' : '極度恐慌'
      fearGreed = { val: fgVal, state: fgVal > 55 ? 'greed' : fgVal > 45 ? 'neutral' : 'fear', text: fgText }
    }
    return { ...MOCK_SENTIMENT, vix: { val: vixVal, chg: vixChg, state: vixState }, fearGreed }
  }, [marketData, externalSentiment])

  const portfolio = useMemo(() => {
    if (!holdings.length) return null
    const allRows = [...indices, ...forex, ...commodities, ...treasuries, ...cryptoRows, ...watchlistData]
    let totalValue = 0, totalCost = 0, todayGain = 0
    const positions = holdings.map(h => {
      const row = allRows.find(r => r.rawSym === h.rawSym)
      const price = row?._price ?? h.avgCost
      const prevPrice = price / (1 + (row?.chg ?? 0) / 100)
      const value = price * h.qty
      const cost = h.avgCost * h.qty
      const pnl = value - cost
      const todayPnl = (price - prevPrice) * h.qty
      totalValue += value; totalCost += cost; todayGain += todayPnl
      return { ...h, price, val: row?.val ?? '--', chg: row?.chg ?? 0, value, pnl, pnlPct: cost ? pnl / cost * 100 : 0, todayPnl }
    })
    const totalPnL = totalValue - totalCost
    const prevTotal = totalValue - todayGain
    return { positions, totalValue, todayChg: todayGain, todayPct: prevTotal ? todayGain / prevTotal * 100 : 0, totalPnL, totalPnLPct: totalCost ? totalPnL / totalCost * 100 : 0 }
  }, [holdings, indices, forex, commodities, treasuries, cryptoRows, watchlistData])

  const convention = CONVENTIONS[t.convention]
  const convValue = useMemo(() => ({ upColor:convention.up, downColor:convention.down, density:t.density, chartType:t.chartType }), [convention, t.density, t.chartType])
  const glossValue = useMemo(() => ({ open: (term) => setGlossPopup(term) }), [])
  const themeStyle = useMemo(() => {
    const th = THEMES[t.theme] || THEMES.blue
    return { '--accent':th.accent, '--accent-2':th.accent2, '--accent-tint':th.tint, '--green':convention.up, '--red':convention.down }
  }, [t.theme, convention])

  const todayStory = useMemo(
    () => buildTodayStory(news, indices, forex, commodities, MOCK_CRYPTO),
    [news, indices, forex, commodities]
  )

  const dataValue = useMemo(() => ({
    todayStory,
    pulseStrip: indices.length ? indices : [],
    indices, forex, commodities,
    treasuries,
    crypto: cryptoRows.length ? cryptoRows : MOCK_CRYPTO,
    news,
    calendar: MOCK_CALENDAR,
    sentiment: sentimentData,
    portfolio,
    glossary: GLOSSARY,
    sparklines,
  }), [todayStory, indices, forex, commodities, treasuries, cryptoRows, sentimentData, portfolio, news, sparklines])

  const onNavSelect = (item) => {
    setActiveNav(item.id)
    setSymbolPage(null)
    if (item.section === 'watch') {
      setWatchlistPage(true)
      setLearnPage(false)
    } else if (item.section === 'learn') {
      setLearnPage(true)
      setWatchlistPage(false)
    } else {
      setWatchlistPage(false)
      setLearnPage(false)
      if (item.section === 'market') { setMatrixTab(item.tab); scrollTo('section-market') }
      else if (item.section === 'pulse') scrollTo('section-hero')
      else if (item.section === 'news') scrollTo('section-news')
    }
  }
  const scrollTo = (id) => setTimeout(() => {
    const el = document.getElementById(id), main = document.querySelector('.main')
    if (el && main) main.scrollTo({ top: el.offsetTop - 12, behavior:'smooth' })
  }, 30)

  return (
    <ConventionCtx.Provider value={convValue}>
      <GlossaryCtx.Provider value={glossValue}>
        <DataContext.Provider value={dataValue}>
          <div className="app" data-theme={t.theme} data-density={t.density} style={themeStyle}>

            <div className="titlestrip">
              <div className="tl-dots">
                <button className="tl-dot tl-r" aria-label="close"/>
                <button className="tl-dot tl-y" aria-label="minimize"/>
                <button className="tl-dot tl-g" aria-label="maximize"/>
              </div>
              <div className="tl-title">財經脈動 <em>Worldwide Finance · v2.6.0</em></div>
            </div>

            <TopBar
              onSearch={q => { if (GLOSSARY[q]) setGlossPopup(q); else setAddModal(true) }}
              onGlossary={() => setGlossIndex(true)}
              onSettings={() => setSettingsOpen(true)}
              onRefresh={loadMarketData}
              onToggleLeft={() => { setLeftCollapsed(v => !v); setTweak('leftNav', leftCollapsed) }}
              onPortfolio={() => setPortfolioOpen(true)}
              density={t.density}
              onCycleDensity={() => {
                const order = ['compact','regular','comfy']
                setTweak('density', order[(order.indexOf(t.density) + 1) % order.length])
              }}
            />

            <LeftNav active={activeNav} onSelect={onNavSelect} collapsed={leftCollapsed}/>

            <main className="main">
              {symbolPage ? (
                <SymbolPage
                  item={symbolPage}
                  onClose={() => { setSymbolPage(null) }}
                  onAddWatch={handleAdd}
                  inWatchlist={watchlistData.some(w => w.rawSym === symbolPage.rawSym)}
                  onOpenSymbol={setSymbolPage}
                  onOpenNews={setNewsModal}
                  onOpenAlert={setAlertItem}
                />
              ) : learnPage ? (
                <LearnPage/>
              ) : watchlistPage ? (
                <WatchlistPage
                  items={watchlistData}
                  onAdd={() => setAddModal(true)}
                  onSelect={item => { setSymbolPage(item) }}
                  onRemove={handleRemove}
                />
              ) : (
                <>
                  <div id="section-hero"><Hero onOpenNews={setNewsModal}/></div>
                  <PulseStrip onSelect={setSymbolPage}/>
                  <div id="section-market">
                    <MarketMatrix onSelect={setSymbolPage} defaultTab={matrixTab} key={matrixTab}/>
                  </div>
                  <PortfolioBand onManage={() => setPortfolioOpen(true)}/>
                  <div id="section-news"><NewsFeed onOpen={setNewsModal}/></div>
                  <footer style={{ padding:'20px 4px', fontSize:11, color:'var(--text-muted)', textAlign:'center', borderTop:'1px solid var(--border)', marginTop:8 }}>
                    資料來源：Yahoo Finance｜點擊任意項目查看詳情｜<strong style={{ color:'var(--text)' }}>僅供參考，不構成投資建議</strong>
                  </footer>
                </>
              )}
            </main>

            <WatchRail
              items={watchlistData}
              onAdd={() => setAddModal(true)}
              onSelect={setSymbolPage}
              onRemove={handleRemove}
              collapsed={rightCollapsed}
              onToggle={() => { setRightCollapsed(v => !v); setTweak('sidebar', rightCollapsed) }}
            />

            {newsModal && <NewsDetail news={newsModal} onClose={() => setNewsModal(null)}/>}
            {glossPopup && <GlossaryPopup term={glossPopup} onClose={() => setGlossPopup(null)} onJump={setGlossPopup}/>}
            {glossIndex && <GlossaryIndex onClose={() => setGlossIndex(false)} onPick={t => { setGlossPopup(t); setGlossIndex(false) }}/>}
            {addModal && <AddWatchModal onClose={() => setAddModal(false)} onAdd={handleAdd} existingSymbols={watchlistMeta.map(w => w.symbol)}/>}
            {settingsOpen && <SettingsModal t={t} setTweak={setTweak} themes={THEMES} onReset={() => setTweak(TWEAK_DEFAULTS)} onClose={() => setSettingsOpen(false)}/>}
            {portfolioOpen && <PortfolioModal holdings={holdings} onSave={saveHoldings} onClose={() => setPortfolioOpen(false)}/>}
            {alertItem && <AlertModal item={alertItem} alerts={alerts} onSave={saveAlerts} onClose={() => setAlertItem(null)}/>}
            {firedAlerts.length > 0 && (
              <div className="alert-toast-stack">
                {firedAlerts.map(a => (
                  <div key={a.id} className="alert-toast">
                    <div className="at-head"><span className="at-sym">{a.sym}</span><button className="at-x" onClick={() => setFiredAlerts(f => f.filter(x => x.id !== a.id))}>×</button></div>
                    <div className="at-msg">{a.direction === 'above' ? '突破' : '跌破'} <strong>{a.price.toFixed(2)}</strong></div>
                    <div className="at-cur">現價 {a.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DataContext.Provider>
      </GlossaryCtx.Provider>
    </ConventionCtx.Provider>
  )
}
