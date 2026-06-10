/**
 * patch_global_news.mjs
 * Adds cnyes us_stock source to fetch-news-multi handler
 * Covers Trump / tariff / Fed / geopolitical news affecting markets
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PATH = join(__dirname, 'src', 'main', 'index.js')
let src = readFileSync(PATH, 'utf8')

if (src.includes("category/us_stock")) {
  console.log('us_stock source already present — skipping')
  process.exit(0)
}

// Anchor: the end of the UDN block inside Promise.allSettled
const ANCHOR = `        source: '經濟日報', publisher: '經濟日報',
        }))),
    ])`

if (!src.includes(ANCHOR)) {
  console.error('Anchor not found — patch already applied or file changed')
  process.exit(1)
}

const NEW_SOURCE = `        source: '經濟日報', publisher: '經濟日報',
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
          url: \`https://news.cnyes.com/news/id/\${n.newsId}\`,
          source: '鉅亨網', publisher: '鉅亨網',
          stocks: n.stocks ?? [],
        }))),
    ])`

src = src.replace(ANCHOR, NEW_SOURCE)
writeFileSync(PATH, src, 'utf8')
console.log('patch_global_news: us_stock source added to fetch-news-multi')
