import { readFileSync, writeFileSync } from 'fs'
const file = 'C:\\Users\\Allen Lee\\Desktop\\Finance App\\src\\main\\index.js'
let src = readFileSync(file, 'utf8')

const OLD = `      if (isTW) {
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
          .slice(0, 8)`

const NEW = `      if (isTW) {
        // Fetch 3 pages in parallel, filter by stock tag + Chinese name fallback
        const fetchPage = p => httpsGet({
          hostname: 'api.cnyes.com',
          path: \`/media/api/v1/newslist/category/tw_stock?limit=30&page=\${p}\`,
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
        }).slice(0, 8)`

const idx = src.indexOf(OLD)
if (idx === -1) { console.error('OLD block not found'); process.exit(1) }
src = src.slice(0, idx) + NEW + src.slice(idx + OLD.length)
writeFileSync(file, src, 'utf8')
console.log('✅ fetch-symbol-news: 3 pages + Chinese name fallback')
