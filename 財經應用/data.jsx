/* global window */
// ─────────────────────────────────────────────────────────────
// Mock data — Worldwide Finance dashboard
// All numbers are illustrative; dated 2026-05-18 (Mon).
// ─────────────────────────────────────────────────────────────

// Deterministic pseudo-random — same seed → same series
function seedRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function makeSeries(seed, len = 60, drift = 0.001, vol = 0.015, start = 100) {
  const r = seedRand(seed);
  const pts = [start];
  for (let i = 1; i < len; i++) {
    const last = pts[i - 1];
    const step = last * (drift + (r() - 0.5) * vol);
    pts.push(Math.max(0.1, last + step));
  }
  return pts;
}

// ─── Today's narrative ─────────────────────────────────────────
const todayStory = {
  date: '2026.05.18',
  weekday: '週一',
  time: '14:32',
  tz: 'GMT+8',
  kicker: '本日重點',
  headline: '美科技股創高、Fed 鴿派轉向期待升溫，新台幣強升 0.4%',
  subhead:
    '輝達 Q1 財報超預期帶動 Nasdaq 收高 1.8%，市場押注 6 月降息機率突破 70%；美元指數走弱拖累亞幣全面走強，台股早盤一度站上 23,800 點。',
  tags: ['Fed', '輝達', '台積電', 'USD/TWD'],
  bullets: [
    { label: 'S&P 500',  value: '5,847.12', chg: '+1.24%', dir: 1 },
    { label: 'Nasdaq',   value: '19,213.4', chg: '+1.81%', dir: 1 },
    { label: '10Y 殖利率', value: '4.18%',   chg: '−0.06',  dir: -1 },
    { label: 'USD / TWD', value: '31.42',   chg: '−0.40%', dir: -1 },
    { label: 'WTI 原油', value: '78.34',    chg: '+0.92%', dir: 1 },
    { label: 'BTC',      value: '68,420',   chg: '+2.35%', dir: 1 },
  ],
};

// ─── Pulse strip — every index with sparkline ─────────────────
const pulseStrip = [
  { sym: 'SPX',    name: 'S&P 500',     val: '5,847.12', chg: 1.24,  seed: 7,   region: 'US' },
  { sym: 'NDX',    name: 'Nasdaq 100',  val: '19,213.4', chg: 1.81,  seed: 11,  region: 'US' },
  { sym: 'DJI',    name: '道瓊',         val: '42,180.5', chg: 0.88,  seed: 13,  region: 'US' },
  { sym: 'TWII',   name: '台灣加權',     val: '23,784.2', chg: 0.92,  seed: 17,  region: 'TW' },
  { sym: 'HSI',    name: '恆生指數',     val: '19,238.1', chg: -0.34, seed: 19,  region: 'HK' },
  { sym: 'N225',   name: '日經 225',     val: '39,128.7', chg: 1.12,  seed: 23,  region: 'JP' },
  { sym: '000300', name: '滬深 300',     val: '3,842.5',  chg: 0.21,  seed: 29,  region: 'CN' },
  { sym: 'KOSPI',  name: '韓綜指',       val: '2,712.4',  chg: 0.74,  seed: 31,  region: 'KR' },
  { sym: 'SX5E',   name: '歐洲 50',     val: '5,124.8',  chg: 0.35,  seed: 37,  region: 'EU' },
  { sym: 'FTSE',   name: 'FTSE 100',    val: '8,412.9',  chg: -0.12, seed: 41,  region: 'UK' },
  { sym: 'DAX',    name: 'DAX',         val: '18,724.3', chg: 0.51,  seed: 43,  region: 'DE' },
  { sym: 'BVSP',   name: 'Bovespa',     val: '128,432',  chg: -0.81, seed: 47,  region: 'BR' },
];

// ─── Per-section data ─────────────────────────────────────────
const indices = pulseStrip; // reuse

