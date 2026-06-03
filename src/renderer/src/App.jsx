import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ConventionCtx, GlossaryCtx, DataContext,
  symbolSeed, timeAgo,
  LeftNav, WatchRail, TopBar,
  Hero, PulseStrip, MarketMatrix, NewsFeed, QuickMarket,
  PortfolioBand, SentimentBar, Calendar,
  SentimentPage, CalendarPage, WatchlistPage, MarketPage,
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
const WD = ['日','一','二','三','四','五','六']
function buildCalendar(daysAhead = 14) {
  const today = new Date(); today.setHours(0,0,0,0)
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + daysAhead)
  const fmt = d => `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`

  const fixed = [
    // FOMC 2025
    { d:new Date(2025,5,18),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2025,6,30),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2025,8,17),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2025,9,29),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2025,11,10), t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    // FOMC 2026
    { d:new Date(2026,0,28),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2026,2,18),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2026,4,6),   t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2026,5,17),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2026,6,29),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2026,8,16),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2026,9,28),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    { d:new Date(2026,11,9),  t:'02:00', r:'US', evt:'FOMC 利率決議',         imp:3 },
    // CPI 2026
    { d:new Date(2026,5,10),  t:'20:30', r:'US', evt:'CPI 消費者物價指數',    imp:3 },
    { d:new Date(2026,6,14),  t:'20:30', r:'US', evt:'CPI 消費者物價指數',    imp:3 },
    { d:new Date(2026,7,12),  t:'20:30', r:'US', evt:'CPI 消費者物價指數',    imp:3 },
    { d:new Date(2026,8,10),  t:'20:30', r:'US', evt:'CPI 消費者物價指數',    imp:3 },
    { d:new Date(2026,9,14),  t:'20:30', r:'US', evt:'CPI 消費者物價指數',    imp:3 },
    { d:new Date(2026,10,12), t:'20:30', r:'US', evt:'CPI 消費者物價指數',    imp:3 },
    { d:new Date(2026,11,10), t:'20:30', r:'US', evt:'CPI 消費者物價指數',    imp:3 },
    // PCE 2026 (approximate last Friday of month)
    { d:new Date(2026,5,26),  t:'20:30', r:'US', evt:'PCE 個人消費支出物價', imp:2 },
    { d:new Date(2026,6,31),  t:'20:30', r:'US', evt:'PCE 個人消費支出物價', imp:2 },
    { d:new Date(2026,7,28),  t:'20:30', r:'US', evt:'PCE 個人消費支出物價', imp:2 },
    { d:new Date(2026,8,25),  t:'20:30', r:'US', evt:'PCE 個人消費支出物價', imp:2 },
  ]

  // NFP — first Friday of each upcoming month
  for (let i = 0; i < 4; i++) {
    const base = new Date(today.getFullYear(), today.getMonth() + i, 1)
    while (base.getDay() !== 5) base.setDate(base.getDate() + 1)
    fixed.push({ d: new Date(base), t:'20:30', r:'US', evt:'非農就業人數 (NFP)', imp:3 })
  }

  return fixed
    .filter(e => e.d >= today && e.d <= cutoff && e.imp === 3)
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
    .map(e => ({ date: fmt(e.d), day: WD[e.d.getDay()], time: e.t, region: e.r, evt: e.evt, imp: e.imp, prev:'—', est:'—' }))
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

  // ── 技術分析 ──────────────────────────────────────────────
  'MA':'移動平均線（Moving Average），將一段時間的收盤價平均，濾除短期雜訊以觀察趨勢。',
  'EMA':'指數移動平均線，對近期價格給予更高權重，比 MA 反應更快。',
  'MACD':'移動平均匯聚背離指標，由快線（12EMA）減慢線（26EMA）組成，MACD 線上穿信號線為買訊。',
  'KD':'隨機指標（Stochastic Oscillator），K 線上穿 D 線為買訊；>80 超買，<20 超賣。',
  '布林通道':'以 20 日均線為中軌，上下各加減兩個標準差，股價觸及上軌代表相對高點。',
  '黃金交叉':'短期均線向上穿越長期均線，通常視為買入訊號。',
  '死亡交叉':'短期均線向下穿越長期均線，通常視為賣出訊號。',
  '支撐':'股價反覆下跌到某價位後止跌回升，形成買盤聚集的價格區間。',
  '壓力':'股價反覆上漲到某價位後受阻回落，形成賣壓聚集的價格區間。',
  '量價背離':'股價創新高但成交量萎縮，或股價創新低但量能放大，暗示趨勢可能反轉。',
  '跳空缺口':'股價開盤直接跳過前日收盤價，K 線圖上形成的空白區域。',
  '頭肩頂':'技術分析的反轉型態，由左肩、頭部、右肩組成，頸線跌破為賣訊。',
  'K線':'蠟燭圖（Candlestick Chart），一根 K 線包含開盤、最高、最低、收盤四個價格。',

  // ── 基本面指標 ────────────────────────────────────────────
  'EPS':'每股盈餘（Earnings Per Share）= 稅後淨利 ÷ 流通股數，是計算本益比的基礎。',
  'P/E':'本益比（Price-to-Earnings Ratio）= 股價 ÷ EPS，代表回本所需年數。',
  'P/B':'市淨率（Price-to-Book Ratio）= 股價 ÷ 每股淨資產，< 1 代表股價低於帳面價值。',
  'ROE':'股東權益報酬率（Return on Equity）= 稅後淨利 ÷ 股東權益，衡量替股東賺錢的效率。',
  'ROA':'資產報酬率（Return on Assets）= 稅後淨利 ÷ 總資產，衡量企業運用資產的獲利能力。',
  '本益比':'P/E Ratio，股價除以每股盈餘，代表市場願意為每元獲利付出的倍數。',
  '股息殖利率':'年度股息 ÷ 股價 × 100%，反映持股一年的現金報酬率。',
  '市值':'流通股數 × 股價。分類：小型股 < 20 億美元，中型 20–100 億，大型 > 100 億。',
  '自由現金流':'營業現金流扣除資本支出後的餘額，代表企業真正可自由運用的現金。',
  '淨利率':'稅後淨利 ÷ 營收，衡量每賺 100 元收入最終留下多少利潤。',
  '負債比率':'總負債 ÷ 總資產，過高代表財務槓桿風險大。',
  '股東權益':'總資產扣除總負債的淨值，代表股東對公司的實質所有權。',
  '護城河':'企業長期維持競爭優勢的核心能力，如品牌、專利、網路效應、轉換成本。',

  // ── 總體經濟指標 ──────────────────────────────────────────
  'CPI':'消費者物價指數（Consumer Price Index），衡量民眾日常消費品與服務的物價水準，是衡量通膨的主要指標。',
  'PCE':'個人消費支出物價指數，聯準會偏好的通膨衡量工具，比 CPI 更能反映消費習慣變化。',
  'PPI':'生產者物價指數（Producer Price Index），衡量企業端的原物料與中間產品價格，領先 CPI 約 1-2 個月。',
  'GDP':'國內生產毛額（Gross Domestic Product），一國在特定期間內所有最終產品與服務的市場總價值。',
  'NFP':'非農就業人數（Non-Farm Payrolls），每月第一個週五發布，是衡量美國就業市場最重要的指標。',
  '通貨膨脹':'物價持續上漲，貨幣購買力下降。Fed 目標通膨率為 2%。',
  '通貨緊縮':'物價持續下跌，看似有利但易導致消費遞延與經濟衰退。',
  '升息':'中央銀行調高基準利率，通常用於對抗通膨，但會增加借貸成本。',
  'QE':'量化寬鬆（Quantitative Easing），央行購買債券向市場注入資金，壓低長期利率。',
  'QT':'量化緊縮（Quantitative Tightening），央行縮減資產負債表，回收市場流動性。',
  '聯準會':'美國聯邦準備系統（Federal Reserve），美國的中央銀行，負責貨幣政策與金融穩定。',
  '台灣央行':'中華民國中央銀行，負責維持新台幣匯率穩定與物價穩定。',
  'PMI':'採購經理人指數（Purchasing Managers\' Index），> 50 代表景氣擴張，< 50 代表收縮。',
  'JOLTS':'職缺與勞動力流動調查，衡量美國勞動市場供需狀況。',
  '收益率曲線':'不同到期年限的公債殖利率連成的曲線，倒掛（短高長低）通常是衰退前兆。',

  // ── 市場概念 ──────────────────────────────────────────────
  '多頭':'看好後市、預期股價上漲的市場方向或投資者立場（Bull）。',
  '空頭':'看壞後市、預期股價下跌的市場方向或投資者立場（Bear）。',
  '牛市':'市場主要指數從低點上漲 20% 以上，代表長期上升趨勢。',
  '熊市':'市場主要指數從高點下跌 20% 以上，代表長期下降趨勢。',
  '回檔':'多頭趨勢中的短期下跌，通常幅度在 10% 以內，與趨勢反轉不同。',
  '融資':'向券商借錢買股票，放大報酬但同時放大風險。',
  '融券':'向券商借股票賣出，預期股價下跌後低價買回還券獲利。',
  '做多':'買入資產，預期價格上漲後賣出獲利。',
  '做空':'借入資產賣出，預期價格下跌後低價買回獲利。',
  '停損':'預設最大虧損點，跌破即賣出，避免損失擴大。',
  '停利':'預設目標獲利點，達到即賣出，落袋為安。',
  '除權':'公司發放股票股利時，股價依比例調整的程序。',
  '除息':'公司發放現金股利時，股價依股息金額調整的程序。',
  '填權':'除權後股價回升至除權前水準。',
  '主力':'在市場中持有大量籌碼、對股價有顯著影響力的機構或大戶。',
  '籌碼':'股票的持有分布狀況，籌碼集中代表大戶持股比例高。',
  '殖利率倒掛':'短期公債殖利率高於長期公債殖利率，歷史上常為衰退先兆。',
  '流動性':'資產快速轉換為現金的能力，流動性高的資產更容易買賣。',
  '槓桿':'使用借來的資金擴大投資規模，可放大報酬但風險同步放大。',
  '避險':'透過反向部位或不相關資產降低投資組合的整體風險。',
  '再平衡':'定期將投資組合調整回目標配置比例，實現自動低買高賣。',
  '安全邊際':'以低於內在價值的價格買入，為估值錯誤預留緩衝空間。',

  // ── 加密貨幣 ──────────────────────────────────────────────
  '區塊鏈':'分散式帳本技術，交易紀錄以區塊串連，不可竄改、無需中介機構。',
  '減半':'比特幣每 4 年將礦工獎勵減半的機制，歷史上往往在減半後 1 年出現牛市高點。',
  'DeFi':'去中心化金融（Decentralized Finance），利用智能合約提供借貸、交易等金融服務。',
  '穩定幣':'與法幣（通常是美元）1:1 掛鉤的加密貨幣，如 USDT、USDC。',
  '山寨幣':'比特幣以外的加密貨幣統稱（Altcoin），波動性通常高於比特幣。',

  // ── ETF 與基金 ────────────────────────────────────────────
  'ETF':'指數股票型基金（Exchange-Traded Fund），在交易所上市交易、追蹤特定指數或資產的基金。',
  '內扣費用':'ETF 或基金每年從資產中扣除的管理費，直接侵蝕報酬，選ETF需優先看此項。',
  '追蹤誤差':'ETF 實際報酬與追蹤指數報酬的差距，誤差越小代表複製效果越好。',
  '定期定額':'每月固定時間投入固定金額，平均買入成本、降低時機風險的策略。',
  '指數投資':'被動複製指數報酬，不主動選股，長期勝過大多數主動基金。',
}

