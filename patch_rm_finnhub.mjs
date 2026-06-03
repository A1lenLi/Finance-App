import { readFileSync, writeFileSync } from 'fs'
const file = 'C:\\Users\\Allen Lee\\Desktop\\Finance App\\src\\main\\index.js'
let src = readFileSync(file, 'utf8')

src = src.replace(
  `const key = (settings.finnhubKey || '').trim() || 'd8dv9apr01qhm4ahlou0d8dv9apr01qhm4ahloug'`,
  `const key = (settings.finnhubKey || '').trim()`
)

writeFileSync(file, src, 'utf8')
console.log('✅ Finnhub hardcoded key removed')