const forex = [
  { sym: 'USD/TWD', name: '美元/台幣',   val: '31.42',   chg: -0.40, seed: 53 },
  { sym: 'USD/JPY', name: '美元/日圓',   val: '154.82',  chg: -0.12, seed: 59 },
  { sym: 'EUR/USD', name: '歐元/美元',   val: '1.0942',  chg:  0.21, seed: 61 },
  { sym: 'GBP/USD', name: '英鎊/美元',   val: '1.2814',  chg:  0.18, seed: 67 },
  { sym: 'USD/CNY', name: '美元/人民幣', val: '7.2384',  chg: -0.08, seed: 71 },
  { sym: 'AUD/USD', name: '澳幣/美元',   val: '0.6712',  chg:  0.42, seed: 73 },
  { sym: 'USD/HKD', name: '美元/港幣',   val: '7.8124',  chg:  0.01, seed: 79 },
  { sym: 'DXY',     name: '美元指數',    val: '103.84',  chg: -0.28, seed: 83 },
];

const commodities = [
  { sym: 'CL',  name: 'WTI 原油',  val: '78.34',  unit: '/桶',  chg:  0.92, seed: 89 },
  { sym: 'BZ',  name: '布蘭特原油', val: '82.14',  unit: '/桶',  chg:  0.78, seed: 97 },
  { sym: 'GC',  name: '黃金',      val: '2,418.7', unit: '/oz',  chg:  0.34, seed: 101 },
  { sym: 'SI',  name: '白銀',      val: '31.42',  unit: '/oz',  chg:  1.21, seed: 103 },
  { sym: 'HG',  name: '銅',        val: '4.582',  unit: '/lb',  chg: -0.18, seed: 107 },
  { sym: 'NG',  name: '天然氣',    val: '2.812',  unit: 'mmBtu', chg: -1.42, seed: 109 },
  { sym: 'ZC',  name: '玉米',      val: '462.3',  unit: '¢/bu', chg:  0.58, seed: 113 },
  { sym: 'CT',  name: '棉花',      val: '76.84',  unit: '¢/lb', chg: -0.34, seed: 127 },
];

const treasuries = [
  { sym: 'US3M',  name: '3 個月國庫券', val: '5.42%', chg: -0.01, seed: 131 },
  { sym: 'US2Y',  name: '2 年期',      val: '4.62%', chg: -0.03, seed: 137 },
  { sym: 'US5Y',  name: '5 年期',      val: '4.28%', chg: -0.04, seed: 139 },
  { sym: 'US10Y', name: '10 年期',     val: '4.18%', chg: -0.06, seed: 149 },
  { sym: 'US30Y', name: '30 年期',     val: '4.42%', chg: -0.05, seed: 151 },
  { sym: 'JP10Y', name: '日本 10 年',  val: '0.98%', chg:  0.02, seed: 157 },
  { sym: 'DE10Y', name: '德國 10 年',  val: '2.42%', chg: -0.03, seed: 163 },
  { sym: 'TW10Y', name: '台灣 10 年',  val: '1.52%', chg: -0.01, seed: 167 },
];

const cryptoData = [
  { sym: 'BTC',  name: 'Bitcoin',  val: '68,420', chg:  2.35, mcap: '1.34T', seed: 173 },
  { sym: 'ETH',  name: 'Ethereum', val: '3,842',  chg:  1.81, mcap: '462B',  seed: 179 },
  { sym: 'SOL',  name: 'Solana',   val: '174.2',  chg:  4.21, mcap: '82B',   seed: 181 },
  { sym: 'BNB',  name: 'BNB',      val: '612.4',  chg:  0.92, mcap: '94B',   seed: 191 },
  { sym: 'XRP',  name: 'Ripple',   val: '0.5421', chg: -1.24, mcap: '31B',   seed: 193 },
  { sym: 'ADA',  name: 'Cardano',  val: '0.4823', chg:  0.34, mcap: '17B',   seed: 197 },
  { sym: 'DOGE', name: 'Dogecoin', val: '0.1742', chg:  3.14, mcap: '25B',   seed: 199 },
  { sym: 'AVAX', name: 'Avalanche', val: '38.4',   chg:  1.12, mcap: '15B',   seed: 211 },
];

