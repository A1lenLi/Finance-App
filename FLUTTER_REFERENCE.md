# 財經脈動 Flutter 移植參考文件

此文件為從 Electron 版本移植至 Flutter Android/iOS 時的完整技術參考。

---

## 一、資料來源架構

### 1. Yahoo Finance（核心行情）
所有請求需帶以下 Headers，否則會被擋：
```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Accept: application/json
Accept-Language: en-US,en;q=0.9
Referer: https://finance.yahoo.com/
```

#### 即時報價（批次）
```
GET https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,2330.TW,^GSPC
```
回傳：`quoteResponse.result[]` 每個物件含：
- `regularMarketPrice` — 現價
- `regularMarketChangePercent` — 漲跌幅 %
- `regularMarketChange` — 漲跌金額
- `chartPreviousClose` / `previousClose` — 昨收
- `shortName` / `longName` — 名稱
- `marketCap` — 市值
- `marketState` — REGULAR / PRE / POST / CLOSED

#### 歷史圖表
```
GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=3mo
```
interval 選項：`1m`, `5m`, `15m`, `30m`, `60m`, `1d`, `1wk`, `1mo`
range 選項：`1d`, `5d`, `1mo`, `3mo`, `6mo`, `ytd`, `1y`, `5y`, `max`

回傳路徑：`chart.result[0]`
- `timestamp[]` — Unix 時間戳
- `indicators.quote[0].{open,high,low,close,volume}[]`

#### 個股詳細資料
```
GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d&includePrePost=true
```

#### 同業比較
```
GET https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/{symbol}
```
回傳：`finance.result[0].recommendedSymbols[]`

#### 個股新聞
```
GET https://query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=10&enableNavLinks=false
```
回傳：`news[]` 含 `{title, publisher, providerPublishTime, link, uuid}`

#### 股票搜尋
```
GET https://query1.finance.yahoo.com/v1/finance/search?q={query}&newsCount=0&enableNavLinks=false
```
回傳：`quotes[]` 含 `{symbol, shortname, longname, quoteType, exchDisp}`

### 2. 台股名稱（TWSE + TPEx）
```
GET https://isin.twse.com.tw/isin/C_public.jsp?strMode=2  // 上市
GET https://isin.twse.com.tw/isin/C_public.jsp?strMode=4  // 上櫃
```
回傳 HTML，解析 `<tr>` → 第一格取股票代碼和名稱（格式：`代碼　　名稱`）
TTL 快取建議：12 小時

### 3. 鉅亨網新聞
```
GET https://api.cnyes.com/media/api/v1/newslist/category/{category}?limit=20&page=1
Headers: Referer: https://www.cnyes.com/
```
category 選項：`tw_stock`（台股）, `wd_stock`（全球）

回傳：`items.data[]` 含：
- `newsId`, `title`, `summary`, `publishAt`（Unix）
- `coverSrc.l.src` / `coverSrc.m.src` — 圖片 URL
- `stock[]` — 相關股票代碼

新聞 URL：`https://news.cnyes.com/news/id/{newsId}`

**品質過濾**：只保留 `summary.length >= 60` 的文章（速報會被濾掉）

### 4. 經濟日報 RSS
```
GET https://money.udn.com/rssfeed/news/1001/5607/index.xml
```
標準 RSS XML，解析 `<item>` 取 `<title>`, `<description>`, `<link>`, `<pubDate>`

### 5. Finnhub（財經日曆）
```
GET https://finnhub.io/api/v1/calendar/economic?from=YYYY-MM-DD&to=YYYY-MM-DD&token={KEY}
```
KEY: `d8dv9apr01qhm4ahlou0d8dv9apr01qhm4ahloug`

回傳：`economicCalendar[]` 含：
- `event` — 英文事件名稱
- `impact` — `high` / `medium` / `low`
- `time` — `YYYY-MM-DD`
- `prev`, `estimate`, `actual`

