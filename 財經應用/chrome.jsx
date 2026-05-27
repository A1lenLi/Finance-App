/* global React, DATA, Num, ChangeBadge, Sparkline, BigChart, GTerm, useConv, LogoMark */
const { useState } = React;

// ─────────────────────────────────────────────────────────────
// LEFT NAV — collapsible primary navigation
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'feed',       label: '今日脈動',   icon: 'pulse',     section: 'pulse' },
  { id: 'indices',    label: '全球股市',   icon: 'chart',     section: 'market', tab: 'indices' },
  { id: 'forex',      label: '外匯匯率',   icon: 'forex',     section: 'market', tab: 'forex' },
  { id: 'commod',     label: '大宗商品',   icon: 'coin',      section: 'market', tab: 'commodities' },
  { id: 'treas',      label: '公債殖利率', icon: 'bank',      section: 'market', tab: 'treasuries' },
  { id: 'crypto',     label: '加密貨幣',   icon: 'crypto',    section: 'market', tab: 'crypto' },
  { id: 'sep',        sep: true },
  { id: 'watch',      label: '自選清單',   icon: 'star',      section: 'watch' },
  { id: 'port',       label: '投資組合',   icon: 'wallet',    section: 'port' },
  { id: 'cal',        label: '經濟日曆',   icon: 'cal',       section: 'cal' },
  { id: 'senti',      label: '市場情緒',   icon: 'gauge',     section: 'senti' },
  { id: 'sep2',       sep: true },
  { id: 'news',       label: '新聞動態',   icon: 'news',      section: 'news' },
  { id: 'learn',      label: '投資百科',   icon: 'book',      section: 'learn' },
];

function NavIcon({ name }) {
  const I = {
    pulse: <><path d="M3 12h3l3-8 4 16 3-8h5"/></>,
    chart: <><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></>,
    forex: <><path d="M5 8h13l-3-3"/><path d="M19 16H6l3 3"/></>,
    coin: <><circle cx="12" cy="12" r="9"/><path d="M9 9c1-1 5-1 5 1s-5 1-5 3 4 2 5 1"/></>,
    bank: <><path d="M3 21h18"/><path d="M5 10h14M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M3 8l9-5 9 5"/></>,
    crypto: <><circle cx="12" cy="12" r="9"/><path d="M9 8v8h3a3 3 0 1 0 0-6H9m0 3h4"/></>,
    star: <><path d="M12 3l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/></>,
    wallet: <><path d="M3 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3V6z"/><path d="M16 12h4"/></>,
    cal: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    gauge: <><path d="M3 12a9 9 0 0 1 18 0"/><path d="M12 12l5-3"/></>,
    news: <><rect x="3" y="5" width="14" height="14" rx="1"/><path d="M17 8h4v9a2 2 0 0 1-2 2H8M7 9h6M7 13h6M7 17h3"/></>,
    book: <><path d="M4 4v14a2 2 0 0 1 2-2h12V4H6a2 2 0 0 0-2 2zM8 7h8M8 11h6"/></>,
  }[name];
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round">{I}</svg>
  );
}