// ─── News feed ────────────────────────────────────────────────
const news = [
  {
    id: 'n1',
    tier: 'hero',
    tag: '頭條',
    title: '輝達財報遠超預期，AI 資本支出延燒至 2026 下半年',
    summary: 'NVDA Q1 營收 320 億美元、年增 78%，毛利率穩在 74% 高檔；資料中心營收佔比首度突破 90%。法說會中黃仁勳指出，主權 AI 與企業推論需求成為新驅動力。',
    source: '路透社', time: '12 分鐘前',
    related: ['NVDA', 'TSMC', 'SMCI'],
    impact: { sym: 'NDX', dir: 1, chg: '+1.81%' },
    glossary: ['毛利率', '資本支出', '主權 AI'],
  },
  {
    id: 'n2',
    tier: 'major',
    tag: '央行',
    title: 'Fed 會議紀要顯示 6 月有降息空間，市場押注機率突破 70%',
    summary: '聯邦公開市場委員會（FOMC）5 月會議紀要透露多數委員認為通膨已朝目標收斂，CME FedWatch 顯示市場預期 6/19 降息 25 bp 機率自上週 48% 攀升至 72%。',
    source: 'Bloomberg', time: '32 分鐘前',
    related: ['SPX', 'US10Y', 'DXY'],
    impact: { sym: 'US10Y', dir: -1, chg: '−6 bp' },
    glossary: ['FOMC', 'bp', '會議紀要'],
  },
  {
    id: 'n3',
    tier: 'major',
    tag: '匯市',
    title: '新台幣升破 31.5 元，央行升匯壓力釋放',
    summary: '美元指數連續第三個交易日走弱，新台幣早盤強升 4 分至 31.42，貿易商拋匯潮重啟。市場觀察央行是否再度於尾盤調節。',
    source: '工商時報', time: '1 小時前',
    related: ['USDTWD', 'DXY', 'TWII'],
    impact: { sym: 'USD/TWD', dir: -1, chg: '−0.40%' },
    glossary: ['美元指數', '調節', '拋匯'],
  },
  {
    id: 'n4',
    tier: 'std',
    tag: '原物料',
    title: 'OPEC+ 維持自願性減產到第四季，油價反彈',
    source: 'CNBC', time: '2 小時前',
    related: ['CL', 'BZ'],
    impact: { sym: 'WTI', dir: 1, chg: '+0.92%' },
    glossary: ['OPEC+', '自願性減產'],
  },
  {
    id: 'n5',
    tier: 'std',
    tag: '科技',
    title: '台積電 4 月營收月減 2%，仍年增 60%',
    source: '經濟日報', time: '3 小時前',
    related: ['2330.TW', 'TWII'],
    impact: { sym: '2330.TW', dir: 1, chg: '+0.84%' },
    glossary: ['月減', '年增'],
  },
  {
    id: 'n6',
    tier: 'std',
    tag: '加密',
    title: 'BTC 重返 6.8 萬美元，現貨 ETF 連兩日淨流入',
    source: 'CoinDesk', time: '4 小時前',
    related: ['BTC'],
    impact: { sym: 'BTC', dir: 1, chg: '+2.35%' },
    glossary: ['現貨 ETF', '淨流入'],
  },
  {
    id: 'n7',
    tier: 'std',
    tag: '財報',
    title: 'Walmart 上修全年展望，零售需求未見退潮',
    source: 'WSJ', time: '5 小時前',
    related: ['WMT', 'SPX'],
    impact: { sym: 'WMT', dir: 1, chg: '+1.42%' },
    glossary: ['零售展望'],
  },
  {
    id: 'n8',
    tier: 'std',
    tag: '日本',
    title: '日本 10 年期殖利率突破 1%，YCC 退場效應持續',
    source: '日經新聞', time: '6 小時前',
    related: ['JP10Y', 'N225', 'USDJPY'],
    impact: { sym: 'JP10Y', dir: 1, chg: '+2 bp' },
    glossary: ['YCC', '殖利率', 'bp'],
  },
];

