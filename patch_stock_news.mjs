import { readFileSync, writeFileSync } from 'fs'
const file = 'C:\\Users\\Allen Lee\\Desktop\\Finance App\\src\\main\\index.js'
let src = readFileSync(file, 'utf8')

const OLD = `  ipcMain.handle('fetch-symbol-news', async (_, symbol) => {
    try {
      const data = await httpsGet({
        hostname: 'query1.finance.yahoo.com',
        path: \`/v1/finance/search?q=\${encodeURIComponent(symbol)}&newsCount=5&quotesCount=0&lang=en-US\`,
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
  })`

const NEW = `  ipcMain.handle('fetch-symbol-news', async (_, symbol) => {
    const isTW = symbol.endsWith('.TW') || symbol.endsWith('.TWO')
    const code  = symbol.replace(/\\.(TW|TWO)$/, '')
    try {
      if (isTW) {
        // Fetch 2 pages from cnyes and filter by stock code tag
        const fetchPage = p => httpsGet({
          hostname: 'api.cnyes.com',
          path: \`/media/api/v1/newslist/category/tw_stock?limit=30&page=\${p}\`,
          headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': 'https://news.cnyes.com/', 'Accept': 'application/json' }
        }).then(d => d?.items?.data ?? []).catch(() => [])
        const [p1, p2] = await Promise.all([fetchPage(1), fetchPage(2)])
        const all = [...p1, ...p2]
        const matched = all
          .filter(n => Array.isArray(n.stock) && n.stock.includes(code))
          .slice(0, 8)
        return matched.map(n => {
          const cover = n.coverSrc?.['800'] ?? n.coverSrc?.['400'] ?? null
          return {
            id: String(n.newsId),
            title: sanitizeText(n.title ?? ''),
            summary: sanitizeText(n.summary ?? ''),
            publisher: n.source ?? '鉅亨網',
            publishAt: n.publishAt ?? Math.floor(Date.now() / 1000),
            url: \`https://news.cnyes.com/news/id/\${n.newsId}\`,
            coverUrl: cover,
          }
        })
      }
      // US/other stocks: Yahoo Finance search
      const data = await httpsGet({
        hostname: 'query1.finance.yahoo.com',
        path: \`/v1/finance/search?q=\${encodeURIComponent(symbol)}&newsCount=5&quotesCount=0&lang=en-US\`,
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
  })`

if (!src.includes(OLD.trim())) {
  // Try a lighter match
  const idx = src.indexOf("ipcMain.handle('fetch-symbol-news'")
  if (idx === -1) { console.error('anchor not found'); process.exit(1) }
  const end = src.indexOf('\n  })', idx) + 4
  src = src.slice(0, idx) + NEW.trimStart() + src.slice(end)
} else {
  src = src.replace(OLD, NEW)
}

writeFileSync(file, src, 'utf8')
console.log('✅ fetch-symbol-news updated with cnyes TW stock filter')