const WEEKDAYS = WD
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
    source: n.source || n.publisher || '鉅亨網', time: timeAgo(n.publishAt),
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
  feed:      '主頁',
  indices:   '全球股市',
  forex:     '外匯匯率',
  sentiment: '市場情緒',
  calendar:  '財經日曆',
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
  const [newsLoading, setNewsLoading] = useState(false)
  const [groups, setGroups] = useState([])
  const [activeWatchGroup, setActiveWatchGroup] = useState(null)
  const [calendarData, setCalendarData] = useState(() => buildCalendar())
  const [loading, setLoading] = useState(false)
  const [activeNav, setActiveNav] = useState('feed')
  const [matrixTab, setMatrixTab] = useState('indices')
  const [leftCollapsed, setLeftCollapsed] = useState(!t.leftNav)
  const [rightCollapsed, setRightCollapsed] = useState(!t.sidebar)
  const [symbolStack, setSymbolStack] = useState([])
  const symbolPage = symbolStack[symbolStack.length - 1] ?? null
  const setSymbolPage = (item) => setSymbolStack(item ? [item] : [])
  const pushSymbolPage = (item) => setSymbolStack(prev => item ? [...prev, item] : prev)
  const popSymbolPage = () => setSymbolStack(prev => prev.slice(0, -1))
  const [watchlistPage, setWatchlistPage] = useState(false)
  const [learnPage, setLearnPage] = useState(false)
  const [sentimentPage, setSentimentPage] = useState(false)
  const [calendarPage, setCalendarPage] = useState(false)
  const [marketPage, setMarketPage] = useState(false)
  const [newsModal, setNewsModal] = useState(null)
  const [glossPopup, setGlossPopup] = useState(null)
  const [glossIndex, setGlossIndex] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [alertItem, setAlertItem] = useState(null)
  const [firedAlerts, setFiredAlerts] = useState([])
  const [externalSentiment, setExternalSentiment] = useState(null)
  const [twseAdvDec, setTwseAdvDec] = useState(null)
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

  const loadNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const items = await window.api.fetchNewsMulti()
      if (Array.isArray(items)) setNews(items.map(adaptNews))
    } catch {
      try {
        const items = await window.api.fetchNews('tw_stock')
        if (items?.length) setNews(items.map(adaptNews))
      } catch {}
    } finally { setNewsLoading(false) }
  }, [])

  useEffect(() => {
    window.api.getWatchlist().then(list => setWatchlistMeta(list || []))
    window.api.getGroups().then(g => { if (g?.length) setGroups(g) }).catch(() => {})
    loadMarketData()
    loadNews()
    window.api.fetchSentiment().then(s => { if (s) setExternalSentiment(s) }).catch(() => {})
    window.api.fetchEconomicCalendar().then(data => { if (data?.length) setCalendarData(data) }).catch(() => {})
    window.api.fetchMarketAdvDec().then(d => { if (d) setTwseAdvDec(d) }).catch(() => {})
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
    const advDec = twseAdvDec
      ? { adv: twseAdvDec.adv, dec: twseAdvDec.dec, unch: twseAdvDec.unch, total: twseAdvDec.total, source: 'twse' }
      : null
    return { vix: { val: vixVal, chg: vixChg, state: vixState }, fearGreed, advDec }
  }, [marketData, externalSentiment, twseAdvDec])

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
    calendar: calendarData,
    sentiment: sentimentData,
    portfolio,
    glossary: GLOSSARY,
    sparklines,
  }), [todayStory, indices, forex, commodities, treasuries, cryptoRows, sentimentData, portfolio, news, sparklines, calendarData])

  const onNavSelect = (item) => {
    setActiveNav(item.id)
    setSymbolPage(null)
    const resetPages = () => { setWatchlistPage(false); setLearnPage(false); setSentimentPage(false); setCalendarPage(false); setMarketPage(false) }
    if (item.section === 'watch') {
      resetPages(); setWatchlistPage(true)
    } else if (item.section === 'learn') {
      resetPages(); setLearnPage(true)
    } else if (item.section === 'sentiment') {
      resetPages(); setSentimentPage(true)
    } else if (item.section === 'calendar') {
      resetPages(); setCalendarPage(true)
    } else if (item.section === 'market') {
      resetPages(); setMatrixTab(item.tab); setMarketPage(true)
    } else {
      resetPages()
      if (item.section === 'pulse') scrollTo('section-hero')
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
              <div className="tl-title">FinPulse <em>財經脈動 · Beta</em></div>
            </div>

            <TopBar
              onSearch={async q => {
                const s = q.trim()
                if (!s) return
                if (GLOSSARY[s]) { setGlossPopup(s); return }
                try {
                  const r = await window.api.lookupSymbol(s)
                  if (r?.symbol) {
                    setSymbolPage({ sym: DISPLAY_SYM[r.symbol] || r.symbol, name: r.name || r.symbol, rawSym: r.symbol, seed: symbolSeed(r.symbol), region: REGION_MAP[r.symbol] })
                  } else {
                    setAddModal(true)
                  }
                } catch {
                  setAddModal(true)
                }
              }}
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
                  onClose={popSymbolPage}
                  onAddWatch={handleAdd}
                  inWatchlist={watchlistData.some(w => w.rawSym === symbolPage.rawSym)}
                  onOpenSymbol={pushSymbolPage}
                  onOpenNews={setNewsModal}
                  onOpenAlert={setAlertItem}
                  groups={groups}
                  onSaveGroups={newGroups => { setGroups(newGroups); window.api.saveGroups(newGroups).catch(() => {}) }}
                  backLabel={symbolStack.length > 1 ? (symbolStack[symbolStack.length - 2]?.name || '上一頁') : watchlistPage ? '自選清單' : learnPage ? '投資百科' : sentimentPage ? '市場情緒' : calendarPage ? '財經日曆' : marketPage ? '市場行情' : (NAV_BACK_LABEL[activeNav] || '主頁')}
                />
              ) : learnPage ? (
                <LearnPage/>
              ) : sentimentPage ? (
                <SentimentPage/>
              ) : calendarPage ? (
                <CalendarPage/>
              ) : marketPage ? (
                <MarketPage tab={matrixTab} onSelect={setSymbolPage}/>
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
                  <QuickMarket onSelect={setSymbolPage}/>
                  <PortfolioBand onManage={() => setPortfolioOpen(true)}/>
                  <div id="section-news"><NewsFeed onOpen={setNewsModal} onRefresh={loadNews} refreshing={newsLoading}/></div>
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