只抓 `impact === 'high'` 的美國（`country === 'US'`）事件

### 6. 市場情緒指數
**加密貪婪指數**（無需 key）：
```
GET https://api.alternative.me/fng/?limit=1
```
回傳：`data[0].{value, value_classification}`

**股市貪婪指數**（CNN，非官方）：
```
GET https://production.dataviz.cnn.io/index/fearandgreed/graphdata
Headers: Referer: https://money.cnn.com/
```
回傳：`fear_and_greed.score`

---

## 二、行情符號對照

### 全球指數
| 顯示名 | Yahoo Symbol |
|--------|-------------|
| SPX | ^GSPC |
| DJI | ^DJI |
| NDX | ^IXIC |
| TWII | ^TWII |
| N225 | ^N225 |
| HSI | ^HSI |
| DAX | ^GDAXI |
| FTSE | ^FTSE |

### 台幣外匯（TWD 中心）
| 顯示名 | Yahoo Symbol |
|--------|-------------|
| USD/TWD | USDTWD=X |
| EUR/TWD | EURTWD=X |
| JPY/TWD | JPYTWD=X |
| GBP/TWD | GBPTWD=X |
| CNY/TWD | CNYTWD=X |
| AUD/TWD | AUDTWD=X |
| HKD/TWD | HKDTWD=X |
| SGD/TWD | SGDTWD=X |

### 大宗商品
| 顯示名 | Yahoo Symbol |
|--------|-------------|
| WTI 原油 | CL=F |
| BRENT | BZ=F |
| 黃金 | GC=F |
| 白銀 | SI=F |
| 天然氣 | NG=F |
| 銅 | HG=F |

### 美債殖利率
| 顯示名 | Yahoo Symbol |
|--------|-------------|
| US10Y | ^TNX |
| US5Y | ^FVX |
| US30Y | ^TYX |
| US3M | ^IRX |

### 加密貨幣
`BTC-USD`, `ETH-USD`, `SOL-USD`, `BNB-USD`, `XRP-USD`

### 市場情緒
`^VIX` — CBOE 波動率指數

---

## 三、價格格式化規則

```dart
String formatPrice(double price, String symbol) {
  if (symbol.endsWith('=X')) {           // 外匯
    if (price >= 10)  return price.toStringAsFixed(3);
    if (price >= 1)   return price.toStringAsFixed(4);
    return price.toStringAsFixed(5);
  }
  if (symbol.startsWith('^') ||          // 指數/殖利率
      ['CL=F','BZ=F','GC=F','SI=F','NG=F','HG=F'].contains(symbol)) {
    if (price >= 1000) return price.toStringAsFixed(2);
    if (price >= 10)   return price.toStringAsFixed(3);
    return price.toStringAsFixed(4);
  }
  // 一般股票
  if (price >= 1000) return price.toStringAsFixed(1);
  if (price >= 100)  return price.toStringAsFixed(2);
  if (price >= 10)   return price.toStringAsFixed(3);
  return price.toStringAsFixed(4);
}
```

---

## 四、市場開盤時間（UTC）

```dart
Map<String, dynamic> getMarketStatus() {
  final now = DateTime.now().toUtc();
  final day = now.weekday; // 1=Mon..7=Sun
  final utcMin = now.hour * 60 + now.minute;
  final isWeekday = day <= 5;

  // TWSE: 09:00–13:30 UTC+8 → 01:00–05:30 UTC
  final twseOpen = isWeekday && utcMin >= 60 && utcMin < 330;

  // NYSE: EDT(Mar-Nov) 13:30–20:00 UTC / EST 14:30–21:00 UTC
  final month = now.month;
  final isEDT = month >= 3 && month <= 11;
  final nyseStart = isEDT ? 810 : 870;
  final nyseEnd   = isEDT ? 1200 : 1260;
  final nyseOpen  = isWeekday && utcMin >= nyseStart && utcMin < nyseEnd;

  if (twseOpen && nyseOpen) return {'open': true, 'label': 'NYSE · TWSE 開盤中'};
  if (twseOpen)             return {'open': true, 'label': 'TWSE 開盤中'};
  if (nyseOpen)             return {'open': true, 'label': 'NYSE 開盤中'};
  return {'open': false, 'label': '休市中'};
}
```

