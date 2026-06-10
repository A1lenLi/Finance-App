import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { request } from 'https'
import { deflateSync } from 'zlib'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'


// ── Default watchlist groups ──────────────────────────────────────────────────
const DEFAULT_GROUPS = [
  {
    id: 'etf', name: 'ETF精選', color: '#6366f1',
    symbols: [
      { symbol: '0050.TW', name: '元大台灣50' },
      { symbol: '0056.TW', name: '元大高益' },
      { symbol: '00878.TW', name: '國泰永續高益' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
      { symbol: 'QQQ', name: 'Invesco QQQ' },
      { symbol: 'VT', name: 'Vanguard Total World' },
      { symbol: 'ARKK', name: 'ARK Innovation ETF' }
    ]
  },
  {
    id: 'tech', name: '科技巨頭', color: '#0ea5e9',
    symbols: [
      { symbol: 'AAPL', name: 'Apple' },
      { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'META', name: 'Meta Platforms' },
      { symbol: 'AMZN', name: 'Amazon' },
      { symbol: 'TSLA', name: 'Tesla' },
      { symbol: '2330.TW', name: '台積電' }
    ]
  },
  {
    id: 'ai', name: 'AI概念', color: '#a855f7',
    symbols: [
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'AMD', name: 'AMD' },
      { symbol: 'INTC', name: 'Intel' },
      { symbol: 'SMCI', name: 'Super Micro Computer' },
      { symbol: '2303.TW', name: '聯電' },
      { symbol: '3034.TW', name: '光立碩' },
      { symbol: '6669.TW', name: '緯节科' }
    ]
  },
  {
    id: 'mfg', name: '生產製造', color: '#f59e0b',
    symbols: [
      { symbol: '2317.TW', name: '鸿海精密' },
      { symbol: '2382.TW', name: '廣達' },
      { symbol: '2308.TW', name: '台联電' },
      { symbol: '3711.TW', name: '日月光電' },
      { symbol: 'HON', name: 'Honeywell' },
      { symbol: 'CAT', name: 'Caterpillar' },
      { symbol: 'MMM', name: '3M' }
    ]
  }
]

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
    { symbol: 'EURTWD=X', name: 'EUR / TWD' },
    { symbol: 'JPYTWD=X', name: 'JPY / TWD' },
    { symbol: 'GBPTWD=X', name: 'GBP / TWD' },
    { symbol: 'CNYTWD=X', name: 'CNY / TWD' },
    { symbol: 'AUDTWD=X', name: 'AUD / TWD' },
    { symbol: 'HKDTWD=X', name: 'HKD / TWD' },
    { symbol: 'SGDTWD=X', name: 'SGD / TWD' }
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

