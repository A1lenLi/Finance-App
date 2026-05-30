import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ConventionCtx, GlossaryCtx, DataContext,
  symbolSeed, timeAgo,
  LeftNav, WatchRail, TopBar,
  Hero, PulseStrip, MarketMatrix, NewsFeed,
  PortfolioBand, WatchlistPage,
} from './Finance'
import {
  SettingsModal, NewsDetail, GlossaryPopup, GlossaryIndex,
  PortfolioModal, AlertModal, AddWatchModal, GroupManagerModal,
} from './Modals'
import { LearnPage } from './Learn'
import { SymbolPage } from './SymbolPage'

// ═══════════════════════════════════════════════════════════════
// STATIC REFERENCE DATA
// ═══════════════════════════════════════════════════════════════
const MOCK_CALENDAR = [
  { date:'05.20', day:'三', time:'02:00', region:'US', evt:'Fed 主席 Powell 演講',  imp:3, prev:'—',    est:'—'    },
  { date:'05.20', day:'三', time:'20:30', region:'US', evt:'4 月成屋銷售',           imp:2, prev:'4.19M', est:'4.22M' },
  { date:'05.21', day:'四', time:'02:00', region:'US', evt:'FOMC 5 月會議紀要',     imp:3, prev:'—',    est:'—'    },
  { date:'05.22', day:'五', time:'20:30', region:'US', evt:'上週初領失業金',         imp:2, prev:'231K',  est:'220K'  },
  { date:'05.22', day:'五', time:'21:45', region:'US', evt:'5 月 PMI 初值',          imp:3, prev:'51.2',  est:'51.5'  },
]
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
const WEEKDAYS = ['日','一','二','三','四','五','六']
const BULLET_CFG = [
  { sym:'SPX',     label:'S&P 500' },
  { sym:'NDX',     label:'Nasdaq' },
  { sym:'TWII',    label:'台股加權' },
  { sym:'USD/TWD', label:'USD / TWD' },
  { sym:'WTI',     label:'WTI 原油' },
  { sym:'BTC',     label:'BTC' },
]

// ═══════════════════════════════════════════════════════════════
// IPC ADAPTERS
// ═══════════════════════════════════════════════════════════════
const DISPLAY_SYM = {
  '^GSPC':'SPX',    '^DJI':'DJI',     '^IXIC':'NDX',    '^TWII':'TWII',
  '^N225':'N225',   '^HSI':'HSI',     '^GDAXI':'DAX',   '^FTSE':'FTSE',
  'USDTWD=X':'USD/TWD', 'EURTWD=X':'EUR/TWD', 'JPYTWD=X':'JPY/TWD',
  'GBPTWD=X':'GBP/TWD', 'CNYTWD=X':'CNY/TWD', 'AUDTWD=X':'AUD/TWD',
  'HKDTWD=X':'HKD/TWD', 'SGDTWD=X':'SGD/TWD',
  'CL=F':'WTI',    'BZ=F':'BRENT',   'GC=F':'GOLD',    'SI=F':'SILVER',
  'NG=F':'NATGAS', 'HG=F':'COPPER',
  '^TNX':'US10Y',  '^FVX':'US5Y',    '^TYX':'US30Y',   '^IRX':'US3M',
  'BTC-USD':'BTC', 'ETH-USD':'ETH',  'SOL-USD':'SOL',  'BNB-USD':'BNB',
  'XRP-USD':'XRP', 'ADA-USD':'ADA',  'DOGE-USD':'DOGE','AVAX-USD':'AVAX',
}
const REGION_MAP = {
  '^GSPC':'US', '^DJI':'US',  '^IXIC':'US', '^TWII':'TW', '^N225':'JP',
  '^HSI':'HK',  '^GDAXI':'DE', '^FTSE':'UK',
  'USDTWD=X':'TW', 'EURTWD=X':'EU', 'JPYTWD=X':'JP', 'GBPTWD=X':'UK',
  'CNYTWD=X':'CN', 'AUDTWD=X':'AU', 'HKDTWD=X':'HK', 'SGDTWD=X':'SG',
  'CL=F':'US', 'BZ=F':'EU', 'GC=F':'US', 'SI=F':'US', 'NG=F':'US', 'HG=F':'US',
  '^TNX':'US', '^FVX':'US', '^TYX':'US', '^IRX':'US',
}

function formatPrice(price, sym) {
  if (price == null) return '--'
  if (sym?.endsWith('=X')) {
    if (price >= 10) return price.toFixed(3)
    if (price >= 1)  return price.toFixed(4)
    return price.toFixed(5)
  }
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
    title: n.title, summary: n.summary || '',
    source: '鉅亨網', time: timeAgo(n.publishAt),
    related, impact: null, glossary: [],
    url: n.url, coverUrl: n.coverUrl,
  }
}

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