---

## 五、AI 新聞分析

### Groq（主要，免費）
```
POST https://api.groq.com/openai/v1/chat/completions
Authorization: Bearer {groqKey}
{
  "model": "qwen/qwen3-32b",
  "max_tokens": 1500,
  "messages": [{"role": "user", "content": "..."}]
}
```
限制：6000 TPM（input + output），文章內容截斷至 1200 字元

### Anthropic（備援）
```
POST https://api.anthropic.com/v1/messages
x-api-key: {anthropicKey}
anthropic-version: 2023-06-01
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1500
}
```

### 回傳 JSON 格式（AI 解析後）
```json
{
  "summary": "三句話核心摘要",
  "detail": "深入分析段落",
  "sentiment": "bullish|bearish|neutral",
  "stocks": ["台積電(2330.TW)", "NVIDIA(NVDA)"],
  "catalysts": ["催化劑1", "催化劑2"],
  "risks": ["風險1", "風險2"],
  "points": ["重點1", "重點2", "重點3"]
}
```

---

## 六、新聞分類邏輯

```dart
String classifyNewsTag(String title) {
  if (RegExp(r'央行|Fed|FOMC|利率|降息|升息|鮑爾|Powell|聯準會|ECB|BOJ').hasMatch(title)) return '央行';
  if (RegExp(r'匯率|美元|外匯|新台幣|人民幣|日圓|歐元').hasMatch(title)) return '匯市';
  if (RegExp(r'比特幣|BTC|以太|ETH|加密|Crypto').hasMatch(title)) return '加密';
  if (RegExp(r'半導體|AI|人工智慧|台積電|TSMC|輝達|NVIDIA|晶片').hasMatch(title)) return '科技';
  return '財經';
}
```

---

## 七、建議 Flutter 套件

| 功能 | 套件 |
|------|------|
| HTTP 請求 | `dio` |
| 圖表 | `fl_chart` |
| RSS 解析 | `webfeed` |
| 本地儲存 | `shared_preferences` + `sqflite` |
| 狀態管理 | `riverpod` 或 `bloc` |
| 國際化 | `flutter_localizations` |
| SVG | `flutter_svg` |
| WebView（新聞） | `webview_flutter` |

---

## 八、資料刷新策略

- 行情：每 5 分鐘自動刷新
- Sparklines：與行情同步，啟動時批次抓取所有追蹤標的
- 新聞：啟動時抓一次，手動刷新
- 財經日曆：啟動時抓一次（Finnhub 有快取）
- 情緒指數：啟動時抓一次

---

## 九、本地資料模型（對應 Flutter class）

```dart
class MarketRow {
  final String sym;      // 顯示符號 e.g. "SPX"
  final String name;     // 完整名稱
  final String val;      // 格式化價格字串
  final double chg;      // 漲跌幅 %
  final String? region;  // "US"|"TW"|"JP"|"HK"|"EU"|"UK"
  final String rawSym;   // Yahoo 原始符號
}

class NewsItem {
  final String id;
  final String tier;     // "hero"|"major"|"std"
  final String tag;      // "央行"|"匯市"|"科技"|"加密"|"財經"
  final String title;
  final String summary;
  final String source;   // "鉅亨網"|"經濟日報"
  final String time;     // "3 分鐘前"
  final String? coverUrl;
  final String url;
}

class EconomicEvent {
  final String date;     // "06.10"
  final String day;      // "三"
  final String time;     // "20:30"
  final String region;   // "US"
  final String evt;      // "CPI 消費者物價指數"
  final int imp;         // 1|2|3
  final String prev;
  final String est;
}
```
