/**
 * patch_ai_prompt.mjs
 * Fixes AI echoing template placeholders instead of real content.
 * Moves field descriptions out of the JSON template so the model
 * can't confuse the format hint with the expected output.
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PATH = join(__dirname, 'src', 'main', 'index.js')
let src = readFileSync(PATH, 'utf8')

const OLD = `    const USER = [
      \`請用繁體中文深度分析以下新聞\${contentSource}，只回傳 JSON，不要有任何其他文字：\`,
      '',
      \`標題：\${title}\`,
      \`內容：\${articleText.slice(0, 1200) || '（無）'}\`,
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
    ].join('\\n')`

const NEW = `    const USER = [
      \`請根據以下新聞內容，用繁體中文進行深度財經分析。只回傳一個 JSON 物件，不要有任何其他文字。\`,
      '',
      \`標題：\${title}\`,
      \`內容（\${contentSource}）：\${articleText.slice(0, 1200) || '（無）'}\`,
      '',
      '各欄位說明（請根據新聞內容填入真實分析，不要複製此說明文字）：',
      '  core        ： 3-4句話，說明這件事的本質是什麼、對市場的直接意義',
      '  detail      ： 3-4句話，說明背後脈絡、影響機制、與更大趨勢的關聯',
      '  sentiment   ： 只能是「多頭」、「空頭」或「中性」其中一個',
      '  sentimentReason： 2句話說明情緒判斷理由，指出關鍵數據或觸媒',
      '  affected    ： 最多6項受影響標的，個股格式「名稱(代碼)」如「台積電(2330.TW)」，板塊直接寫',
      '  catalysts   ： 3項正向催化因素',
      '  risks       ： 3項主要風險',
      '  points      ： 5項投資人應關注的重點',
      '',
      '輸出 JSON（所有字串值必須是繁體中文單行，不得換行）：',
      '{',
      '  "core": "",',
      '  "detail": "",',
      '  "sentiment": "",',
      '  "sentimentReason": "",',
      '  "affected": [],',
      '  "catalysts": [],',
      '  "risks": [],',
      '  "points": []',
      '}',
    ].join('\\n')`

if (!src.includes(OLD)) {
  console.error('Target block not found — already patched or file changed')
  process.exit(1)
}

src = src.replace(OLD, NEW)
writeFileSync(PATH, src, 'utf8')
console.log('patch_ai_prompt: USER prompt updated — placeholders moved out of JSON template')
