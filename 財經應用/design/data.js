/* global */
// Mock data for the Worldwide Finance editorial dashboard.
// All numbers fabricated for design purposes — clearly not real market data.

const FIN_DATA = {
  // ─── Ticker strip (the always-on top rail) ───────────────────────────────
  tickerStrip: [
    { sym: 'DJI',    name: '道瓊',   price: 49526.17, ch: -537.29, pct: -1.07 },
    { sym: 'SPX',    name: 'S&P 500', price: 7408.50, ch: -92.74,  pct: -1.24 },
    { sym: 'IXIC',   name: '那斯達克', price: 26225.15, ch: -413.10, pct: -1.54 },
    { sym: 'TWSE',   name: '台股加權', price: 40891.82, ch: -280.54, pct: -0.68 },
    { sym: 'N225',   name: '日經',   price: 51284.20, ch: +312.66, pct: +0.61 },
    { sym: 'HSI',    name: '恒生',   price: 27943.55, ch: +88.12,  pct: +0.32 },
    { sym: 'FTSE',   name: '富時100', price: 9214.40, ch: -18.20,  pct: -0.20 },
    { sym: 'DXY',    name: '美元指數', price: 99.32,    ch: -0.34,   pct: -0.34 },
    { sym: 'GOLD',   name: '黃金',   price: 4568.50,  ch: +6.40,   pct: +0.14 },
    { sym: 'WTI',    name: '原油',   price: 71.84,    ch: +1.18,   pct: +1.67 },
    { sym: 'US10Y',  name: '10年美債', price: 4.184,   ch: -0.082,  pct: -1.92 },
    { sym: 'BTC',    name: '比特幣', price: 92449.20, ch: -861.40, pct: -0.93 },
  ],

  // ─── Hero narrative: today's story with linked markets ───────────────────
  hero: {
    eyebrow: '今日敘事 · 5月18日',
    kicker: 'FED · FX · 新興市場',
    headline: '聯準會按兵不動，美元走弱，黃金與新興市場接力上揚',
    deck: '主席鮑爾在記者會釋出對通膨「持續放緩」的信心，市場將降息預期前移至九月。美元指數跌破 99.5，亞洲匯市同步走強，台幣升至 30.42。',
    byline: '財經應用編輯部 · 14:32',
    affected: [
      { sym: 'DXY',  name: '美元指數', pct: -0.34, weight: 'lead' },
      { sym: 'GOLD', name: '黃金',     pct: +0.14, weight: 'normal' },
      { sym: 'EEM',  name: '新興市場 ETF', pct: +1.18, weight: 'normal' },
      { sym: 'USDTWD', name: '美元兌台幣', pct: -0.41, weight: 'normal' },
      { sym: 'US10Y', name: '10年美債殖利率', pct: -1.92, weight: 'normal' },
    ],
    chartPoints: [
      99.78, 99.74, 99.81, 99.85, 99.79, 99.71, 99.66, 99.61,
      99.58, 99.52, 99.49, 99.51, 99.46, 99.42, 99.38, 99.35,
      99.31, 99.34, 99.32,
    ],
    annotations: [
      { atIndex: 4, label: '14:00 利率決議公布', dir: 'down' },
      { atIndex: 12, label: '14:30 鮑爾記者會', dir: 'down' },
    ],
  },

  // ─── News feed (with linked tickers) ─────────────────────────────────────
  news: [
    {
      id: 'n1',
      tag: '科技',
      title: '輝達 Blackwell 出貨優於預期，台積電下季營收上修',
      summary: '管理層在電話會議中指出，AI 伺服器訂單能見度延伸至 2027 年首季。',
      source: 'Reuters', time: '12 分鐘前',
      tickers: [
        { sym: 'NVDA', pct: +2.84 },
        { sym: '2330', pct: -1.10 },
        { sym: 'AVGO', pct: +1.62 },
      ],
      color: 'a',
    },
    {
      id: 'n2',
      tag: '原物料',
      title: 'OPEC+ 延長減產協議，布蘭特原油站回 76 美元',
      summary: '沙烏地阿拉伯與俄羅斯同步重申自願減產 100 萬桶／日將延至年底。',
      source: 'Bloomberg', time: '38 分鐘前',
      tickers: [
        { sym: 'WTI',  pct: +1.67 },
        { sym: 'XOM',  pct: +0.92 },
      ],
      color: 'c',
    },
    {
      id: 'n3',
      tag: '宏觀',
      title: '日銀維持負利率政策，日圓對美元一度貶破 158',
      summary: '植田總裁稱仍需更多數據確認薪資與通膨形成良性循環，市場推遲升息預期。',
      source: '日經', time: '1 小時前',
      tickers: [
        { sym: 'USDJPY', pct: +0.42 },
        { sym: 'N225',   pct: +0.61 },
      ],
      color: 'd',
    },
    {
      id: 'n4',
      tag: '加密',
      title: '比特幣現貨 ETF 連兩日淨流出，市場觀望聯準會會議紀要',
      summary: 'BlackRock IBIT 單日流出 1.2 億美元，為三月以來最大；以太幣相對抗跌。',
      source: 'CoinDesk', time: '2 小時前',
      tickers: [
        { sym: 'BTC', pct: -0.93 },
        { sym: 'ETH', pct: -2.03 },
      ],
      color: 'b',
    },
    {
      id: 'n5',
      tag: '台股',
      title: '台積電北美設廠進度提前，亞利桑那二期 2027 年量產',
      summary: '客戶優先排程的 2 奈米與 3 奈米產線已完成設備搬入測試。',
      source: '工商時報', time: '3 小時前',
      tickers: [
        { sym: '2330', pct: -1.10 },
        { sym: 'TWSE', pct: -0.68 },
      ],
      color: 'f',
    },
    {
      id: 'n6',
      tag: '債券',
      title: '殖利率曲線倒掛收斂至 4 個基點，市場押注週期延長',
      summary: '10 年期與 2 年期利差收窄至自 2024 年以來最低，反映軟著陸樂觀情緒。',
      source: '路透', time: '4 小時前',
      tickers: [
        { sym: 'US10Y', pct: -1.92 },
        { sym: 'US2Y',  pct: -0.84 },
      ],
      color: 'e',
    },
  ],

  // ─── Markets ─────────────────────────────────────────────────────────────
  indices: [
    { sym: 'DJI',  name: '道瓊指數',    price: 49526.17, ch: -537.29, pct: -1.07, state: 'CLOSED',
      spark: [49800, 49860, 49920, 49870, 49680, 49580, 49500, 49526] },
    { sym: 'SPX',  name: 'S&P 500',    price:  7408.50, ch: -92.74,  pct: -1.24, state: 'CLOSED',
      spark: [7500, 7510, 7480, 7460, 7420, 7400, 7390, 7408] },
    { sym: 'IXIC', name: '那斯達克',    price: 26225.15, ch: -413.10, pct: -1.54, state: 'CLOSED',
      spark: [26640, 26620, 26580, 26500, 26400, 26310, 26280, 26225] },
    { sym: 'TWSE', name: '台股加權',    price: 40891.82, ch: -280.54, pct: -0.68, state: 'OPEN',
      spark: [41170, 41090, 41020, 40970, 40920, 40870, 40880, 40891] },
    { sym: 'N225', name: '日經 225',    price: 51284.20, ch: +312.66, pct: +0.61, state: 'CLOSED',
      spark: [50971, 51020, 51100, 51180, 51220, 51260, 51290, 51284] },
    { sym: 'HSI',  name: '恒生指數',    price: 27943.55, ch: +88.12,  pct: +0.32, state: 'CLOSED',
      spark: [27855, 27880, 27905, 27940, 27930, 27950, 27935, 27943] },
    { sym: 'FTSE', name: '富時 100',    price:  9214.40, ch: -18.20,  pct: -0.20, state: 'OPEN',
      spark: [9232, 9226, 9220, 9218, 9210, 9216, 9212, 9214] },
    { sym: 'DAX',  name: 'DAX 30',     price: 22418.90, ch: +52.30,  pct: +0.23, state: 'OPEN',
      spark: [22366, 22380, 22400, 22420, 22410, 22425, 22415, 22418] },
  ],

  forex: [
    { sym: 'USDTWD', name: '美元／台幣', price: 30.4250, ch: -0.1240, pct: -0.41,
      spark: [30.55, 30.53, 30.49, 30.47, 30.45, 30.43, 30.42, 30.42] },
    { sym: 'USDJPY', name: '美元／日圓', price: 157.84, ch: +0.66,    pct: +0.42,
      spark: [157.18, 157.30, 157.45, 157.55, 157.62, 157.70, 157.78, 157.84] },
    { sym: 'EURUSD', name: '歐元／美元', price: 1.0884, ch: +0.0042,  pct: +0.39,
      spark: [1.0842, 1.0848, 1.0858, 1.0866, 1.0874, 1.0880, 1.0882, 1.0884] },
    { sym: 'GBPUSD', name: '英鎊／美元', price: 1.2746, ch: +0.0028,  pct: +0.22,
      spark: [1.2718, 1.2724, 1.2730, 1.2734, 1.2740, 1.2742, 1.2744, 1.2746] },
    { sym: 'USDCNH', name: '美元／離岸人民幣', price: 7.2384, ch: -0.0212, pct: -0.29,
      spark: [7.2596, 7.2540, 7.2480, 7.2440, 7.2410, 7.2390, 7.2386, 7.2384] },
    { sym: 'DXY',    name: '美元指數', price: 99.32, ch: -0.34, pct: -0.34,
      spark: [99.66, 99.58, 99.52, 99.46, 99.42, 99.38, 99.34, 99.32] },
  ],

  commodities: [
    { sym: 'GOLD', name: '黃金 (現貨)', price: 4568.50, ch: +6.40, pct: +0.14, unit: 'USD/oz',
      spark: [4562, 4564, 4566, 4565, 4566, 4567, 4568, 4568] },
    { sym: 'WTI',  name: 'WTI 原油',   price:   71.84, ch: +1.18, pct: +1.67, unit: 'USD/bbl',
      spark: [70.66, 70.84, 71.02, 71.20, 71.42, 71.60, 71.78, 71.84] },
    { sym: 'BRENT',name: '布蘭特原油', price:   75.62, ch: +1.28, pct: +1.72, unit: 'USD/bbl',
      spark: [74.34, 74.52, 74.74, 75.00, 75.20, 75.40, 75.55, 75.62] },
    { sym: 'SILVER', name: '白銀',     price:   54.18, ch: -0.22, pct: -0.40, unit: 'USD/oz',
      spark: [54.40, 54.35, 54.28, 54.22, 54.18, 54.16, 54.20, 54.18] },
    { sym: 'COPPER', name: '銅',       price:    4.728, ch: +0.024, pct: +0.51, unit: 'USD/lb',
      spark: [4.704, 4.710, 4.716, 4.720, 4.724, 4.726, 4.726, 4.728] },
    { sym: 'NGAS', name: '天然氣',     price:    3.482, ch: -0.041, pct: -1.16, unit: 'USD/MMBtu',
      spark: [3.523, 3.518, 3.510, 3.502, 3.494, 3.488, 3.484, 3.482] },
  ],

  treasuries: [
    { sym: 'US2Y',  name: '美國 2 年期',  price: 3.918, ch: -0.033, pct: -0.84,
      spark: [3.951, 3.948, 3.942, 3.936, 3.928, 3.922, 3.920, 3.918] },
    { sym: 'US5Y',  name: '美國 5 年期',  price: 4.024, ch: -0.058, pct: -1.42,
      spark: [4.082, 4.074, 4.062, 4.050, 4.040, 4.032, 4.026, 4.024] },
    { sym: 'US10Y', name: '美國 10 年期', price: 4.184, ch: -0.082, pct: -1.92,
      spark: [4.266, 4.252, 4.236, 4.220, 4.208, 4.196, 4.188, 4.184] },
    { sym: 'US30Y', name: '美國 30 年期', price: 4.512, ch: -0.064, pct: -1.40,
      spark: [4.576, 4.566, 4.552, 4.540, 4.528, 4.520, 4.514, 4.512] },
  ],

  crypto: [
    { sym: 'BTC',  name: '比特幣',    price: 92449.20, ch: -861.40, pct: -0.93,
      spark: [93310, 93120, 92880, 92660, 92520, 92410, 92440, 92449] },
    { sym: 'ETH',  name: '以太幣',    price:  4082.55, ch: -84.62, pct: -2.03,
      spark: [4167, 4156, 4138, 4118, 4098, 4088, 4080, 4082] },
    { sym: 'SOL',  name: 'Solana',    price:   228.40, ch: -3.62, pct: -1.56,
      spark: [232.02, 231.40, 230.60, 229.80, 229.00, 228.50, 228.30, 228.40] },
    { sym: 'BNB',  name: 'BNB',       price:   744.80, ch: +2.20, pct: +0.30,
      spark: [742.60, 743.10, 743.60, 744.00, 744.20, 744.50, 744.70, 744.80] },
  ],

  // ─── Watchlist ────────────────────────────────────────────────────────────
  watchlist: [
    { sym: '2330', name: '台積電',  price: 2240.00, ch: -25.00, pct: -1.10, state: 'OPEN' },
    { sym: 'AAPL', name: 'Apple',  price:  227.45, ch:  +1.84, pct: +0.81, state: 'CLOSED' },
    { sym: 'NVDA', name: '輝達',    price:  886.20, ch: +24.40, pct: +2.84, state: 'CLOSED' },
    { sym: 'GOOG', name: '谷歌-C',  price:  393.32, ch:  -3.85, pct: -0.97, state: 'CLOSED' },
    { sym: 'TSLA', name: '特斯拉',  price:  286.40, ch:  +4.92, pct: +1.75, state: 'CLOSED' },
    { sym: '0050', name: '元大台灣50', price: 218.30, ch: -1.40, pct: -0.64, state: 'OPEN' },
  ],

  // ─── Portfolio ────────────────────────────────────────────────────────────
  portfolio: {
    totalValue: 12_482_650,
    dailyChange: -42_180,
    dailyPct: -0.34,
    monthlyPct: +4.82,
    yearlyPct: +28.46,
    cash: 482_650,
    holdings: [
      { sym: '2330', name: '台積電',   shares: 2000, avg: 1985.40, last: 2240.00, weight: 35.9 },
      { sym: 'NVDA', name: '輝達',     shares:  120, avg:  642.80, last:  886.20, weight: 22.1 },
      { sym: '0050', name: '元大台灣50', shares: 5000, avg:  198.20, last:  218.30, weight: 17.8 },
      { sym: 'AAPL', name: 'Apple',   shares:  400, avg:  186.20, last:  227.45, weight: 12.4 },
      { sym: 'BTC',  name: '比特幣',   shares: 0.42, avg: 78420.00, last: 92449.20, weight: 11.8 },
    ],
  },

  // ─── Market sentiment ─────────────────────────────────────────────────────
  sentiment: {
    fearGreed: 38,         // 0 fear, 100 greed
    fearGreedLabel: '恐懼',
    fearGreedYesterday: 44,
    vix: 18.42,
    vixCh: +1.84,
    putCall: 1.12,
    advancers: 982,
    decliners: 1647,
    unchanged: 124,
    newHighs: 38,
    newLows: 142,
  },

  // ─── Economic calendar ────────────────────────────────────────────────────
  calendar: [
    { time: '14:30', date: '今日', country: 'US', importance: 3, event: 'CPI 年增率',     forecast: '2.8%', prev: '3.0%' },
    { time: '20:00', date: '今日', country: 'US', importance: 3, event: 'FOMC 會議紀要',   forecast: '—',    prev: '—' },
    { time: '07:50', date: '明日', country: 'JP', importance: 2, event: '機械訂單 月增',    forecast: '+1.4%', prev: '-2.8%' },
    { time: '17:00', date: '明日', country: 'EU', importance: 2, event: '工業生產 月增',    forecast: '+0.2%', prev: '+0.6%' },
    { time: '20:30', date: '5/20', country: 'US', importance: 2, event: '零售銷售 月增',    forecast: '+0.3%', prev: '+0.7%' },
    { time: '09:30', date: '5/21', country: 'CN', importance: 1, event: '一年期 LPR',     forecast: '3.10%', prev: '3.10%' },
    { time: '21:30', date: '5/22', country: 'US', importance: 3, event: '初領失業金人數',  forecast: '218K',  prev: '224K' },
  ],
};

window.FIN_DATA = FIN_DATA;