function httpsGetText(options) {
  return new Promise((resolve, reject) => {
    const req = request(options, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
          resolve(Buffer.concat(chunks).toString('utf8'))
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function parseRSS(xml) {
  const items = []
  const re = new RegExp('<item[^>]*>([\\s\\S]*?)<\\/item>', 'g')
  let m
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1]
    const get = tag => {
      const r = raw.match(new RegExp('<' + tag + '(?:[^>]*)>([\\s\\S]*?)<\\/' + tag + '>', 'i'))
      return r ? r[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : ''
    }
    const lm = raw.match(/<link>\s*([^<]+)\s*<\/link>/) || raw.match(/<guid[^>]*>([^<]+)<\/guid>/)
    const pub = get('pubDate') || get('dc:date')
    items.push({
      title: get('title'),
      summary: get('description').slice(0, 300),
      url: lm ? lm[1].trim() : '',
      publishAt: (() => { const ts = pub ? Math.floor(new Date(pub).getTime() / 1000) : NaN; return isNaN(ts) ? Math.floor(Date.now() / 1000) : ts })(),
    })
  }
  return items
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

// ── Text sanitizer ────────────────────────────────────────────────────────
// Removes zero-width chars, BOM, lone surrogates, and non-BMP code points
// that common Windows CJK fonts can't render (shows as ██).
function sanitizeText(str) {
  if (!str) return str
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')    // control chars
    .replace(/[\uFEFF\u200B\u200C\u200D\u2028\u2029\u00A0]/g, '') // BOM + zero-width
    .replace(/\uFFFD|\uFFFE|\uFFFF/g, '')                      // replacement chars
    .replace(/[\uD800-\uDFFF]/g, '')                            // lone surrogates
    .replace(/[\u{10000}-\u{10FFFF}]/gu, '')                   // non-BMP (emoji etc)
    .replace(/\s{2,}/g, ' ')
    .trim()
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

// ── Article content fetcher ───────────────────────────────────────────────
function fetchArticleText(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const done = (text) => { clearTimeout(timer); resolve(text) }
    const timer = setTimeout(() => done(''), timeoutMs)

    try {
      const { hostname, pathname, search } = new URL(url)
      const isHttps = url.startsWith('https')
      const mod = isHttps ? require('https') : require('http')
      const req = mod.get({
        hostname, path: pathname + search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-TW,zh;q=0.9',
        },
      }, (res) => {
        // Follow one redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          req.destroy()
          return fetchArticleText(res.headers.location, timeoutMs).then(done)
        }
        let html = ''
        res.setEncoding('utf8')
        res.on('data', c => { html += c; if (html.length > 200000) req.destroy() })
        res.on('end', () => {
          // Extract main body text
          let text = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<header[\s\S]*?<\/header>/gi, '')
            .replace(/<footer[\s\S]*?<\/footer>/gi, '')
            .replace(/<nav[\s\S]*?<\/nav>/gi, '')
            // Pull out <article> or main content blocks if present
            .replace(/.*?(<article[\s\S]*?<\/article>|<main[\s\S]*?<\/main>|<div[^>]*class="[^"]*(?:content|article|body|news)[^"]*"[\s\S]*?<\/div>).*/si, '$1')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&#\d+;/g, ' ').replace(/&[a-z]+;/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .slice(0, 4000)
          done(sanitizeText(text))
        })
        res.on('error', () => done(''))
      })
      req.on('error', () => done(''))
    } catch { done('') }
  })
}

