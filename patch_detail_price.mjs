import { readFileSync, writeFileSync } from 'fs'
const file = 'C:\\Users\\Allen Lee\\Desktop\\Finance App\\src\\main\\index.js'
let src = readFileSync(file, 'utf8')

src = src.replace(
  `      return {
        open:            meta.regularMarketOpen          ?? lastOpen  ?? null,
        previousClose:   meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? lastClose ?? null,
        dayHigh:         meta.regularMarketDayHigh       ?? lastHigh  ?? null,
        dayLow:          meta.regularMarketDayLow        ?? lastLow   ?? null,
        volume:          meta.regularMarketVolume        ?? null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh          ?? null,
        fiftyTwoWeekLow:  meta.fiftyTwoWeekLow           ?? null,
        chartData: closes.map((c, i) => ({ t: timestamps[i], c })).filter(d => d.c != null)
      }`,
  `      return {
        currentPrice:    meta.regularMarketPrice         ?? lastClose ?? null,
        currentChg:      meta.regularMarketChangePercent ?? null,
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
console.log('✅ fetchDetail now returns currentPrice + currentChg')
