import { readFileSync, writeFileSync } from 'fs'
const file = 'C:\\Users\\Allen Lee\\Desktop\\Finance App\\src\\main\\index.js'
let src = readFileSync(file, 'utf8')

const HANDLER = `
  // ── TWSE advance/decline ─────────────────────────────────────────────
  let advDecCache = null
  let advDecCacheAt = 0
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

`

// Insert before the last ipcMain.handle or before a known anchor
const anchor = `  ipcMain.handle('fetch-news-multi',`
const idx = src.indexOf(anchor)
if (idx === -1) { console.error('anchor not found'); process.exit(1) }
src = src.slice(0, idx) + HANDLER + src.slice(idx)
writeFileSync(file, src, 'utf8')
console.log('✅ fetch-market-adv-dec handler added')
