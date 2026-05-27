import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { request } from 'https'
import { deflateSync } from 'zlib'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// ── Tray icon (16x16 solid #3b82f6 PNG generated at runtime) ──────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makeTrayIcon() {
  const size = 16
  const rowBuf = Buffer.alloc(1 + size * 3)
  for (let x = 0; x < size; x++) {
    rowBuf[1 + x * 3] = 59; rowBuf[2 + x * 3] = 130; rowBuf[3 + x * 3] = 246
  }
  const raw = Buffer.concat(Array(size).fill(rowBuf))
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ])
  return nativeImage.createFromBuffer(png)
}

// ── Market data ───────────────────────────────────────────────────────────
const SYMBOLS_CONFIG = {
  indices: [
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^DJI', name: '道瓊工業' },
    { symbol: '^IXIC', name: 'Nasdaq' },
    { symbol: '^TWII', name: '台灣加權' },
    { symbol: '^N225', name: '日經 225' },
    { symbol: '^HSI', name: '恆生指數' },
    { symbol: '^GDAXI', name: 'DAX' },
    { symbol: '^FTSE', name: 'FTSE 100' }
  ],
  forex: [
    { symbol: 'USDTWD=X', name: 'USD / TWD' },
    { symbol: 'EURUSD=X', name: 'EUR / USD' },
    { symbol: 'USDJPY=X', name: 'USD / JPY' },
    { symbol: 'GBPUSD=X', name: 'GBP / USD' },
    { symbol: 'USDCNY=X', name: 'USD / CNY' },
    { symbol: 'AUDUSD=X', name: 'AUD / USD' }
  ],
  commodities: [
    { symbol: 'CL=F', name: '原油 WTI' },
    { symbol: 'BZ=F', name: '布蘭特原油' },
    { symbol: 'GC=F', name: '黃金' },
    { symbol: 'SI=F', name: '白銀' },
    { symbol: 'NG=F', name: '天然氣' },
    { symbol: 'HG=F', name: '銅' }
  ],
  bonds: [
    { symbol: '^TNX', name: '美債 10Y', isYield: true },
    { symbol: '^FVX', name: '美債 5Y', isYield: true },
    { symbol: '^TYX', name: '美債 30Y', isYield: true },
    { symbol: '^IRX', name: '美債 3M', isYield: true }
  ],
  crypto: [
    { symbol: 'BTC-USD',  name: 'Bitcoin' },
    { symbol: 'ETH-USD',  name: 'Ethereum' },
    { symbol: 'SOL-USD',  name: 'Solana' },
    { symbol: 'BNB-USD',  name: 'BNB' },
    { symbol: 'XRP-USD',  name: 'XRP' },
    { symbol: 'ADA-USD',  name: 'Cardano' },
    { symbol: 'DOGE-USD', name: 'Dogecoin' },
    { symbol: 'AVAX-USD', name: 'Avalanche' },
  ],
  vix: [
    { symbol: '^VIX', name: 'CBOE 波動率指數' }
  ]
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/'
}