function LeftNav({ active, onSelect, collapsed }) {
  return (
    <aside className={`leftnav ${collapsed ? 'collapsed' : ''}`}>
      <div className="ln-brand">
        <LogoMark size={22}/>
        {!collapsed && <span className="ln-brand-name">財經脈動<i>·</i><em>Worldwide Finance</em></span>}
      </div>
      <nav className="ln-list">
        {NAV_ITEMS.map(n => n.sep ? (
          <div key={n.id} className="ln-sep" />
        ) : (
          <button
            key={n.id}
            className={`ln-item ${active === n.id ? 'active' : ''}`}
            onClick={() => onSelect(n)}>
            <span className="ln-icon"><NavIcon name={n.icon}/></span>
            {!collapsed && <span className="ln-label">{n.label}</span>}
          </button>
        ))}
      </nav>
      <div className="ln-footer">
        {!collapsed && <div className="ln-mode">▌即時模式</div>}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// RIGHT RAIL — Watchlist
// ─────────────────────────────────────────────────────────────
function WatchRail({ items, onAdd, onSelect, onRemove, collapsed, onToggle }) {
  const conv = useConv();
  return (
    <aside className={`watchrail ${collapsed ? 'collapsed' : ''}`}>
      <div className="wr-head">
        <button className="wr-toggle" onClick={onToggle} title={collapsed ? '展開自選' : '收起自選'}>
          {collapsed ? '◀' : '▶'}
        </button>
        {!collapsed && (
          <>
            <div className="wr-title">
              <span className="wr-kicker">WATCHLIST</span>
              <span className="wr-label">自選清單</span>
            </div>
            <button className="wr-add" onClick={onAdd}>＋ 新增</button>
          </>
        )}
      </div>
      {!collapsed && (
        <>
          <div className="wr-stats">
            <span>{items.length} 項</span>
            <span style={{ flex: 1 }}/>
            <span style={{ color: conv.upColor }}>
              ▲ {items.filter(i => i.chg > 0).length}
            </span>
            <span style={{ color: conv.downColor }}>
              ▼ {items.filter(i => i.chg < 0).length}
            </span>
          </div>
          <div className="wr-list">
            {items.map(it => (
              <div key={it.sym} className="wr-row" onClick={() => onSelect(it)}>
                <div className="wr-r1">
                  <div className="wr-name-grp">
                    <span className="wr-name">{it.name}</span>
                    <span className="wr-sym">{it.sym}</span>
                  </div>
                  <button className="wr-x" onClick={(e) => { e.stopPropagation(); onRemove(it); }}
                    title="移除">×</button>
                </div>
                <div className="wr-r2">
                  <span className="wr-val">{it.val}</span>
                  <span style={{
                    color: it.chg > 0 ? conv.upColor : it.chg < 0 ? conv.downColor : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11,
                  }}>
                    {it.chg > 0 ? '+' : ''}{it.chg.toFixed(2)}%
                  </span>
                </div>
                <Sparkline seed={it.seed} dir={it.chg >= 0 ? 1 : -1} w={200} h={26} fill/>
              </div>
            ))}
          </div>
          <div className="wr-foot">
            <button className="ghost-btn" onClick={onAdd} style={{ width: '100%', justifyContent: 'center' }}>
              + 新增關注標的
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────────────────────────
function TopBar({ onSearch, onGlossary, onSettings, onRefresh, onToggleLeft, onCommand, density, onCycleDensity }) {
  const [q, setQ] = useState('');
  const time = '14:32:08';
  const conv = useConv();
  const { portfolio } = DATA;
  return (
    <header className="topbar">
      <div className="tb-l">
        <button className="tb-btn iconic" onClick={onToggleLeft} title="切換導覽">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <div className="tb-clock">
          <span className="tb-time">{time}</span>
          <span className="tb-tz">GMT+8</span>
        </div>
        <span className="tb-divider"/>
        <span className="tb-status">
          <i className="dot-live"/>市場開盤中 · NYSE / TWSE
        </span>
      </div>
      <div className="tb-c">
        <div className="tb-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="搜尋代碼、新聞、名詞…  (⌘K)"
            onKeyDown={e => { if (e.key === 'Enter') { onSearch(q); setQ(''); } }}/>
          <span className="kbd">⌘K</span>
        </div>
      </div>
      <div className="tb-r">
        <div className="tb-pnl" title="今日損益">
          <span className="tb-pnl-label">今日</span>
          <span className="tb-pnl-val" style={{ color: conv.upColor }}>
            +{portfolio.todayChg.toLocaleString()}
            <i>  +{portfolio.todayPct.toFixed(2)}%</i>
          </span>
        </div>
        <span className="tb-divider"/>
        <button className="tb-btn" onClick={onGlossary} title="財經百科">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/>
            <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 16.5v.01"/>
          </svg>
          <span>百科</span>
        </button>
        <button className="tb-btn" onClick={onCycleDensity} title="切換密度">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round">
            <path d="M3 5h18M3 12h18M3 19h18"/></svg>
          <span>{density === 'compact' ? '密集' : density === 'comfy' ? '舒適' : '標準'}</span>
        </button>
        <button className="tb-btn iconic" onClick={onRefresh} title="重新整理">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 15.5-6.3L21 3M21 3v6h-6"/>
            <path d="M21 12a9 9 0 0 1-15.5 6.3L3 21M3 21v-6h6"/></svg>
        </button>
        <button className="tb-btn iconic" onClick={onSettings} title="設定">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09c0 .67.4 1.27 1.04 1.51a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.24.64.84 1.04 1.51 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { LeftNav, WatchRail, TopBar });