// ─── Economic calendar — this week ───────────────────────────
const calendar = [
  { date: '05.19', day: '二', time: '08:50', region: 'JP', evt: '日本 4 月貿易帳',         imp: 2, prev: '−0.86T', est: '−0.42T' },
  { date: '05.19', day: '二', time: '22:00', region: 'US', evt: '5 月 NAHB 房市指數',       imp: 2, prev: '51',    est: '52' },
  { date: '05.20', day: '三', time: '02:00', region: 'US', evt: 'Fed 主席 Powell 演講',    imp: 3, prev: '—',     est: '—' },
  { date: '05.20', day: '三', time: '20:30', region: 'US', evt: '4 月成屋銷售',            imp: 2, prev: '4.19M', est: '4.22M' },
  { date: '05.21', day: '四', time: '02:00', region: 'US', evt: 'FOMC 5 月會議紀要',      imp: 3, prev: '—',     est: '—' },
  { date: '05.21', day: '四', time: '14:00', region: 'TW', evt: '4 月 M2 貨幣供給年增率', imp: 1, prev: '5.42%', est: '5.50%' },
  { date: '05.22', day: '五', time: '20:30', region: 'US', evt: '上週初領失業金',          imp: 2, prev: '231K',  est: '220K' },
  { date: '05.22', day: '五', time: '21:45', region: 'US', evt: '5 月 PMI 初值',           imp: 3, prev: '51.2',  est: '51.5' },
  { date: '05.23', day: '六', time: '20:30', region: 'US', evt: '4 月耐久財訂單',          imp: 2, prev: '+0.8%', est: '−0.4%' },
];

// ─── Watchlist ───────────────────────────────────────────────
const watchlist = [
  { sym: '2330.TW', name: '台積電',       val: '928.0',  chg:  0.84, seed: 223 },
  { sym: 'AAPL',    name: 'Apple',        val: '212.84', chg:  1.24, seed: 227 },
  { sym: 'NVDA',    name: 'NVIDIA',       val: '1,124',  chg:  3.42, seed: 229 },
  { sym: 'TSLA',    name: 'Tesla',        val: '184.2',  chg: -1.12, seed: 233 },
  { sym: 'GOOG',    name: 'Alphabet',     val: '178.4',  chg:  0.42, seed: 239 },
  { sym: 'AMZN',    name: 'Amazon',       val: '184.7',  chg:  0.92, seed: 241 },
  { sym: '2454.TW', name: '聯發科',       val: '1,234',  chg:  1.42, seed: 251 },
  { sym: 'BTC-USD', name: 'Bitcoin',      val: '68,420', chg:  2.35, seed: 257 },
];

// ─── Portfolio ───────────────────────────────────────────────
const portfolio = {
  totalValue: 1284530,
  todayChg: 12840,
  todayPct: 1.01,
  totalPnL: 184320,
  totalPnLPct: 16.74,
  holdings: [
    { sym: '2330.TW', name: '台積電',  qty: 200, avg: 850.0, val: 928.0,  alloc: 14.4 },
    { sym: 'AAPL',    name: 'Apple',   qty: 50,  avg: 180.5, val: 212.84, alloc: 11.2 },
    { sym: 'NVDA',    name: 'NVIDIA',  qty: 20,  avg: 480.0, val: 1124,   alloc: 17.5 },
    { sym: 'VOO',     name: 'S&P ETF', qty: 80,  avg: 412.0, val: 542.3,  alloc: 33.8 },
    { sym: 'BTC-USD', name: 'Bitcoin', qty: 0.5, avg: 52000, val: 68420,  alloc: 26.6 },
    { sym: '現金',    name: 'TWD 現金', qty: null, avg: null, val: 200000, alloc: 15.6 },
  ],
};

// ─── Sentiment ────────────────────────────────────────────────
const sentiment = {
  vix: { val: 14.82, chg: -1.24, state: '低' },
  fearGreed: { val: 72, state: 'greed', text: '貪婪' },
  advDec: { adv: 1842, dec: 632, unch: 124 },
  putCall: { val: 0.82, chg: -0.04 },
  highsLows: { newHigh: 124, newLow: 18 },
  breadth: { val: 68, text: '68% 高於 200MA' },
};