function httpsGet(options) {
  return new Promise((resolve, reject) => {
    const req = request(options, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString()
          if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
          resolve(JSON.parse(body))
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

/** 從 TWSE/TPEx 快取取中文名稱，找不到回傳 null */
function twName(symbol) {
  if (!_twCache) return null
  const entry = _twCache.find(s => s.symbol === symbol)
  return entry?.name ?? null
}

async function fetchQuote(item) {
  try {
    const data = await httpsGet({
      hostname: 'query1.finance.yahoo.com',
      path: `/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=1d&range=1d&includePrePost=true`,
      method: 'GET',
      headers: HEADERS
    })
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta || meta.regularMarketPrice == null) return { ...item, error: true }
    const price = meta.regularMarketPrice
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price
    const change = price - previousClose
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0
    const sym = meta.symbol || item.symbol
    const isTW = sym.endsWith('.TW') || sym.endsWith('.TWO')
    // 台股：TWSE 快取 > Yahoo shortName > Yahoo longName > 既有名稱
    // 外國：Yahoo longName > Yahoo shortName > 既有名稱
    const longName = isTW
      ? (twName(sym) ?? meta.shortName ?? meta.longName ?? item.name ?? sym)
      : (meta.longName ?? meta.shortName ?? item.name ?? sym)
    return { ...item, name: longName, price, change, changePercent, previousClose, marketState: meta.marketState ?? null, marketCap: meta.marketCap ?? null, error: false }
  } catch {
    return { ...item, error: true }
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchBatch(items) {
  const results = []
  for (let i = 0; i < items.length; i += 6) {
    const group = items.slice(i, i + 6)
    results.push(...await Promise.all(group.map(fetchQuote)))
    if (i + 6 < items.length) await delay(300)
  }
  return results
}

async function fetchSparkline(symbol) {
  try {
    const data = await httpsGet({
      hostname: 'query1.finance.yahoo.com',
      path: `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d&includePrePost=false`,
      method: 'GET',
      headers: HEADERS
    })
    const result = data?.chart?.result?.[0]
    if (!result) return { symbol, prices: null }
    const closes = result.indicators?.quote?.[0]?.close ?? []
    const prices = closes.filter(c => c != null)
    return { symbol, prices: prices.length > 2 ? prices : null }
  } catch {
    return { symbol, prices: null }
  }
}

async function fetchSparklines(symbols) {
  const out = {}
  for (let i = 0; i < symbols.length; i += 6) {
    const group = symbols.slice(i, i + 6)
    const batch = await Promise.all(group.map(fetchSparkline))
    batch.forEach(r => { if (r.prices) out[r.symbol] = r.prices })
    if (i + 6 < symbols.length) await delay(300)
  }
  return out
}

async function fetchAllMarketData() {
  // 確保 TWSE 快取已就緒（最多等 4 秒），台股名稱才能用中文
  if (!_twCache) await Promise.race([getTWStocks(), delay(4000)])
  const allItems = [
    ...SYMBOLS_CONFIG.indices, ...SYMBOLS_CONFIG.forex,
    ...SYMBOLS_CONFIG.commodities, ...SYMBOLS_CONFIG.bonds,
    ...SYMBOLS_CONFIG.crypto, ...SYMBOLS_CONFIG.vix,
  ]
  const results = await fetchBatch(allItems)
  const indexed = {}
  results.forEach(r => { indexed[r.symbol] = r })
  return {
    indices:     SYMBOLS_CONFIG.indices.map(s => indexed[s.symbol]),
    forex:       SYMBOLS_CONFIG.forex.map(s => indexed[s.symbol]),
    commodities: SYMBOLS_CONFIG.commodities.map(s => indexed[s.symbol]),
    bonds:       SYMBOLS_CONFIG.bonds.map(s => indexed[s.symbol]),
    crypto:      SYMBOLS_CONFIG.crypto.map(s => indexed[s.symbol]),
    vix:         indexed['^VIX'] ?? null,
    updatedAt: new Date().toISOString()
  }
}

// ── TW Stock cache (TWSE + TPEx) ─────────────────────────────────────────
let _twCache = null
let _twCacheTs = 0
const TW_CACHE_TTL = 12 * 3600 * 1000

function hasChinese(str) { return /[一-鿿㐀-䶿＀-￯]/.test(str) }
function isDigitsOnly(str) { return /^\d+$/.test(str.trim()) }

async function getTWStocks() {
  if (_twCache && Date.now() - _twCacheTs < TW_CACHE_TTL) return _twCache
  const stocks = []
  // TWSE listed stocks
  try {
    const twse = await httpsGet({
      hostname: 'openapi.twse.com.tw',
      path: '/v1/exchangeReport/STOCK_DAY_ALL',
      method: 'GET',
      headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json', 'Accept-Language': 'zh-TW,zh;q=0.9' }
    })
    if (Array.isArray(twse)) {
      twse.filter(s => s.Code && s.Name && /^\d{4}/.test(s.Code)).forEach(s => {
        stocks.push({ symbol: s.Code + '.TW', name: s.Name, exchange: 'TWSE', type: '股票' })
      })
    }
  } catch {}
  // TPEx (OTC) listed stocks
  try {
    const tpex = await httpsGet({
      hostname: 'www.tpex.org.tw',
      path: '/openapi/v1/tpex_mainboard_daily_close_quotes',
      method: 'GET',
      headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json' }
    })
    if (Array.isArray(tpex)) {
      tpex.filter(s => s.SecuritiesCompanyCode && s.CompanyName).forEach(s => {
        stocks.push({ symbol: s.SecuritiesCompanyCode + '.TWO', name: s.CompanyName, exchange: 'TPEx', type: '股票' })
      })
    }
  } catch {}
  if (stocks.length > 0) {
    _twCache = stocks
    _twCacheTs = Date.now()
  }
  return _twCache || []
}

// ── Persistence helpers ───────────────────────────────────────────────────
function readJson(filename, fallback) {
  const p = join(app.getPath('userData'), filename)
  if (!existsSync(p)) return fallback
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return fallback }
}

function writeJson(filename, data) {
  writeFileSync(join(app.getPath('userData'), filename), JSON.stringify(data), 'utf-8')
}

// ── Window & Tray ─────────────────────────────────────────────────────────
let mainWindow = null
let tray = null
let isQuitting = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860, minWidth: 960, minHeight: 640,
    show: false, autoHideMenuBar: true, backgroundColor: '#0a0e1a',
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.on('close', e => {
    if (!isQuitting) { e.preventDefault(); mainWindow.hide() }
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.finance.dashboard')

  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  createWindow()

  // System tray
  tray = new Tray(makeTrayIcon())
  tray.setToolTip('金融市場儀表板')
  tray.on('double-click', () => { mainWindow?.show() })
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '顯示視窗', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '結束程式', click: () => { isQuitting = true; app.quit() } }
  ]))

  // IPC handlers
  ipcMain.handle('fetch-market-data', async () => fetchAllMarketData())
  ipcMain.handle('fetch-sparklines', async (_, symbols) => fetchSparklines(symbols))
  ipcMain.handle('get-watchlist', () => readJson('watchlist.json', []))
  ipcMain.handle('save-watchlist', (_, list) => { writeJson('watchlist.json', list); return true })
  ipcMain.handle('fetch-watchlist-data', async () => {
    const list = readJson('watchlist.json', [])
    if (!list.length) return []
    if (!_twCache) await Promise.race([getTWStocks(), delay(4000)])
    return fetchBatch(list)
  })
  ipcMain.handle('lookup-symbol', async (_, symbol) => {
    try {
      const data = await httpsGet({
        hostname: 'query1.finance.yahoo.com',
        path: `/v8/finance/chart/${encodeURIComponent(symbol.trim().toUpperCase())}?interval=1d&range=1d`,
        method: 'GET', headers: HEADERS
      })
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta || meta.regularMarketPrice == null) return null
      const sym = meta.symbol || symbol.trim().toUpperCase()
      const isTW = sym.endsWith('.TW') || sym.endsWith('.TWO')
      const name = isTW
        ? (twName(sym) ?? meta.shortName ?? meta.longName ?? sym)
        : (meta.longName ?? meta.shortName ?? sym)
      return { symbol: sym, name }
    } catch { return null }
  })

  ipcMain.handle('search-symbol', async (_, query) => {
    const q = (query || '').trim()
    if (!q) return []
    const isZh  = hasChinese(q)
    const isNum = isDigitsOnly(q)

    // ── Chinese name or digit code → search local TW cache first ──────
    if (isZh || isNum) {
      const stocks = await getTWStocks()
      let matches = []
      if (isZh) {
        // exact contains match on name
        matches = stocks.filter(s => s.name.includes(q))
      } else {
        // digit prefix match on code (strip the .TW / .TWO suffix)
        matches = stocks.filter(s => s.symbol.replace(/\.(TW|TWO)$/, '').startsWith(q))
      }
      if (matches.length > 0) return matches.slice(0, 8)

      // No cache hit for digits → direct Yahoo chart lookup for both .TW and .TWO
      if (isNum) {
        const candidates = [q + '.TW', q + '.TWO']
        for (const sym of candidates) {
          try {
            const data = await httpsGet({
              hostname: 'query1.finance.yahoo.com',
              path: `/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
              method: 'GET', headers: HEADERS
            })
            const meta = data?.chart?.result?.[0]?.meta
            if (meta?.regularMarketPrice != null) {
              const name = meta.shortName || meta.longName || sym
              return [{ symbol: meta.symbol || sym, name, exchange: sym.endsWith('.TWO') ? 'TPEx' : 'TWSE', type: '股票' }]
            }
          } catch {}
        }
      }
      return []
    }

    // ── English / ticker code → Yahoo Finance search (query2 is more stable) ──
    try {
      const data = await httpsGet({
        hostname: 'query2.finance.yahoo.com',
        path: `/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&quotesCount=8&newsCount=0&enableNavLinks=false`,
        method: 'GET', headers: HEADERS
      })
      const quotes = data?.quotes ?? []
      const results = quotes
        .filter(r => r.symbol && ['EQUITY', 'ETF', 'INDEX', 'CRYPTOCURRENCY', 'CURRENCY', 'MUTUALFUND'].includes(r.quoteType))
        .map(r => {
          const isTW = r.symbol.endsWith('.TW') || r.symbol.endsWith('.TWO')
          const name = isTW
            ? (r.shortname || r.longname || r.symbol)
            : (r.longname || r.shortname || r.symbol)
          return { symbol: r.symbol, name, exchange: r.exchDisp || r.exchange || '', type: r.typeDisp || r.quoteType }
        })
        .slice(0, 7)
      if (results.length > 0) return results
    } catch {}

    // Final fallback: direct chart lookup for the query as-is (handles raw tickers like AAPL)
    try {
      const data = await httpsGet({
        hostname: 'query1.finance.yahoo.com',
        path: `/v8/finance/chart/${encodeURIComponent(q.toUpperCase())}?interval=1d&range=1d`,
        method: 'GET', headers: HEADERS
      })
      const meta = data?.chart?.result?.[0]?.meta
      if (meta?.regularMarketPrice != null) {
        const isTW = meta.symbol?.endsWith('.TW') || meta.symbol?.endsWith('.TWO')
        const name = isTW
          ? (meta.shortName || meta.longName || meta.symbol)
          : (meta.longName || meta.shortName || meta.symbol)
        return [{ symbol: meta.symbol || q.toUpperCase(), name, exchange: '', type: 'EQUITY' }]
      }
    } catch {}
    return []
  })
  ipcMain.handle('fetch-detail', async (_, symbol) => {
    try {
      const data = await httpsGet({
        hostname: 'query1.finance.yahoo.com',
        path: `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo&includePrePost=false`,
        method: 'GET', headers: HEADERS
      })
      const result = data?.chart?.result?.[0]
      if (!result) return null
      const meta = result.meta
      const closes = result.indicators?.quote?.[0]?.close ?? []
      const timestamps = result.timestamp ?? []
      return {
        open: meta.regularMarketOpen ?? null,
        previousClose: meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? null,
        dayHigh: meta.regularMarketDayHigh ?? null,
        dayLow: meta.regularMarketDayLow ?? null,
        volume: meta.regularMarketVolume ?? null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
        chartData: closes.map((c, i) => ({ t: timestamps[i], c })).filter(d => d.c != null)
      }
    } catch { return null }
  })
  ipcMain.handle('fetch-chart', async (_, symbol, range, interval) => {
    try {
      const data = await httpsGet({
        hostname: 'query1.finance.yahoo.com',
        path: `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`,
        method: 'GET', headers: HEADERS
      })
      const result = data?.chart?.result?.[0]
      if (!result) return null
      const q = result.indicators?.quote?.[0] ?? {}
      const timestamps = result.timestamp ?? []
      const opens  = q.open  ?? []
      const highs  = q.high  ?? []
      const lows   = q.low   ?? []
      const closes = q.close ?? []
      return timestamps.map((t, i) => ({ t, o: opens[i] ?? null, h: highs[i] ?? null, l: lows[i] ?? null, c: closes[i] ?? null }))
        .filter(d => d.c != null)
    } catch { return null }
  })

  ipcMain.handle('fetch-sentiment', async () => {
    let cryptoFG = null
    let stockFG = null
    try {
      const cfg = await httpsGet({
        hostname: 'api.alternative.me',
        path: '/fng/?limit=1',
        method: 'GET',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json' }
      })
      const d = cfg?.data?.[0]
      if (d) {
        const val = parseInt(d.value)
        const text = val < 25 ? '極度恐慌' : val < 45 ? '恐慌' : val < 55 ? '中性' : val < 75 ? '貪婪' : '極度貪婪'
        const state = val < 45 ? 'fear' : val < 55 ? 'neutral' : 'greed'
        cryptoFG = { val, state, text }
      }
    } catch {}
    try {
      const cnn = await httpsGet({
        hostname: 'production.dataviz.cnn.io',
        path: '/index/fearandgreed/graphdata',
        method: 'GET',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json', 'Referer': 'https://money.cnn.com/' }
      })
      const fg = cnn?.fear_and_greed
      if (fg?.score != null) {
        const val = Math.round(fg.score)
        const text = val < 25 ? '極度恐慌' : val < 45 ? '恐慌' : val < 55 ? '中性' : val < 75 ? '貪婪' : '極度貪婪'
        const state = val < 45 ? 'fear' : val < 55 ? 'neutral' : 'greed'
        stockFG = { val, state, text }
      }
    } catch {}
    return { cryptoFG, stockFG }
  })
  ipcMain.handle('open-external', (_, url) => shell.openExternal(url))

  ipcMain.handle('fetch-focus-board', async (_, category) => {
    try {
      const data = await httpsGet({
        hostname: 'api.cnyes.com',
        path: `/media/api/v1/newslist/category/${category}?limit=12&page=1`,
        method: 'GET',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json', 'Referer': 'https://www.cnyes.com/' }
      })
      const newsList = data?.items?.data ?? []

      // Collect unique stock codes and normalize to Yahoo Finance symbols
      const normalizeCode = c => /^\d/.test(c) ? c + '.TW' : c
      const allCodes = [...new Set(newsList.flatMap(n => (n.stock ?? []).slice(0, 3)))]

      const priceMap = {}
      if (allCodes.length > 0) {
        const items = allCodes.map(c => ({ symbol: normalizeCode(c), name: c, _base: c }))
        const results = await fetchBatch(items)
        results.forEach(r => {
          if (!r.error && r.price != null) priceMap[r._base] = r
        })
      }

      return newsList.map(n => ({
        id: n.newsId,
        title: n.title,
        publishAt: n.publishAt,
        coverUrl: n.coverSrc?.l?.src ?? n.coverSrc?.m?.src ?? n.coverSrc?.s?.src ?? null,
        url: `https://news.cnyes.com/news/id/${n.newsId}`,
        stocks: (n.stock ?? []).slice(0, 3).map(c => priceMap[c]).filter(Boolean)
      }))
    } catch { return [] }
  })

  ipcMain.handle('fetch-news', async (_, category) => {
    try {
      const data = await httpsGet({
        hostname: 'api.cnyes.com',
        path: `/media/api/v1/newslist/category/${category}?limit=20&page=1`,
        method: 'GET',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json', 'Referer': 'https://www.cnyes.com/' }
      })
      const list = data?.items?.data ?? []
      return list.map(n => ({
        id: n.newsId,
        title: n.title,
        summary: n.summary ?? '',
        publishAt: n.publishAt,
        coverUrl: n.coverSrc?.l?.src ?? n.coverSrc?.m?.src ?? n.coverSrc?.s?.src ?? null,
        url: `https://news.cnyes.com/news/id/${n.newsId}`,
        stocks: (n.stock ?? []).slice(0, 5),
      }))
    } catch { return [] }
  })

  ipcMain.handle('fetch-symbol-news', async (_, symbol) => {
    try {
      const data = await httpsGet({
        hostname: 'query1.finance.yahoo.com',
        path: `/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=5&quotesCount=0&lang=en-US`,
        method: 'GET',
        headers: HEADERS
      })
      const news = data?.news ?? []
      return news.map(n => {
        const resolutions = n.thumbnail?.resolutions ?? []
        const thumb = resolutions.find(r => r.tag === 'original') ?? resolutions[0] ?? null
        return {
          id: n.uuid,
          title: n.title,
          summary: n.summary ?? '',
          publisher: n.publisher ?? '',
          publishAt: n.providerPublishTime,
          url: n.link,
          coverUrl: thumb?.url ?? null,
        }
      })
    } catch { return [] }
  })

  ipcMain.handle('fetch-peers', async (_, symbol) => {
    try {
      const rec = await httpsGet({
        hostname: 'query1.finance.yahoo.com',
        path: `/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`,
        method: 'GET',
        headers: HEADERS
      })
      const peerSymbols = (rec?.finance?.result?.[0]?.recommendedSymbols ?? [])
        .slice(0, 5)
        .map(p => ({ symbol: p.symbol, name: p.symbol }))
      if (!peerSymbols.length) return []
      const quotes = await fetchBatch(peerSymbols)
      return quotes
        .filter(q => !q.error)
        .map(q => ({ symbol: q.symbol, name: q.name, price: q.price, changePercent: q.changePercent }))
    } catch { return [] }
  })

  ipcMain.handle('get-settings', () => readJson('settings.json', { refreshInterval: 5 * 60 * 1000 }))
  ipcMain.handle('save-settings', (_, s) => { writeJson('settings.json', s); return true })
  ipcMain.handle('toggle-fullscreen', () => {
    if (!mainWindow) return false
    const next = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(next)
    return next
  })

  // Pre-warm TW stock name cache in background
  getTWStocks().catch(() => {})

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
