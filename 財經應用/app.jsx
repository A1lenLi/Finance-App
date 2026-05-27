/* global React, ReactDOM, DATA,
   Hero, PulseStrip, MarketMatrix,
   NewsFeed, Calendar, SentimentBar, PortfolioBand,
   LeftNav, WatchRail, TopBar,
   ModalShell, NewsDetail, GlossaryPopup, GlossaryIndex, SymbolDetail, AddWatchModal,
   SettingsModal, SymbolPage,
   ConventionCtx, GlossaryCtx,
   useTweaks
*/

const { useState, useEffect, useMemo, useCallback } = React;

// ─────────────────────────────────────────────────────────────
// Color theme presets (Tweaks)
// ─────────────────────────────────────────────────────────────
const THEMES = {
  blue:  { accent: '#3b82f6', accent2: '#2563eb', tint: 'rgba(59,130,246,0.10)' },
  teal:  { accent: '#2dd4bf', accent2: '#14b8a6', tint: 'rgba(45,212,191,0.10)' },
  amber: { accent: '#f59e0b', accent2: '#d97706', tint: 'rgba(245,158,11,0.10)' },
};

// Up / Down color conventions
const CONVENTIONS = {
  green_up: { up: '#10b981', down: '#ef4444', label: '綠漲紅跌' },
  red_up:   { up: '#ef4444', down: '#10b981', label: '紅漲綠跌' },
};

// Font ratio presets
const FONT_RATIOS = {
  balanced: '中性',
  display:  '英文優先',
  cjk:      '中文優先',
};