// ─── Glossary — clickable financial terms ─────────────────────
const glossary = {
  'FOMC': '聯邦公開市場委員會（Federal Open Market Committee），美國聯準會中決定貨幣政策的核心單位，每年召開 8 次會議，決定聯邦資金利率目標。',
  'bp': '基點（basis point）。1 基點 = 0.01%。常用於描述利率或殖利率的小幅變動，例如「降息 25 bp」= 降息 0.25%。',
  '毛利率': '營收扣除直接成本後的比率。毛利率 = (營收 − 銷貨成本) / 營收。高毛利率代表產品定價能力強或成本控制好。',
  '資本支出': '企業為購置長期資產（廠房、設備、軟體）的支出，常稱 CapEx。AI 浪潮下，雲端業者的 CapEx 是觀察 AI 硬體需求的關鍵指標。',
  '主權 AI': '由國家或政府主導建置的 AI 基礎設施，目的是確保數據與運算主權。代表案例：日本、沙烏地阿拉伯、新加坡。',
  '會議紀要': 'FOMC 開會三週後公布的會議內容詳細紀錄（Minutes），可從中觀察委員之間的意見分歧與政策傾向。',
  '美元指數': '簡稱 DXY，衡量美元相對於六種主要貨幣（歐元、日圓、英鎊、加元、瑞典克朗、瑞士法郎）的綜合強弱。指數上升 = 美元走強。',
  '調節': '中央銀行進入外匯市場買賣外幣以影響匯率走勢的動作。台灣央行常於尾盤調節，避免單日波動過大。',
  '拋匯': '出口商或外資將外幣（多為美元）兌換成本國貨幣的動作。拋匯潮會使本國貨幣升值。',
  'OPEC+': '石油輸出國家組織（OPEC）加上俄羅斯等非 OPEC 產油國組成的聯盟，協調全球原油產量。',
  '自願性減產': 'OPEC+ 部分成員國在組織配額外，額外宣布的自主減產，常用於支撐油價。',
  '月減': '較上月（Month-over-Month, MoM）的變化幅度。',
  '年增': '較去年同期（Year-over-Year, YoY）的變化幅度。',
  '現貨 ETF': '直接持有現貨資產（例如實體比特幣）的交易所交易基金。美國於 2024 年通過比特幣現貨 ETF，成為加密貨幣里程碑。',
  '淨流入': 'ETF 申購金額減去贖回金額的淨值。連續淨流入代表資金持續進場。',
  '零售展望': '零售業者對未來季度或全年的營收 / 獲利預測，被視為消費景氣領先指標。',
  'YCC': '殖利率曲線控制（Yield Curve Control），央行設定特定期間公債殖利率上限的操作。日本央行於 2024 年起逐步退場。',
  '殖利率': '公債持有至到期的年化報酬率。殖利率與債券價格反向：殖利率上升 = 債券價格下跌。',
  '波動率指數': 'VIX，反映 S&P 500 未來 30 天的隱含波動率，俗稱「恐慌指數」。低於 15 通常代表市場樂觀，高於 30 代表恐慌。',
  '恐慌貪婪指數': 'CNN Money 編製的市場情緒指標，綜合波動率、動能、資金流向等 7 項指標，0 = 極度恐慌、100 = 極度貪婪。',
  '漲跌家數': '當日上漲家數與下跌家數的比較。漲家遠多於跌家代表市場廣度健康。',
  'Put/Call 比': '選擇權市場中賣權與買權的成交比。比值高 = 避險需求強。',
  '市場廣度': '衡量上漲股票佔總股票的比例，例如「68% 個股高於 200 日均線」是廣度指標。',
  '殖利率曲線': '不同到期日的公債殖利率連線。正常曲線是右上斜（長債高於短債）；倒掛（短債高於長債）常被視為衰退前兆。',
  '降息': '中央銀行調降基準利率。一般而言降息有利股市、債市，不利本國貨幣。',
};

// expose globally for other Babel scripts
Object.assign(window, {
  seedRand, makeSeries,
  DATA: {
    todayStory, pulseStrip, indices, forex, commodities, treasuries,
    crypto: cryptoData, news, calendar, watchlist, portfolio, sentiment, glossary,
  },
});
