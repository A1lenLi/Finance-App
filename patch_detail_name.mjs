import { readFileSync, writeFileSync } from 'fs'
const file = 'C:\\Users\\Allen Lee\\Desktop\\Finance App\\src\\main\\index.js'
let src = readFileSync(file, 'utf8')

// Add resolvedName to fetchDetail return value
src = src.replace(
  `        currentPrice:    meta.regularMarketPrice         ?? lastClose ?? null,
        currentChg:      meta.regularMarketChangePercent ?? null,`,
  `        currentPrice:    meta.regularMarketPrice         ?? lastClose ?? null,
        currentChg:      meta.regularMarketChangePercent ?? null,
        resolvedName:    (() => { const sym2 = meta.symbol || symbol; const isTW2 = sym2.endsWith('.TW') || sym2.endsWith('.TWO'); return isTW2 ? (twName(sym2) ?? meta.shortName ?? meta.longName ?? null) : (meta.shortName ?? meta.longName ?? null) })(),`
)

writeFileSync(file, src, 'utf8')
console.log('✅ fetchDetail now returns resolvedName')
