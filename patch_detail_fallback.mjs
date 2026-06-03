import { readFileSync, writeFileSync } from 'fs'
const file = 'C:\\Users\\Allen Lee\\Desktop\\Finance App\\src\\main\\index.js'
let src = readFileSync(file, 'utf8')

src = src.replace(
  `      const result = data?.chart?.result?.[0]
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
      }`,
  `      const result = data?.chart?.result?.[0]
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
        open:            meta.regularMarketOpen          ?? lastOpen  ?? null,
        previousClose:   meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? lastClose ?? null,
        dayHigh:         meta.regularMarketDayHigh       ?? lastHigh  ?? null,
        dayLow:          meta.regularMarketDayLow        ?? lastLow   ?? null,
        volume:          meta.regularMarketVolume        ?? null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh          ?? null,
        fiftyTwoWeekLow:  meta.fiftyTwoWeekLow           ?? null,
        chartData: closes.map((c, i) => ({ t: timestamps[i], c })).filter(d => d.c != null)
      }`
)

writeFileSync(file, src, 'utf8')
console.log('✅ fetch-detail fallback applied')