// ── AI helpers ────────────────────────────────────────────────────────────
// OpenAI-compatible POST (Groq / any compatible endpoint)
function callOpenAICompat(hostname, path, apiKey, model, messages, maxTokens = 1500) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, max_tokens: maxTokens, messages })
    const opts = {
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${apiKey}`,
      },
    }
    const req = request(opts, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw)
          if (parsed.error) reject(new Error(parsed.error.message || JSON.stringify(parsed.error)))
          else resolve(parsed.choices?.[0]?.message?.content || '')
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function callGroq(apiKey, messages) {
  // qwen-qwq-32b: Qwen reasoning model, far better Traditional Chinese quality.
  // Uses 6144 max_tokens because QwQ emits a <think>...</think> chain before the JSON.
  // Free tier limit: 6000 tokens/req (input + output combined).
  // Input ~2000 tokens (prompt + 1200-char article) + 1500 output = ~3500, safe margin.
  return callOpenAICompat('api.groq.com', '/openai/v1/chat/completions', apiKey, 'qwen/qwen3-32b', messages, 1500)
}

function callClaude(apiKey, userPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const opts = {
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    }
    const req = request(opts, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw)
          if (parsed.error) reject(new Error(parsed.error.message))
          else resolve(parsed.content?.[0]?.text || '')
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
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
// Disable Chromium's GPU shader disk-cache to prevent cache_util_win.cc /
// gpu_disk_cache.cc ACCESS_DENIED (0x5) spam on Windows.
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

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
  ipcMain.handle('get-groups', () => {
    const saved = readJson('groups.json', null)
    if (saved) return saved
    // First launch: seed watchlist with all default symbols
    const wl = readJson('watchlist.json', [])
    const existing = new Set(wl.map(x => x.symbol))
    const toAdd = []
    for (const g of DEFAULT_GROUPS) {
      for (const s of g.symbols) {
        if (!existing.has(s.symbol)) { existing.add(s.symbol); toAdd.push(s) }
      }
    }
    if (toAdd.length) writeJson('watchlist.json', [...wl, ...toAdd])
    writeJson('groups.json', DEFAULT_GROUPS)
    return DEFAULT_GROUPS
  })
  ipcMain.handle('save-groups', (_, groups) => { writeJson('groups.json', groups); return true })

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
      const q = result.indicators?.quote?.[0] ?? {}
      const closes = q.close ?? []
      const opens = q.open ?? []
      const highs = q.high ?? []
      const lows = q.low ?? []
      const timestamps = result.timestamp ?? []
      // Fallback to last bar values when real-time fields are unavailable (pre/post market)
      const lastOpen  = opens.filter(Boolean).at(-1)  ?? null
      const lastHigh  = highs.filter(Boolean).at(-1)  ?? null
      const lastLow   = lows.filter(Boolean).at(-1)   ?? null
      const lastClose = closes.filter(Boolean).at(-1) ?? null
      return {
        currentPrice:    meta.regularMarketPrice         ?? lastClose ?? null,
        currentChg:      meta.regularMarketChangePercent ?? null,
        resolvedName:    (() => { const sym2 = meta.symbol || symbol; const isTW2 = sym2.endsWith('.TW') || sym2.endsWith('.TWO'); return isTW2 ? (twName(sym2) ?? meta.shortName ?? meta.longName ?? null) : (meta.shortName ?? meta.longName ?? null) })(),
        open:            meta.regularMarketOpen          ?? lastOpen  ?? null,
        previousClose:   meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? lastClose ?? null,
        dayHigh:         meta.regularMarketDayHigh       ?? lastHigh  ?? null,
        dayLow:          meta.regularMarketDayLow        ?? lastLow   ?? null,
        volume:          meta.regularMarketVolume        ?? null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh          ?? null,
        fiftyTwoWeekLow:  meta.fiftyTwoWeekLow           ?? null,
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

  ipcMain.handle('fetch-economic-calendar', async () => {
    const settings = readJson('settings.json', {})
    const key = (settings.finnhubKey || '').trim()
    const WD = ['日','一','二','三','四','五','六']
    const IMP = { high: 3, medium: 2, low: 1 }
    const EVT_ZH = {
      'Non-Farm Payrolls': '非農就業人數 (NFP)',
      'Unemployment Rate': '失業率',
      'CPI': 'CPI 消費者物價指數',
      'Core CPI': '核心 CPI',
      'PPI': 'PPI 生產者物價指數',
      'Core PPI': '核心 PPI',
      'PCE': 'PCE 個人消費支出物價',
      'Core PCE': '核心 PCE',
      'GDP': 'GDP 國內生產毛額',
      'Initial Jobless Claims': '初領失業金人數',
      'Retail Sales': '零售銷售',
      'Federal Reserve Interest Rate Decision': 'FOMC 利率決議',
      'FOMC Meeting': 'FOMC 利率決議',
      'ISM Manufacturing PMI': 'ISM 製造業 PMI',
      'ISM Services PMI': 'ISM 服務業 PMI',
      'S&P Global Manufacturing PMI': 'PMI 製造業初值',
      'S&P Global Composite PMI': 'PMI 綜合初值',
      'Housing Starts': '新屋開工',
      'Existing Home Sales': '成屋銷售',
      'Consumer Confidence': '消費者信心指數',
      'Trade Balance': '貿易帳',
      'Industrial Production': '工業生產',
      'JOLTS Job Openings': 'JOLTS 職缺數',
      'ADP Employment Change': 'ADP 就業人數',
      'Fed Chair Powell Speaks': 'Fed 主席 Powell 演講',
    }
    const EVT_TIME = {
      'Non-Farm Payrolls': '20:30',
      'Unemployment Rate': '20:30',
      'CPI': '20:30',
      'Core CPI': '20:30',
      'PPI': '20:30',
      'Core PPI': '20:30',
      'PCE': '20:30',
      'Core PCE': '20:30',
      'Initial Jobless Claims': '20:30',
      'Retail Sales': '20:30',
      'Federal Reserve Interest Rate Decision': '02:00',
      'FOMC Meeting': '02:00',
      'Housing Starts': '20:30',
      'Existing Home Sales': '22:00',
      'Consumer Confidence': '22:00',
      'Trade Balance': '20:30',
      'Industrial Production': '21:15',
      'JOLTS Job Openings': '22:00',
      'ADP Employment Change': '20:15',
      'GDP': '20:30',
      'ISM Manufacturing PMI': '22:00',
      'ISM Services PMI': '22:00',
    }
    try {
      const from = new Date()
      const to = new Date(); to.setDate(to.getDate() + 21)
      const pad = n => String(n).padStart(2, '0')
      const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
      const data = await httpsGet({
        hostname: 'finnhub.io',
        path: `/api/v1/calendar/economic?from=${fmtDate(from)}&to=${fmtDate(to)}&token=${key}`,
        method: 'GET',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json' }
      })
      const events = (data?.economicCalendar ?? [])
        .filter(e => e.country === 'US' && e.impact === 'high' && e.time)
        .map(e => {
          const dateStr = e.time ? String(e.time).slice(0, 10) : null
          if (!dateStr) return null
          const d = new Date(dateStr + 'T12:00:00')
          if (isNaN(d.getTime())) return null
          const nameZh = Object.entries(EVT_ZH).find(([en]) => e.event?.includes(en))?.[1] || (e.event || '未知事件')
          const time = Object.entries(EVT_TIME).find(([en]) => e.event?.includes(en))?.[1] || '—'
          const imp = IMP[e.impact] ?? 1
          const fmtD = `${pad(d.getMonth()+1)}.${pad(d.getDate())}`
          return { date: fmtD, day: WD[d.getDay()], time, region: 'US', evt: nameZh, imp, prev: e.prev ?? '—', est: e.estimate ?? '—' }
        })
      const valid = events.filter(Boolean)
      return valid.length > 0 ? valid : null
    } catch { return null }
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


  // ── TWSE advance/decline ─────────────────────────────────────────────
  let advDecCache = null
  let advDecCacheAt = 0

  // ── Yahoo Finance crumb ──────────────────────────────────────────────────
  let _yfCookie = '', _yfCrumb = '', _yfCrumbAt = 0
  function rawGet(opts) {
    return new Promise((res, rej) => {
      const req = request(opts, r => {
        const chunks = []
        r.on('data', c => chunks.push(c))
        r.on('end', () => res({ status: r.statusCode, headers: r.headers, body: Buffer.concat(chunks).toString() }))
      })
      req.on('error', rej); req.end()
    })
  }
  async function getYfCrumb() {
    if (_yfCrumb && Date.now() - _yfCrumbAt < 30 * 60 * 1000) return { cookie: _yfCookie, crumb: _yfCrumb }
    const r1 = await rawGet({ hostname: 'fc.yahoo.com', path: '/', headers: { 'User-Agent': HEADERS['User-Agent'] } })
    _yfCookie = (r1.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ')
    const r2 = await rawGet({ hostname: 'query1.finance.yahoo.com', path: '/v1/test/getcrumb', headers: { 'User-Agent': HEADERS['User-Agent'], Cookie: _yfCookie } })
    _yfCrumb = r2.body.trim()
    _yfCrumbAt = Date.now()
    return { cookie: _yfCookie, crumb: _yfCrumb }
  }

  // ── ETF holdings ─────────────────────────────────────────────────────────
  ipcMain.handle('fetch-etf-holdings', async (_, symbol) => {
    try {
      const { cookie, crumb } = await getYfCrumb()
      const r = await rawGet({
        hostname: 'query1.finance.yahoo.com',
        path: '/v10/finance/quoteSummary/' + encodeURIComponent(symbol) + '?modules=topHoldings&crumb=' + encodeURIComponent(crumb),
        headers: { 'User-Agent': HEADERS['User-Agent'], Cookie: cookie, Accept: 'application/json' }
      })
      if (r.status !== 200) return null
      const data = JSON.parse(r.body)
      const h = data?.quoteSummary?.result?.[0]?.topHoldings
      if (!h) return null
      return {
        holdings: (h.holdings || []).map(x => ({
          symbol: x.symbol || '',
          name: x.holdingName || '',
          pct: x.holdingPercent?.raw ?? 0,
          pctFmt: x.holdingPercent?.fmt ?? '--',
        })),
        stockPosition: h.stockPosition?.fmt ?? null,
        bondPosition: h.bondPosition?.fmt ?? null,
      }
    } catch (e) {
      console.error('fetch-etf-holdings error:', e.message)
      return null
    }
  })

  ipcMain.handle('fetch-market-adv-dec', async () => {
    if (advDecCache && Date.now() - advDecCacheAt < 5 * 60 * 1000) return advDecCache
    try {
      const raw = await httpsGetText('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      })
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr) || arr.length === 0) return null
      let adv = 0, dec = 0, unch = 0
      for (const r of arr) {
        const c = parseFloat(r.Change)
        if (isNaN(c)) continue
        if (c > 0) adv++; else if (c < 0) dec++; else unch++
      }
      const result = { adv, dec, unch, total: arr.length, source: 'twse', date: arr[0]?.Date || '' }
      advDecCache = result
      advDecCacheAt = Date.now()
      return result
    } catch (e) {
      console.error('fetch-market-adv-dec error:', e.message)
      return null
    }
  })

  ipcMain.handle('fetch-news-multi', async () => {
    const MIN_SUMMARY = 60
    const results = await Promise.allSettled([
      httpsGet({
        hostname: 'api.cnyes.com',
        path: '/media/api/v1/newslist/category/tw_stock?limit=40&page=1',
        method: 'GET',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json', 'Referer': 'https://www.cnyes.com/' }
      }).then(data => (data?.items?.data ?? [])
        .filter(n => (n.summary ?? '').length >= MIN_SUMMARY)
        .slice(0, 12)
        .map(n => ({
          id: String(n.newsId),
          title: sanitizeText(n.title),
          summary: sanitizeText(n.summary ?? ''),
          publishAt: n.publishAt,
          coverUrl: n.coverSrc?.l?.src ?? n.coverSrc?.m?.src ?? null,
          url: `https://news.cnyes.com/news/id/${n.newsId}`,
          source: '鉅亨網', publisher: '鉅亨網',
        }))),

      httpsGetText({
        hostname: 'money.udn.com',
        path: '/rssfeed/news/1001/5607/index.xml',
        method: 'GET',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/rss+xml' }
      }).then(xml => parseRSS(xml)
        .filter(n => n.title && n.title.length >= 12)
        .slice(0, 8)
        .map((n, i) => ({
          id: `udn_${n.publishAt}_${i}`,
          title: sanitizeText(n.title),
          summary: sanitizeText(n.summary),
          publishAt: n.publishAt,
          coverUrl: null,
          url: n.url,
          source: '經濟日報', publisher: '經濟日報',
        }))),

      // US macro / geopolitics news (Trump, tariffs, Fed, wars, etc.)
      httpsGet({
        hostname: 'api.cnyes.com',
        path: '/media/api/v1/newslist/category/us_stock?limit=40&page=1',
        method: 'GET',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json', 'Referer': 'https://www.cnyes.com/' }
      }).then(data => (data?.items?.data ?? [])
        .filter(n => (n.summary ?? '').length >= MIN_SUMMARY)
        .slice(0, 12)
        .map(n => ({
          id: String(n.newsId),
          title: sanitizeText(n.title),
          summary: sanitizeText(n.summary ?? ''),
          publishAt: n.publishAt,
          coverUrl: n.coverSrc?.l?.src ?? n.coverSrc?.m?.src ?? null,
          url: `https://news.cnyes.com/news/id/${n.newsId}`,
          source: '鉅亨網', publisher: '鉅亨網',
          stocks: n.stocks ?? [],
        }))),
    ])

    const seen = new Set()
    const withImg = []
    const noImg = []
    results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(n => {
        if (!n.title || n.title.length < 8 || seen.has(n.title)) return false
        seen.add(n.title)
        return true
      })
      .sort((a, b) => b.publishAt - a.publishAt)
      .slice(0, 20)
      .forEach(n => (n.coverUrl ? withImg : noImg).push(n))

    return [...withImg, ...noImg]
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
        title: sanitizeText(n.title),
        summary: sanitizeText(n.summary ?? ''),
        publishAt: n.publishAt,
        coverUrl: n.coverSrc?.l?.src ?? n.coverSrc?.m?.src ?? n.coverSrc?.s?.src ?? null,
        url: `https://news.cnyes.com/news/id/${n.newsId}`,
        stocks: (n.stock ?? []).slice(0, 5),
      }))
    } catch { return [] }
  })

  ipcMain.handle('fetch-symbol-news', async (_, symbol) => {
    const isTW = symbol.endsWith('.TW') || symbol.endsWith('.TWO')
    const code  = symbol.replace(/\.(TW|TWO)$/, '')
    try {
      if (isTW) {
        // Fetch 3 pages in parallel, filter by stock tag + Chinese name fallback
        const fetchPage = p => httpsGet({
          hostname: 'api.cnyes.com',
          path: `/media/api/v1/newslist/category/tw_stock?limit=30&page=${p}`,
          headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': 'https://news.cnyes.com/', 'Accept': 'application/json' }
        }).then(d => d?.items?.data ?? []).catch(() => [])
        const pages = await Promise.all([fetchPage(1), fetchPage(2), fetchPage(3)])
        const all = pages.flat()
        const zhName = twName(symbol) ?? ''
        const seen = new Set()
        const matched = all.filter(n => {
          const byTag  = Array.isArray(n.stock) && n.stock.includes(code)
          const byName = zhName && (n.title ?? '').includes(zhName)
          if (!byTag && !byName) return false
          if (seen.has(n.newsId)) return false
          seen.add(n.newsId); return true
        }).slice(0, 8)
        return matched.map(n => {
          const cover = n.coverSrc?.['800'] ?? n.coverSrc?.['400'] ?? null
          return {
            id: String(n.newsId),
            title: sanitizeText(n.title ?? ''),
            summary: sanitizeText(n.summary ?? ''),
            publisher: n.source ?? '鉅亨網',
            publishAt: n.publishAt ?? Math.floor(Date.now() / 1000),
            url: `https://news.cnyes.com/news/id/${n.newsId}`,
            coverUrl: cover,
          }
        })
      }
      // US/other stocks: Yahoo Finance search
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
          title: sanitizeText(n.title),
          summary: sanitizeText(n.summary ?? ''),
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

  ipcMain.handle('analyze-news', async (_, { title, summary, url }) => {
    const clean = s => (s || '').replace(/\s/g, '')
    const settings = readJson('settings.json', {})
    const groqKey   = clean(settings.groqKey      || process.env.GROQ_API_KEY      || '')
    const claudeKey = clean(settings.anthropicKey  || process.env.ANTHROPIC_API_KEY || '')
    if (!groqKey && !claudeKey) return { error: 'no_key' }

    // Fetch full article text when available
    let articleText = (summary || '').trim()
    if (url) {
      const fetched = await fetchArticleText(url)
      if (fetched.length > articleText.length + 100) articleText = fetched
    }
    const contentSource = articleText.length > (summary || '').length + 100 ? '全文' : '摘要'

    const SYSTEM = [
      '你是專業財經分析師。無論輸入文章是什麼語言，你的所有回應都必須使用繁體中文。',
      '規則：',
      '1. 只輸出一個 JSON 物件，絕對不加任何說明、前言、標題或 markdown。',
      '2. JSON 所有字串值必須是繁體中文（公司名稱可保留英文縮寫，如 NVDA、TSMC）。',
      '3. 所有字串值必須在同一行，不可在字串內插入換行符號。',
      '4. 不使用 em-dash、彎引號、星號等特殊符號，改用普通中文標點。',
    ].join('\n')

    const USER = [
      `請用繁體中文深度分析以下新聞${contentSource}，只回傳 JSON，不要有任何其他文字：`,
      '',
      `標題：${title}`,
      `內容：${articleText.slice(0, 1200) || '（無）'}`,
      '',
      '輸出格式（所有值必須是繁體中文單行字串，不得有換行）：',
      '{',
      '  "core": "核心摘要：3-4句完整描述事件本質與市場意義",',
      '  "detail": "深度解讀：3-4句說明背景脈絡、影響機制、與更大趨勢的關聯",',
      '  "sentiment": "多頭 或 空頭 或 中性",',
      '  "sentimentReason": "情緒判斷理由：2句話說明為何這樣判斷，並指出關鍵數據或觸媒",',
      '  "affected": ["個股附代碼如輝達(NVDA)或台積電(2330.TW)，板塊直接寫，最多6項"],',
      '  "catalysts": ["正向催化因素1", "因素2", "因素3"],',
      '  "risks": ["主要風險1", "風險2", "風險3"],',
      '  "points": ["投資要點1", "要點2", "要點3", "要點4", "要點5"]',
      '}',
    ].join('\n')

    function repairJSON(s) {
      s = s.replace(/,\s*$/, '').replace(/"[^"]*$/, '')
      let braces = 0, brackets = 0, inStr = false, esc = false
      for (const c of s) {
        if (esc) { esc = false; continue }
        if (c === '\\' && inStr) { esc = true; continue }
        if (c === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (c === '{') braces++; else if (c === '}') braces--
        if (c === '[') brackets++; else if (c === ']') brackets--
      }
      while (brackets > 0) { s += ']'; brackets-- }
      while (braces  > 0)  { s += '}'; braces-- }
      return s
    }

    function parseAI(text) {
      // Strip QwQ / DeepSeek reasoning chain before JSON extraction
      const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
      const target = stripped || text

      // Normalise common LLM punctuation using Unicode escapes to avoid source encoding issues
      const normalised = target
        .replace(/\u201C|\u201D/g, '"')
        .replace(/\u2018|\u2019/g, "'")
        .replace(/\u2014|\u2013/g, '-')

      const full = normalised.match(/\{[\s\S]*\}/)
      const src  = full ? full[0] : (normalised.match(/\{[\s\S]*/) || [''])[0]
      try { return JSON.parse(src) } catch {}
      const s2 = src.replace(/"((?:[^"\\]|\\.)*)"/g, (_, i) =>
        '"' + i.replace(/[\n\r\t]/g, ' ').replace(/[\x00-\x1F\x7F]/g, '') + '"')
      try { return JSON.parse(s2) } catch {}
      try { return JSON.parse(repairJSON(s2)) } catch {}
      return null
    }

    // Clean each string value — allowlist keeps valid Chinese financial chars
    function cleanResult(data) {
      if (!data) return data
      const KEEP = /[\u0020-\u007E\u00B0-\u00FF\u2010-\u2027\u3000-\u303F\u3040-\u30FF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/
      const cs = s => {
        if (typeof s !== 'string') return s
        const filtered = [...s].filter(ch => KEEP.test(ch)).join('')
        return filtered.replace(/\s{2,}/g, ' ').trim()
      }
      const ca = arr => Array.isArray(arr) ? arr.map(cs).filter(Boolean) : []
      return {
        core:            cs(data.core),
        detail:          cs(data.detail),
        sentiment:       cs(data.sentiment),
        sentimentReason: cs(data.sentimentReason),
        affected:        ca(data.affected),
        catalysts:       ca(data.catalysts),
        risks:           ca(data.risks),
        points:          ca(data.points),
      }
    }

    try {
      let text
      if (groqKey) {
        text = await callGroq(groqKey, [
          { role: 'system', content: SYSTEM },
          { role: 'user',   content: USER   },
        ])
      } else {
        text = await callClaude(claudeKey, SYSTEM + '\n\n' + USER)
      }
      const raw = parseAI(text)
      if (!raw) return { error: 'parse', raw: text }
      return { ok: true, data: cleanResult(raw), provider: groqKey ? 'groq' : 'claude', source: contentSource }
    } catch (e) {
      return { error: 'api', message: e.message }
    }
  })
    ipcMain.handle('toggle-fullscreen', () => {
    if (!mainWindow) return false
    const next = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(next)
    return next
  })

  ipcMain.handle('check-app-update', async () => {
    try {
      const data = await httpsGet({
        hostname: 'api.github.com',
        path: '/repos/A1lenLi/Finance-App/releases/latest',
        method: 'GET',
        headers: { 'User-Agent': 'FinPulse-App', 'Accept': 'application/vnd.github.v3+json' }
      })
      const latest = (data?.tag_name || '').replace(/^v/, '')
      const current = app.getVersion()
      return { latest, current, hasUpdate: !!latest && latest !== current }
    } catch { return null }
  })

    // Pre-warm TW stock name cache in background
  getTWStocks().catch(() => {})


  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