// ─────────────────────────────────────────────────────────────
// TWEAK DEFAULTS
// ─────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "blue",
  "convention": "red_up",
  "density": "regular",
  "chartType": "area",
  "fontRatio": "balanced",
  "sidebar": true,
  "leftNav": true
}/*EDITMODE-END*/;

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // State
  const [watchlist, setWatchlist] = useState(DATA.watchlist);
  const [activeNav, setActiveNav] = useState('feed');
  const [matrixTab, setMatrixTab] = useState('indices');

  // Modal stack
  const [newsModal, setNewsModal]   = useState(null);
  const [symbolModal, setSymbolModal] = useState(null);   // unused but kept for legacy callers
  const [symbolPage, setSymbolPage]   = useState(null);   // full-screen takeover
  const [glossPopup, setGlossPopup]   = useState(null);
  const [glossIndex, setGlossIndex]   = useState(false);
  const [addModal, setAddModal]       = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Toolbar Tweaks toggle — open/close the Settings modal in response
  // to the host's __activate_edit_mode / __deactivate_edit_mode messages.
  // Register the listener BEFORE announcing availability.
  useEffect(() => {
    const onMsg = (e) => {
      const ty = e?.data?.type;
      if (ty === '__activate_edit_mode') setSettingsOpen(true);
      else if (ty === '__deactivate_edit_mode') setSettingsOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  }, []);

  const resetSettings = useCallback(() => {
    setTweak(TWEAK_DEFAULTS);
  }, []);

  const [leftCollapsed, setLeftCollapsed] = useState(!t.leftNav);
  const [rightCollapsed, setRightCollapsed] = useState(!t.sidebar);

  useEffect(() => setLeftCollapsed(!t.leftNav), [t.leftNav]);
  useEffect(() => setRightCollapsed(!t.sidebar), [t.sidebar]);

  // Convention context value
  const convention = CONVENTIONS[t.convention];
  const convValue = useMemo(() => ({
    upColor: convention.up,
    downColor: convention.down,
    density: t.density,
    chartType: t.chartType,
  }), [convention, t.density, t.chartType]);

  // Glossary helper
  const openGlossary = useCallback((term) => setGlossPopup(term), []);
  const glossValue = useMemo(() => ({ open: openGlossary }), [openGlossary]);

  // Navigation handler — scrolls to / focuses section
  const onNavSelect = (item) => {
    setActiveNav(item.id);
    if (item.section === 'market') {
      setMatrixTab(item.tab);
      scrollTo('section-market');
    } else if (item.section === 'pulse') {
      scrollTo('section-hero');
    } else if (item.section === 'news') {
      scrollTo('section-news');
    } else if (item.section === 'cal') {
      scrollTo('section-cal');
    } else if (item.section === 'senti') {
      scrollTo('section-senti');
    } else if (item.section === 'port') {
      scrollTo('section-port');
    } else if (item.section === 'watch') {
      setRightCollapsed(false);
      setTweak('sidebar', true);
    } else if (item.section === 'learn') {
      setGlossIndex(true);
    }
  };

  const scrollTo = (id) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      const main = document.querySelector('.main');
      if (el && main) {
        main.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
      }
    }, 30);
  };

  // Watchlist operations
  const handleAdd = (it) => {
    if (watchlist.find(w => w.sym === it.sym)) return;
    setWatchlist(list => [it, ...list]);
  };
  const handleRemove = (it) => {
    setWatchlist(list => list.filter(w => w.sym !== it.sym));
  };

  // Theme CSS variables
  const themeStyle = useMemo(() => {
    const th = THEMES[t.theme] || THEMES.blue;
    return {
      '--accent': th.accent,
      '--accent-2': th.accent2,
      '--accent-tint': th.tint,
      '--green':  convention.up,
      '--red':    convention.down,
    };
  }, [t.theme, convention]);

  // Search → open glossary or watchlist add
  const handleSearch = (q) => {
    if (!q) return;
    if (DATA.glossary[q]) { setGlossPopup(q); return; }
    setAddModal(true);
  };

  // Density cycle
  const cycleDensity = () => {
    const order = ['compact','regular','comfy'];
    const next = order[(order.indexOf(t.density) + 1) % order.length];
    setTweak('density', next);
  };

  return (
    <ConventionCtx.Provider value={convValue}>
      <GlossaryCtx.Provider value={glossValue}>
        <div className="app"
             data-theme={t.theme}
             data-density={t.density}
             data-font={t.fontRatio}
             style={themeStyle}>

          {/* macOS-style title strip */}
          <div className="titlestrip">
            <div className="tl-dots">
              <button className="tl-dot tl-r" aria-label="close"/>
              <button className="tl-dot tl-y" aria-label="minimize"/>
              <button className="tl-dot tl-g" aria-label="maximize"/>
            </div>
            <div className="tl-title">
              財經脈動 <em>Worldwide Finance · v2.6.0</em>
            </div>
            <div className="tl-right">
              <span>2026.05.18 · Mon</span>
            </div>
          </div>

          <TopBar
            onSearch={handleSearch}
            onGlossary={() => setGlossIndex(true)}
            onSettings={() => setSettingsOpen(true)}
            onRefresh={() => {}}
            onToggleLeft={() => {
              setLeftCollapsed(v => !v);
              setTweak('leftNav', leftCollapsed);
            }}
            density={t.density}
            onCycleDensity={cycleDensity}
          />

          <LeftNav
            active={activeNav}
            onSelect={onNavSelect}
            collapsed={leftCollapsed}
          />

          <main className="main">
            {symbolPage ? (
              <SymbolPage
                item={symbolPage}
                onClose={() => setSymbolPage(null)}
                onAddWatch={handleAdd}
                inWatchlist={!!watchlist.find(w => w.sym === symbolPage.sym)}
                onOpenSymbol={(it) => setSymbolPage(it)}
                onOpenNews={(n) => setNewsModal(n)}
              />
            ) : (
              <>
                <div id="section-hero">
                  <Hero onOpenNews={(n) => setNewsModal(n)}/>
                </div>

                <PulseStrip onSelect={(it) => setSymbolPage(it)}/>

                <div id="section-market">
                  <MarketMatrix
                    onSelect={(it) => setSymbolPage(it)}
                    defaultTab={matrixTab}
                    key={matrixTab}/>
                </div>

                <div id="section-senti">
                  <SentimentBar/>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 1fr',
                  gap: 'var(--gap-section)',
                }}>
                  <div id="section-news">
                    <NewsFeed onOpen={(n) => setNewsModal(n)}/>
                  </div>
                  <div id="section-cal">
                    <Calendar/>
                  </div>
                </div>

                <div id="section-port">
                  <PortfolioBand/>
                </div>

                <footer style={{
                  padding: '20px 4px', fontSize: 11,
                  color: 'var(--text-muted)', textAlign: 'center',
                  borderTop: '1px solid var(--border)', marginTop: 8,
                }}>
                  資料來源：Yahoo Finance｜點擊任意項目查看詳情｜
                  <strong style={{ color: 'var(--text)' }}>僅供參考，不構成投資建議</strong>
                </footer>
              </>
            )}
          </main>

          <WatchRail
            items={watchlist}
            onAdd={() => setAddModal(true)}
            onSelect={(it) => setSymbolPage(it)}
            onRemove={handleRemove}
            collapsed={rightCollapsed}
            onToggle={() => {
              setRightCollapsed(v => !v);
              setTweak('sidebar', rightCollapsed);
            }}
          />

          {/* ── Modals ───────────────────────────────── */}
          {newsModal && <NewsDetail news={newsModal} onClose={() => setNewsModal(null)}/>}
          {symbolModal && <SymbolDetail
            item={symbolModal}
            onClose={() => setSymbolModal(null)}
            onAddWatch={handleAdd}
            inWatchlist={!!watchlist.find(w => w.sym === symbolModal.sym)}
          />}
          {glossPopup && <GlossaryPopup
            term={glossPopup}
            onClose={() => setGlossPopup(null)}
            onJump={(t2) => setGlossPopup(t2)}
          />}
          {glossIndex && <GlossaryIndex
            onClose={() => setGlossIndex(false)}
            onPick={(term) => { setGlossPopup(term); setGlossIndex(false); }}
          />}
          {addModal && <AddWatchModal
            onClose={() => setAddModal(false)}
            onAdd={handleAdd}
          />}

          {/* ── Settings (formerly the Tweaks panel) ─── */}
          {settingsOpen && <SettingsModal
            t={t}
            setTweak={setTweak}
            themes={THEMES}
            onReset={resetSettings}
            onClose={closeSettings}/>}
        </div>
      </GlossaryCtx.Provider>
    </ConventionCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
