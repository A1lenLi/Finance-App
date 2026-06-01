import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  fetchMarketData: () => ipcRenderer.invoke('fetch-market-data'),
  getWatchlist: () => ipcRenderer.invoke('get-watchlist'),
  saveWatchlist: (list) => ipcRenderer.invoke('save-watchlist', list),
  fetchWatchlistData: () => ipcRenderer.invoke('fetch-watchlist-data'),
  lookupSymbol: (symbol) => ipcRenderer.invoke('lookup-symbol', symbol),
  fetchDetail: (symbol) => ipcRenderer.invoke('fetch-detail', symbol),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  fetchNews: (category) => ipcRenderer.invoke('fetch-news', category),
  fetchSymbolNews: (symbol) => ipcRenderer.invoke('fetch-symbol-news', symbol),
  fetchFocusBoard: (category) => ipcRenderer.invoke('fetch-focus-board', category),
  fetchSparklines: (symbols) => ipcRenderer.invoke('fetch-sparklines', symbols),
  fetchPeers: (symbol) => ipcRenderer.invoke('fetch-peers', symbol),
  fetchChart: (symbol, range, interval) => ipcRenderer.invoke('fetch-chart', symbol, range, interval),
  fetchSentiment: () => ipcRenderer.invoke('fetch-sentiment'),
  searchSymbol: (query) => ipcRenderer.invoke('search-symbol', query),
  analyzeNews: (news) => ipcRenderer.invoke('analyze-news', news),
  getGroups: () => ipcRenderer.invoke('get-groups'),
  saveGroups: (groups) => ipcRenderer.invoke('save-groups', groups),
  fetchEconomicCalendar: () => ipcRenderer.invoke('fetch-economic-calendar'),
  fetchNewsMulti: () => ipcRenderer.invoke('fetch-news-multi')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