const NAV_BACK_LABEL = {
  feed:    '今日脈動',
  indices: '全球股市',
  forex:   '外匯匯率',
  commod:  '大宗商品',
  treas:   '公債殖利率',
  crypto:  '加密貨幣',
  watch:   '自選清單',
  news:    '新聞動態',
  learn:   '投資百科',
}

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
  const [news, setNews] = useState([])
  const [groups, setGroups] = useState([])
  const [activeWatchGroup, setActiveWatchGroup] = useState(null)
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
  const [groupManagerOpen, setGroupManagerOpen] = useState(false)
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
    window.api.getGroups().then(g => { if (g?.length) setGroups(g) }).catch(() => {})
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
    if (fired.length) { setFiredAlerts(f => [...f, ...fired]); saveAlerts(remaining) }
  }, [marketData])

  const handleAdd = useCallback(async (item) => {
    const sym = item.rawSym || item.sym
    if (!sym || watchlistMeta.some(w => w.symbol === sym)) return
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
    const vixVal = (vixItem && !vixItem.error) ? +(vixItem.price ?? 18).toFixed(2) : 18
    const vixChg = (vixItem && !vixItem.error) ? +(vixItem.changePercent ?? 0).toFixed(2) : 0
    const vixState = vixVal < 15 ? '低' : vixVal < 25 ? '中' : '高'
    let fearGreed = externalSentiment?.stockFG
    if (!fearGreed) {
      const fgVal = Math.round(Math.max(0, Math.min(100, 90 - (vixVal - 10) * 2.5)))
      const fgText = fgVal > 75 ? '極度貪婪' : fgVal > 55 ? '貪婪' : fgVal > 45 ? '中性' : fgVal > 25 ? '恐慌' : '極度恐慌'
      fearGreed = { val: fgVal, state: fgVal > 55 ? 'greed' : fgVal > 45 ? 'neutral' : 'fear', text: fgText }
    }
    return { vix: { val: vixVal, chg: vixChg, state: vixState }, fearGreed }
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

  const convention  = CONVENTIONS[t.convention]
  const convValue   = useMemo(() => ({ upColor:convention.up, downColor:convention.down, density:t.density, chartType:t.chartType }), [convention, t.density, t.chartType])
  const glossValue  = useMemo(() => ({ open: (term) => setGlossPopup(term) }), [])
  const themeStyle  = useMemo(() => {
    const th = THEMES[t.theme] || THEMES.blue
    return { '--accent':th.accent, '--accent-2':th.accent2, '--accent-tint':th.tint, '--green':convention.up, '--red':convention.down }
  }, [t.theme, convention])
  const todayStory  = useMemo(() => buildTodayStory(news, indices, forex, commodities, cryptoRows), [news, indices, forex, commodities, cryptoRows])
  const dataValue   = useMemo(() => ({
    todayStory,
    pulseStrip: indices.length ? indices : [],
    indices, forex, commodities, treasuries,
    crypto: cryptoRows,
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
      setWatchlistPage(true); setLearnPage(false)
    } else if (item.section === 'learn') {
      setLearnPage(true); setWatchlistPage(false)
    } else {
      setWatchlistPage(false); setLearnPage(false)
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
                  onClose={() => setSymbolPage(null)}
                  onAddWatch={handleAdd}
                  inWatchlist={watchlistData.some(w => w.rawSym === symbolPage.rawSym)}
                  onOpenSymbol={setSymbolPage}
                  onOpenNews={setNewsModal}
                  onOpenAlert={setAlertItem}
                  groups={groups}
                  onSaveGroups={newGroups => { setGroups(newGroups); window.api.saveGroups(newGroups).catch(() => {}) }}
                  backLabel={watchlistPage ? '自選清單' : learnPage ? '投資百科' : (NAV_BACK_LABEL[activeNav] || '上一頁')}
                />
              ) : learnPage ? (
                <LearnPage/>
              ) : watchlistPage ? (
                <WatchlistPage
                  items={watchlistData}
                  onAdd={() => setAddModal(true)}
                  onSelect={item => setSymbolPage(item)}
                  onRemove={handleRemove}
                  groups={groups}
                  onManageGroups={() => setGroupManagerOpen(true)}
                  activeGroup={activeWatchGroup}
                  onActiveGroupChange={setActiveWatchGroup}
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

            {newsModal && <NewsDetail news={newsModal} onClose={() => setNewsModal(null)}
              onOpenSymbol={item => { setNewsModal(null); setSymbolPage(item) }}/>}
            {glossPopup && <GlossaryPopup term={glossPopup} onClose={() => setGlossPopup(null)} onJump={setGlossPopup}/>}
            {glossIndex && <GlossaryIndex onClose={() => setGlossIndex(false)} onPick={t => { setGlossPopup(t); setGlossIndex(false) }}/>}
            {addModal && <AddWatchModal onClose={() => setAddModal(false)} onAdd={handleAdd} existingSymbols={watchlistMeta.map(w => w.symbol)}/>}
            {settingsOpen && <SettingsModal t={t} setTweak={setTweak} themes={THEMES} onReset={() => setTweak(TWEAK_DEFAULTS)} onClose={() => setSettingsOpen(false)}/>}
            {portfolioOpen && <PortfolioModal holdings={holdings} onSave={saveHoldings} onClose={() => setPortfolioOpen(false)}/>}
            {alertItem && <AlertModal item={alertItem} alerts={alerts} onSave={saveAlerts} onClose={() => setAlertItem(null)}/>}
            {groupManagerOpen && (
              <GroupManagerModal
                groups={groups}
                onSave={newGroups => { setGroups(newGroups); window.api.saveGroups(newGroups).catch(() => {}) }}
                onClose={() => setGroupManagerOpen(false)}
              />)}
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
