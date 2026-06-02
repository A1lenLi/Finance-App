import { useState, useEffect, useContext, useMemo } from 'react'
import { useConv, useData, GTerm, GlossaryCtx, Sparkline, symbolSeed } from './Finance'
import { MiniLearnCard, CARDS as LEARN_CARDS } from './Learn'
import { NEWS_LEARN_MAP } from './SymbolPage'

export function ModalShell({ children, onClose, width = 640, kicker, title, subtitle }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-card" style={{ width }} onClick={e => e.stopPropagation()}>
        <button className="overlay-x" onClick={onClose} aria-label="關閉">×</button>
        {(kicker || title) && <div className="overlay-head">{kicker && <div className="overlay-kicker">{kicker}</div>}{title && <h2 className="overlay-h">{title}</h2>}{subtitle && <div className="overlay-sub">{subtitle}</div>}</div>}
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  )
}

function SetRow({ label, hint, children }) {
  return <div className="set-row"><div className="set-row-l"><div className="set-row-label">{label}</div>{hint && <div className="set-row-hint">{hint}</div>}</div><div className="set-row-r">{children}</div></div>
}
function SetSeg({ value, options, onChange }) {
  return <div className="set-seg" role="tablist">{options.map(o => <button key={o.value} role="tab" aria-selected={value === o.value} className={`set-seg-btn ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>
}
function SetSwatches({ value, options, onChange }) {
  return <div className="set-sw-list">{options.map(o => <button key={o.value} className={`set-sw ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)} title={o.label}><span className="set-sw-dot" style={{ background:o.color }}/><span className="set-sw-name">{o.label}</span></button>)}</div>
}
function SetSwitch({ value, onChange }) {
  return <button role="switch" aria-checked={value} className={`set-switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)}><span className="set-switch-thumb"/></button>
}

function ApiKeyField({ settingKey, placeholder, consoleUrl, label }) {
  const [key, setKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    window.api.getSettings().then(s => setHasKey(!!s?.[settingKey]))
  }, [settingKey])

  const save = async () => {
    if (!key.trim()) return
    setStatus('saving')
    const s = await window.api.getSettings() || {}
    await window.api.saveSettings({ ...s, [settingKey]: key.replace(/\s/g, '') })
    setHasKey(true); setKey(''); setStatus('ok')
    setTimeout(() => setStatus(null), 2000)
  }
  const clear = async () => {
    const s = await window.api.getSettings() || {}
    const next = { ...s }; delete next[settingKey]
    await window.api.saveSettings(next)
    setHasKey(false)
  }

  return (
    <div className="set-apikey">
      {hasKey && (
        <div className="set-apikey-has">
          <span>✓ {label} 金鑰已設定</span>
          <button className="set-apikey-clr" onClick={clear}>清除</button>
        </div>
      )}
      <div className="set-apikey-row">
        <input type="password" className="set-input" value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder={hasKey ? '輸入新金鑰以更新…' : placeholder}/>
        <button className="primary-btn set-apikey-btn" onClick={save}
          disabled={!key.trim() || status === 'saving'}>
          {status === 'ok' ? '已儲存 ✓' : status === 'saving' ? '…' : '儲存'}
        </button>
      </div>
      <p className="set-hint" style={{ marginTop:5 }}>
        金鑰僅儲存於本機裝置。
        <button className="set-link" onClick={() => window.api.openExternal(consoleUrl)}>
          取得免費金鑰 →
        </button>
      </p>
    </div>
  )
}

export function SettingsModal({ t, setTweak, onClose, onReset, themes }) {
  return (
    <ModalShell onClose={onClose} width={620} kicker="PREFERENCES" title="設定" subtitle="個人化你的儀表板顯示與互動偏好。所有變更即時生效並自動保存。">
      <div className="set-list">
        <div className="set-sect">
          <div className="set-sect-h"><span className="set-sect-num">01</span><span className="set-sect-name">顯示偏好</span></div>
          <SetRow label="漲跌色慣例" hint="台股習慣紅漲綠跌；歐美習慣綠漲紅跌。">
            <SetSeg value={t.convention} onChange={v => setTweak('convention', v)} options={[{ value:'red_up', label:'紅漲綠跌' }, { value:'green_up', label:'綠漲紅跌' }]}/>
          </SetRow>
          <SetRow label="主題色" hint="影響強調按鈕、連結與圖表筆觸的主要色相。">
            <SetSwatches value={t.theme} onChange={v => setTweak('theme', v)} options={[{ value:'blue', label:'海軍藍', color:themes.blue.accent }, { value:'teal', label:'青藍', color:themes.teal.accent }, { value:'amber', label:'琥珀', color:themes.amber.accent }]}/>
          </SetRow>
        </div>
        <div className="set-sect">
          <div className="set-sect-h"><span className="set-sect-num">02</span><span className="set-sect-name">版面密度</span></div>
          <SetRow label="資訊密度" hint="調整列高、間距與基礎字級。">
            <SetSeg value={t.density} onChange={v => setTweak('density', v)} options={[{ value:'compact', label:'密集' }, { value:'regular', label:'標準' }, { value:'comfy', label:'舒適' }]}/>
          </SetRow>
          <SetRow label="圖表樣式" hint="詳情頁的預設圖表呈現方式。">
            <SetSeg value={t.chartType} onChange={v => setTweak('chartType', v)} options={[{ value:'line', label:'折線' }, { value:'area', label:'面積' }, { value:'candle', label:'蠟燭' }]}/>
          </SetRow>
        </div>
        <div className="set-sect">
          <div className="set-sect-h"><span className="set-sect-num">03</span><span className="set-sect-name">介面元件</span></div>
          <SetRow label="顯示左側導覽" hint="關閉後可獲得更大主視窗。"><SetSwitch value={t.leftNav} onChange={v => setTweak('leftNav', v)}/></SetRow>
          <SetRow label="顯示自選清單側欄" hint="右側自選即時報價欄。"><SetSwitch value={t.sidebar} onChange={v => setTweak('sidebar', v)}/></SetRow>
        </div>
        <div className="set-sect">
          <div className="set-sect-h"><span className="set-sect-num">04</span><span className="set-sect-name">AI 功能</span></div>
          <div className="set-ai-hint">設定任一 API 金鑰即可啟用新聞 AI 解析。優先使用 Groq（免費）。</div>
          <SetRow label="Groq" hint="免費額度，使用 qwen3-32b 模型，速度極快。">
            <ApiKeyField settingKey="groqKey" label="Groq"
              placeholder="gsk_…"
              consoleUrl="https://console.groq.com/keys"/>
          </SetRow>
          <SetRow label="Anthropic" hint="使用 Claude Haiku，每次約 $0.001 USD。">
            <ApiKeyField settingKey="anthropicKey" label="Anthropic"
              placeholder="sk-ant-api03-…"
              consoleUrl="https://console.anthropic.com/keys"/>
          </SetRow>
        </div>
      </div>
      <div className="set-foot">
        <div style={{ flex:1 }}/>
        <button className="ghost-btn" onClick={onReset}>回復預設</button>
        <button className="primary-btn" onClick={onClose}>完成</button>
      </div>
    </ModalShell>
  )
}

function extractTicker(text) {
  const inParens = text.match(/\(([A-Z0-9.^]{1,12})\)/i)
  if (inParens) return inParens[1].toUpperCase()
  const tw = text.match(/^(\d{4,6}(?:\.TWO?)?)$/)
  if (tw) return tw[1].includes('.') ? tw[1] : tw[1] + '.TW'
  const us = text.match(/^([A-Z]{1,6})$/)
  if (us) return us[1]
  return null
}

function useGlossRegex(glossary) {
  return useMemo(() => {
    const keys = Object.keys(glossary)
    if (!keys.length) return null
    const sorted = keys.sort((a, b) => b.length - a.length)
    try {
      const escaped = sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      return new RegExp(`(${escaped.join('|')})`)
    } catch { return null }
  }, [glossary])
}

function GlossText({ children }) {
  const { open } = useContext(GlossaryCtx)
  const glossary = useData()?.glossary || {}
  const re = useGlossRegex(glossary)
  const text = typeof children === 'string' ? children : ''
  if (!text || !re) return <>{children}</>

  const parts = text.split(re)
  return <>
    {parts.map((p, i) =>
      glossary[p]
        ? <button key={i} className="gterm gterm--inline" onClick={e => { e.stopPropagation(); open(p) }}>{p}<sup>?</sup></button>
        : <span key={i}>{p}</span>
    )}
  </>
}

function AiStockChip({ label, onOpenSymbol }) {
  const [state, setState] = useState('idle')
  const ticker = extractTicker(label.trim())
  const query  = ticker || label.replace(/[\s　（）()【】]/g, ' ').trim()
  const canOpen = !!onOpenSymbol

  const open = async () => {
    if (state === 'loading') return
    setState('loading')
    try {
      const result = await window.api.lookupSymbol(query)
      if (result?.symbol) {
        onOpenSymbol({
          sym: result.symbol, name: result.name || result.symbol,
          val: '--', chg: 0,
          seed: symbolSeed(result.symbol), rawSym: result.symbol,
        })
      } else {
        setState('notfound')
        setTimeout(() => setState('idle'), 1800)
      }
    } catch { setState('idle') }
  }

  return (
    <button
      className={`nd-ai-chip nd-ai-chip--link${state === 'notfound' ? ' nd-ai-chip--err' : ''}`}
      onClick={open}
      disabled={state === 'loading'}>
      {state === 'loading' ? <span className="nd-ai-chip-spin"/> : null}
      {label}
      {state === 'idle' && <span className="nd-ai-chip-arr">↗</span>}
      {state === 'notfound' && <span className="nd-ai-chip-arr nd-ai-chip-arr--x">✕ 未找到</span>}
    </button>
  )
}

const AI_CACHE_TTL = 48 * 60 * 60 * 1000 // 48 hours

function aiCacheKey(news) {
  const raw = news.url || news.title || ''
  let h = 0
  for (let i = 0; i < raw.length; i++) h = Math.imul(31, h) + raw.charCodeAt(i) | 0
  return `wf-ai-${(h >>> 0).toString(36)}`
}
function loadAiCache(key) {
  try {
    const s = localStorage.getItem(key)
    if (!s) return null
    const { ts, data } = JSON.parse(s)
    if (Date.now() - ts > AI_CACHE_TTL) { localStorage.removeItem(key); return null }
    return { ...data, cached: true }
  } catch { return null }
}
function saveAiCache(key, result) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: result })) } catch {}
}

export function NewsDetail({ news, onClose, onOpenSymbol }) {
  const conv = useConv()
  const cacheKey = useMemo(() => aiCacheKey(news), [news.url, news.title])
  const [ai, setAi] = useState(() => loadAiCache(cacheKey))

  const analyse = async (bypassCache = false) => {
    if (bypassCache) localStorage.removeItem(cacheKey)
    setAi('loading')
    try {
      const timer = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000))
      const result = await Promise.race([
        window.api.analyzeNews({ title: news.title, summary: news.summary, url: news.url }),
        timer
      ])
      if (result?.ok) saveAiCache(cacheKey, result)
      setAi(result)
    } catch (e) {
      setAi({ error: 'api', message: e.message === 'timeout' ? '分析逾時，請稍後再試' : e.message })
    }
  }

  const sentColor = s => s === '多頭' ? '#22c55e' : s === '空頭' ? '#ef4444' : '#f59e0b'

  return (
    <ModalShell onClose={onClose} width={740} kicker={`${news.tag} · ${news.source} · ${news.time}`} title={news.title}>
      {news.coverUrl && (
        <img src={news.coverUrl} alt=""
          style={{ width:'100%', borderRadius:8, marginBottom:16, aspectRatio:'16/9', objectFit:'cover' }}
          onError={e => { e.currentTarget.style.display = 'none' }}/>
      )}
      {news.summary
        ? <p className="nd-lead">{news.summary}</p>
        : <p className="nd-lead nd-lead--muted">此則新聞無摘要，請點擊下方按鈕閱讀全文，或使用 AI 解析功能取得重點摘要。</p>
      }
      {news.impact && (
        <div className="nd-impact">
          <div className="nd-impact-label">即時影響</div>
          <div className="nd-impact-row">
            <div className="nd-imp-sym">{news.impact.sym}</div>
            <div className="nd-imp-chg" style={{ color: news.impact.dir > 0 ? conv.upColor : conv.downColor }}>{news.impact.chg}</div>
            <div style={{ flex:1 }}/><Sparkline seed={101 + (news.impact.sym.length || 3)} dir={news.impact.dir} w={120} h={32} fill/>
          </div>
        </div>
      )}
      {news.related?.length > 0 && <div className="nd-section"><div className="nd-section-h">相關標的</div><div className="nd-related">{news.related.map(r => <span key={r} className="nd-pill">{r}</span>)}</div></div>}
      {news.glossary?.length > 0 && <div className="nd-section"><div className="nd-section-h">本則用語</div><div className="nd-gl">{news.glossary.map(t => <GTerm key={t}>{t}</GTerm>)}</div></div>}

      <div className="nd-ai">
        {ai === null && (
          <button className="nd-ai-trigger" onClick={analyse}>
            <span className="nd-ai-spark">✦</span>AI 解析此則新聞
          </button>
        )}
        {ai === 'loading' && (
          <div className="nd-ai-loading">
            <span className="nd-ai-dots"><span/><span/><span/></span>
            Claude 正在分析中…
          </div>
        )}
        {ai?.ok && (
          <div className="nd-ai-card">
            <div className="nd-ai-card-head">
              <span className="nd-ai-label">✦ AI 解析</span>
              <span className="nd-ai-model">{ai.provider === 'groq' ? 'Groq · qwen3-32b' : 'Claude Haiku'} · {ai.source || '摘要'}</span>
              {ai.cached && <span className="nd-ai-cached">已快取</span>}
              <button className="nd-ai-redo" title="重新分析" onClick={() => analyse(true)}>↺</button>
            </div>
            <p className="nd-ai-core"><GlossText>{ai.data.core}</GlossText></p>
            {ai.data.detail && <p className="nd-ai-detail"><GlossText>{ai.data.detail}</GlossText></p>}
            <div className="nd-ai-row">
              <div className="nd-ai-sent" style={{ '--sc': sentColor(ai.data.sentiment) }}>
                <span className="nd-ai-sent-badge">{ai.data.sentiment}</span>
                <span className="nd-ai-sent-reason">{ai.data.sentimentReason}</span>
              </div>
            </div>
            {ai.data.affected?.length > 0 && (
              <div className="nd-ai-chips">
                <span className="nd-ai-chips-lbl">影響標的</span>
                {ai.data.affected.map(a => <AiStockChip key={a} label={a} onOpenSymbol={onOpenSymbol}/>)}
              </div>
            )}
            {(ai.data.catalysts?.length > 0 || ai.data.risks?.length > 0) && (
              <div className="nd-ai-cr">
                {ai.data.catalysts?.length > 0 && (
                  <div className="nd-ai-cr-col nd-ai-cr-pos">
                    <div className="nd-ai-cr-head"><span className="nd-ai-cr-ico">↑</span>催化因素</div>
                    <ul className="nd-ai-cr-list">{ai.data.catalysts.map((c, i) => <li key={i}><GlossText>{c}</GlossText></li>)}</ul>
                  </div>
                )}
                {ai.data.risks?.length > 0 && (
                  <div className="nd-ai-cr-col nd-ai-cr-neg">
                    <div className="nd-ai-cr-head"><span className="nd-ai-cr-ico">↓</span>風險提示</div>
                    <ul className="nd-ai-cr-list">{ai.data.risks.map((r, i) => <li key={i}><GlossText>{r}</GlossText></li>)}</ul>
                  </div>
                )}
              </div>
            )}
            {ai.data.points?.length > 0 && (
              <div className="nd-ai-pts-wrap">
                <div className="nd-ai-pts-head">投資人關注要點</div>
                <ul className="nd-ai-pts">
                  {ai.data.points.map((p, i) => (
                    <li key={i}><span className="nd-ai-pt-num">{i + 1}</span><span><GlossText>{p}</GlossText></span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {ai?.error && (
          <div className="nd-ai-err">
            <span>
              {ai.error === 'no_key'
                ? '尚未設定 Anthropic API 金鑰。請至「設定 → AI 功能」輸入金鑰後再試。'
                : `解析失敗：${ai.message || ai.error}`}
            </span>
            <button className="nd-ai-retry" onClick={() => setAi(null)}>重試</button>
          </div>
        )}
      </div>

      {(() => {
        const ids = (NEWS_LEARN_MAP[news.tag] || []).filter(id => LEARN_CARDS.some(c => c.id === id)).slice(0, 3)
        if (!ids.length) return null
        return (
          <div className="nd-learn">
            <div className="nd-learn-title">📖 相關教學</div>
            <div className="nd-learn-list">
              {ids.map(id => <MiniLearnCard key={id} cardId={id}/>)}
            </div>
          </div>
        )
      })()}

      {news.url && (
        <div className="nd-foot">
          <div style={{ flex:1 }}/>
          <button className="primary-btn" onClick={() => window.api.openExternal(news.url)}>在瀏覽器閱讀全文 →</button>
        </div>
      )}
    </ModalShell>
  )
}

export function GlossaryPopup({ term, onClose, onJump }) {
  const data = useData()
  const def = data.glossary?.[term]
  const related = Object.keys(data.glossary || {}).filter(k => k !== term).slice(0, 6)
  return (
    <ModalShell onClose={onClose} width={520} kicker="財經百科 · 名詞解釋" title={term}>
      <p className="gl-def">{def}</p>
      <div className="gl-related"><div className="gl-related-h">相關詞彙</div><div className="gl-related-chips">{related.map(r => <button key={r} className="gl-chip" onClick={() => onJump(r)}>{r}</button>)}</div></div>
      <div className="gl-foot"><button className="ghost-btn" onClick={onClose}>知道了</button></div>
    </ModalShell>
  )
}

export function GlossaryIndex({ onClose, onPick }) {
  const [q, setQ] = useState('')
  const data = useData()
  const all = Object.entries(data.glossary || {})
  const filtered = q ? all.filter(([k, v]) => k.toLowerCase().includes(q.toLowerCase()) || v.includes(q)) : all
  return (
    <ModalShell onClose={onClose} width={720} kicker="LEARN" title="財經百科 · 名詞索引" subtitle="點擊任一詞彙查看完整解釋。">
      <div className="gi-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋名詞…"/><span className="gi-count">{filtered.length} 個結果</span></div>
      <div className="gi-list">
        {filtered.map(([term, def]) => <button key={term} className="gi-item" onClick={() => onPick(term)}><span className="gi-term">{term}</span><span className="gi-def">{def}</span></button>)}
        {filtered.length === 0 && <div className="gi-empty">找不到相關詞彙</div>}
      </div>
    </ModalShell>
  )
}

export function PortfolioModal({ holdings, onSave, onClose }) {
  const [items, setItems] = useState(holdings)
  const [newSym, setNewSym] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newCost, setNewCost] = useState('')
  const [looking, setLooking] = useState(false)
  const [err, setErr] = useState(null)

  const addHolding = async () => {
    if (!newSym || !newQty || !newCost) return
    setLooking(true); setErr(null)
    try {
      const result = await window.api.lookupSymbol(newSym.trim())
      if (!result) { setErr('找不到代碼，請確認後重試'); setLooking(false); return }
      const next = [...items.filter(i => i.rawSym !== result.symbol), {
        sym: result.symbol, name: result.name, rawSym: result.symbol,
        qty: parseFloat(newQty), avgCost: parseFloat(newCost)
      }]
      setItems(next)
      setNewSym(''); setNewQty(''); setNewCost('')
    } catch { setErr('查詢失敗，請稍後再試') }
    finally { setLooking(false) }
  }

  return (
    <ModalShell onClose={onClose} width={600} kicker="PORTFOLIO" title="投資組合" subtitle="記錄您的持倉，系統將自動計算即時損益。資料僅儲存於本機裝置。">
      <div className="port-list">
        {items.map(h => (
          <div key={h.rawSym} className="port-row">
            <div className="port-sym"><span className="port-s">{h.sym}</span><span className="port-n">{h.name}</span></div>
            <div className="port-nums"><span>數量 {h.qty.toLocaleString()}</span><span>均價 {h.avgCost.toFixed(2)}</span></div>
            <button className="port-x" onClick={() => setItems(items.filter(i => i.rawSym !== h.rawSym))}>×</button>
          </div>
        ))}
        {items.length === 0 && <div className="port-empty">尚無持倉，請在下方新增</div>}
      </div>
      <div className="port-add">
        <div className="port-add-h">新增持倉</div>
        <div className="port-add-row">
          <input placeholder="代碼（如 AAPL）" value={newSym} onChange={e => { setNewSym(e.target.value); setErr(null) }} style={{ flex:2 }}/>
          <input placeholder="數量" type="number" value={newQty} onChange={e => setNewQty(e.target.value)} style={{ flex:1 }}/>
          <input placeholder="均價" type="number" value={newCost} onChange={e => setNewCost(e.target.value)} style={{ flex:1.5 }} onKeyDown={e => e.key === 'Enter' && addHolding()}/>
          <button className="primary-btn" onClick={addHolding} disabled={!newSym || !newQty || !newCost || looking}>{looking ? '查詢中…' : '新增'}</button>
        </div>
        {err && <div style={{ color:'var(--red)', fontSize:12, marginTop:4 }}>{err}</div>}
      </div>
      <div className="set-foot">
        <div style={{ flex:1 }}/>
        <button className="ghost-btn" onClick={onClose}>取消</button>
        <button className="primary-btn" onClick={() => { onSave(items); onClose() }}>儲存</button>
      </div>
    </ModalShell>
  )
}

const QUICK_PICKS = [
  { symbol:'2330.TW', name:'台積電',    exchange:'TWSE' },
  { symbol:'2317.TW', name:'鴻海',      exchange:'TWSE' },
  { symbol:'2454.TW', name:'聯發科',    exchange:'TWSE' },
  { symbol:'0050.TW', name:'元大台灣50',exchange:'TWSE' },
  { symbol:'NVDA',    name:'NVIDIA',    exchange:'NASDAQ' },
  { symbol:'AAPL',    name:'Apple',     exchange:'NASDAQ' },
  { symbol:'BTC-USD', name:'Bitcoin',   exchange:'Crypto' },
]

export function AddWatchModal({ onClose, onAdd, existingSymbols = [] }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState(null)

  const isIn = (sym) => existingSymbols.includes(sym)

  const addItem = (r) => {
    if (isIn(r.symbol)) return
    onAdd({ sym: r.symbol, name: r.name, val: '--', chg: 0, seed: symbolSeed(r.symbol), rawSym: r.symbol })
    onClose()
  }

  const search = async () => {
    const s = q.trim()
    if (!s) return
    setSearching(true); setErr(null); setResults([])
    try {
      let list = []
      try { list = await window.api.searchSymbol(s) } catch {}
      if (!list?.length) {
        try {
          const r = await window.api.lookupSymbol(s)
          if (r?.symbol) list = [{ symbol: r.symbol, name: r.name, exchange: '', type: 'EQUITY' }]
        } catch {}
      }
      if (!list?.length) setErr('找不到相關結果，請嘗試其他關鍵字或代碼')
      else setResults(list)
    } catch { setErr('搜尋失敗，請稍後再試') }
    finally { setSearching(false) }
  }

  return (
    <ModalShell onClose={onClose} width={500} kicker="自選清單" title="新增標的" subtitle="輸入代碼（AAPL、2330.TW）或中文名稱搜尋。">
      <div className="aw-search-row">
        <input value={q}
          onChange={e => { setQ(e.target.value); setErr(null); setResults([]) }}
          placeholder="代碼 或 名稱，例如：台積電、NVDA"
          autoFocus onKeyDown={e => e.key === 'Enter' && search()}
          style={{ flex:1 }}/>
        <button className="primary-btn" onClick={search} disabled={!q.trim() || searching}>
          {searching ? '搜尋中…' : '搜尋'}
        </button>
      </div>
      {err && <div style={{ color:'var(--red)', fontSize:12, marginTop:6 }}>{err}</div>}
      {results.length > 0 && (
        <div className="aw-results">
          {results.map(r => {
            const already = isIn(r.symbol)
            return (
              <button key={r.symbol} className={`aw-result-row${already ? ' aw-result-row--in' : ''}`}
                onClick={() => addItem(r)} disabled={already}>
                <div className="aw-res-l">
                  <span className="aw-res-sym">{r.symbol}</span>
                  <span className="aw-res-name">{r.name}</span>
                </div>
                <div className="aw-res-r">
                  {r.exchange && <span className="aw-res-exch">{r.exchange}</span>}
                  <span className={`aw-res-add${already ? ' aw-res-add--in' : ''}`}>
                    {already ? '✓ 已在自選' : '＋'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
      <div className="aw-quick">
        <div className="aw-quick-h">熱門</div>
        <div className="aw-quick-grid">
          {QUICK_PICKS.map(r => {
            const already = isIn(r.symbol)
            return (
              <button key={r.symbol} className={`aw-qpick${already ? ' aw-qpick--in' : ''}`}
                onClick={() => addItem(r)} disabled={already} title={already ? '已在自選清單' : r.name}>
                <span className="aw-qp-sym">{r.symbol}</span>
                <span className="aw-qp-name">{already ? '✓ 已加入' : r.name}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="aw-actions">
        <button className="ghost-btn" onClick={onClose}>取消</button>
      </div>
    </ModalShell>
  )
}

export function AlertModal({ item, alerts, onSave, onClose }) {
  const conv = useConv()
  const myAlerts = alerts.filter(a => a.rawSym === item.rawSym)
  const [direction, setDirection] = useState('above')
  const [price, setPrice] = useState('')

  const add = () => {
    const p = parseFloat(price)
    if (isNaN(p)) return
    onSave([...alerts, { id: Date.now(), sym: item.sym, name: item.name, rawSym: item.rawSym, direction, price: p }])
    setPrice('')
  }

  return (
    <ModalShell onClose={onClose} width={460} kicker="ALERT" title={`設定提醒 · ${item.sym}`} subtitle={`現價 ${item.val}，當觸及目標價時系統將提示。`}>
      <div className="alt-list">
        {myAlerts.map(a => (
          <div key={a.id} className="alt-row">
            <span className="alt-dir" style={{ color: a.direction === 'above' ? conv.upColor : conv.downColor }}>{a.direction === 'above' ? '突破' : '跌破'}</span>
            <span className="alt-price">{a.price.toFixed(2)}</span>
            <div style={{ flex:1 }}/>
            <button className="port-x" onClick={() => onSave(alerts.filter(al => al.id !== a.id))}>×</button>
          </div>
        ))}
        {myAlerts.length === 0 && <div className="port-empty">尚無設定的提醒</div>}
      </div>
      <div className="alt-add">
        <div className="alt-add-row">
          <div className="set-seg" style={{ flexShrink:0 }}>
            <button className={`set-seg-btn ${direction === 'above' ? 'on' : ''}`} onClick={() => setDirection('above')}>突破</button>
            <button className={`set-seg-btn ${direction === 'below' ? 'on' : ''}`} onClick={() => setDirection('below')}>跌破</button>
          </div>
          <input type="number" placeholder="目標價" value={price} onChange={e => setPrice(e.target.value)} style={{ flex:1 }} onKeyDown={e => e.key === 'Enter' && add()}/>
          <button className="primary-btn" onClick={add} disabled={!price}>新增</button>
        </div>
      </div>
      <div className="set-foot"><div style={{ flex:1 }}/><button className="ghost-btn" onClick={onClose}>關閉</button></div>
    </ModalShell>
  )
}

// ── Group Manager Modal ───────────────────────────────────────
const GROUP_COLORS = [
  '#6366f1','#0ea5e9','#a855f7','#f59e0b','#10b981',
  '#ef4444','#f97316','#ec4899','#06b6d4','#84cc16',
]

export function GroupManagerModal({ groups, onSave, onClose }) {
  const [draft, setDraft] = useState(
    () => groups.map(g => ({ ...g, symbols: [...(g.symbols || [])] }))
  )
  const [selectedId, setSelectedId] = useState(draft[0]?.id ?? null)
  const [addInput, setAddInput] = useState('')
  const [adding, setAdding] = useState(false)

  const cur = draft.find(g => g.id === selectedId) ?? null

  const updateGroup = (id, patch) =>
    setDraft(d => d.map(g => g.id === id ? { ...g, ...patch } : g))

  const removeGroup = (id) => {
    const next = draft.filter(g => g.id !== id)
    setDraft(next)
    setSelectedId(next[0]?.id ?? null)
  }

  const addGroup = () => {
    const id = 'g' + Date.now()
    const newGrp = {
      id, name: '新群組',
      color: GROUP_COLORS[draft.length % GROUP_COLORS.length],
      symbols: [],
    }
    setDraft(d => [...d, newGrp])
    setSelectedId(id)
  }

  const removeSymbol = (sym) => {
    if (!cur) return
    updateGroup(cur.id, { symbols: cur.symbols.filter(s => s.symbol !== sym) })
  }

  const addSymbol = async () => {
    const sym = addInput.trim().toUpperCase()
    if (!sym || !cur || cur.symbols.some(s => s.symbol === sym)) {
      setAddInput('')
      return
    }
    setAdding(true)
    try {
      const info = await window.api.lookupSymbol(sym).catch(() => null)
      const entry = info
        ? { symbol: info.symbol || sym, name: info.name || sym }
        : { symbol: sym, name: sym }
      updateGroup(cur.id, { symbols: [...cur.symbols, entry] })
    } finally {
      setAdding(false)
      setAddInput('')
    }
  }

  return (
    <ModalShell onClose={onClose} width={720}>
      <div className="mgr-head">
        <div>
          <div className="mgr-kicker">GROUPS</div>
          <div className="mgr-title">管理自選群組</div>
        </div>
        <button className="primary-btn" onClick={() => { onSave(draft); onClose() }}>儲存</button>
      </div>
      <div className="mgr-body">
        <div className="mgr-sidebar">
          {draft.map(g => (
            <button
              key={g.id}
              className={`mgr-gtab ${selectedId === g.id ? 'on' : ''}`}
              onClick={() => setSelectedId(g.id)}
            >
              <span className="mgr-dot" style={{ background: g.color }}/>
              <span className="mgr-gname">{g.name || '（未命名）'}</span>
              <span className="mgr-gct">{g.symbols.length}</span>
            </button>
          ))}
          <button className="mgr-add-grp" onClick={addGroup}>＋ 新增群組</button>
        </div>

        {cur ? (
          <div className="mgr-detail">
            <div className="mgr-row">
              <input
                className="mgr-name-input"
                value={cur.name}
                onChange={e => updateGroup(cur.id, { name: e.target.value })}
                placeholder="群組名稱"
              />
              <button className="mgr-del-btn" onClick={() => removeGroup(cur.id)}>刪除群組</button>
            </div>
            <div className="mgr-color-row">
              <span className="mgr-color-label">顏色</span>
              <div className="mgr-colors">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c}
                    className={`mgr-clr ${cur.color === c ? 'on' : ''}`}
                    style={{ background: c }}
                    onClick={() => updateGroup(cur.id, { color: c })}
                  />
                ))}
              </div>
            </div>
            <div className="mgr-syms">
              {cur.symbols.length === 0 && (
                <div className="mgr-syms-empty">尚無標的，在下方輸入代碼新增</div>
              )}
              {cur.symbols.map(s => (
                <div key={s.symbol} className="mgr-sym-chip">
                  <span className="mgr-chip-sym">{s.symbol}</span>
                  {s.name && s.name !== s.symbol && (
                    <span className="mgr-chip-name">{s.name}</span>
                  )}
                  <button className="mgr-chip-x" onClick={() => removeSymbol(s.symbol)}>×</button>
                </div>
              ))}
            </div>
            <div className="mgr-add-sym">
              <input
                value={addInput}
                onChange={e => setAddInput(e.target.value)}
                placeholder="輸入代碼，如 AAPL 或 2330.TW，按 Enter 新增"
                onKeyDown={e => e.key === 'Enter' && addSymbol()}
              />
              <button onClick={addSymbol} disabled={adding || !addInput.trim()}>
                {adding ? '查詢中…' : '新增'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mgr-empty">點擊左側群組開始編輯，或新增一個群組</div>
        )}
      </div>
    </ModalShell>
  )
}
