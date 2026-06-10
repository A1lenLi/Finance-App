/**
 * patch_auto_updater.mjs
 * Replaces simple GitHub API version check with full electron-updater auto-update:
 *   - Background download when new version found
 *   - Push events to renderer: available / downloading (%) / ready
 *   - install-update IPC → quitAndInstall
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PATH = join(__dirname, 'src', 'main', 'index.js')
let src = readFileSync(PATH, 'utf8')

// ── 1. Add import ──────────────────────────────────────────────
const IMPORT_ANCHOR = `import { electronApp, optimizer, is } from '@electron-toolkit/utils'`
if (!src.includes(IMPORT_ANCHOR)) { console.error('Import anchor not found'); process.exit(1) }

if (!src.includes(`from 'electron-updater'`)) {
  src = src.replace(
    IMPORT_ANCHOR,
    IMPORT_ANCHOR + `\nimport { autoUpdater } from 'electron-updater'`
  )
  console.log('Added electron-updater import')
}

// ── 2. Replace old check-app-update block ──────────────────────
const OLD_BLOCK = `  ipcMain.handle('check-app-update', async () => {
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
  })`

const NEW_BLOCK = `  // ── Auto-updater (electron-updater + GitHub Releases) ──────────
  if (!is.dev) {
    autoUpdater.logger = null
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.setFeedURL({ provider: 'github', owner: 'A1lenLi', repo: 'Finance-App' })

    let _pendingVersion = ''
    const sendUpd = (state, extra = {}) =>
      mainWindow?.webContents.send('update-status', { state, ...extra })

    autoUpdater.on('update-available',  info => { _pendingVersion = info.version; sendUpd('available',   { version: info.version }) })
    autoUpdater.on('download-progress', p    => sendUpd('downloading', { version: _pendingVersion, percent: Math.round(p.percent) }))
    autoUpdater.on('update-downloaded', info => sendUpd('ready',       { version: info.version }))
    autoUpdater.on('error',             ()   => {})

    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000)
  }

  ipcMain.handle('install-update', () => { autoUpdater.quitAndInstall(true, true) })`

if (!src.includes(OLD_BLOCK)) {
  console.error('Old check-app-update block not found — already patched?')
  process.exit(1)
}

src = src.replace(OLD_BLOCK, NEW_BLOCK)
writeFileSync(PATH, src, 'utf8')
console.log('patch_auto_updater: electron-updater wired up in main/index.js')
