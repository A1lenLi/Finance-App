import { readFileSync, writeFileSync } from 'fs'
const file = 'C:\\Users\\Allen Lee\\Desktop\\Finance App\\src\\main\\index.js'
let src = readFileSync(file, 'utf8')

const HANDLER = `
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

`

const anchor = `  ipcMain.handle('fetch-market-adv-dec',`
const idx = src.indexOf(anchor)
if (idx === -1) { console.error('anchor not found'); process.exit(1) }
src = src.slice(0, idx) + HANDLER + src.slice(idx)
writeFileSync(file, src, 'utf8')
console.log('✅ fetch-etf-holdings handler added')
