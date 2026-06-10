/**
 * patch_updater.mjs
 * Adds check-app-update IPC handler to main/index.js
 * Uses GitHub Releases API to check for newer versions
 */
import { readFileSync, writeFileSync } from 'fs'


import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
const PATH = join(__dirname, 'src', 'main', 'index.js')
let src = readFileSync(PATH, 'utf8')

const ANCHOR = '  // Pre-warm TW stock name cache in background'
if (!src.includes(ANCHOR)) {
  console.error('Anchor not found — patch already applied or file changed')
  process.exit(1)
}

if (src.includes("'check-app-update'")) {
  console.log('check-app-update handler already present — skipping')
  process.exit(0)
}

const NEW_CODE = `  ipcMain.handle('check-app-update', async () => {
    try {
      const data = await httpsGet({
        hostname: 'api.github.com',
        path: '/repos/A1lenLi/Finance-App/releases/latest',
        method: 'GET',
        headers: { 'User-Agent': 'FinPulse-App', 'Accept': 'application/vnd.github.v3+json' }
      })
      const latest = (data?.tag_name || '').replace(/^v/, '')
      const current = app.getVersion()
      return { latest, current, hasUpdate: !!latest && latest !== current }
    } catch { return null }
  })

  `

src = src.replace(ANCHOR, NEW_CODE + ANCHOR)
writeFileSync(PATH, src, 'utf8')
console.log('patch_updater: check-app-update handler added')
