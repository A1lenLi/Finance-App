/* global React, DATA, Num, ChangeBadge, Sparkline, BigChart, GTerm, useConv, RegionTag */
const { useState: useStateM, useEffect: useEffectM } = React;

// ─────────────────────────────────────────────────────────────
// SETTINGS — single home for everything that used to live in
// the floating Tweaks panel.  Built on ModalShell so it inherits
// the same overlay / scrim / close behavior as every other modal.
// ─────────────────────────────────────────────────────────────
function SetRow({ label, hint, children }) {
  return (
    <div className="set-row">
      <div className="set-row-l">
        <div className="set-row-label">{label}</div>
        {hint && <div className="set-row-hint">{hint}</div>}
      </div>
      <div className="set-row-r">{children}</div>
    </div>
  );
}

function SetSeg({ value, options, onChange }) {
  return (
    <div className="set-seg" role="tablist">
      {options.map(o => (
        <button key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`set-seg-btn ${value === o.value ? 'on' : ''}`}
          onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SetSwatches({ value, options, onChange }) {
  return (
    <div className="set-sw-list">
      {options.map(o => (
        <button key={o.value}
          className={`set-sw ${value === o.value ? 'on' : ''}`}
          onClick={() => onChange(o.value)}
          title={o.label}
          aria-label={o.label}>
          <span className="set-sw-dot" style={{ background: o.color }}/>
          <span className="set-sw-name">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function SetSwitch({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      className={`set-switch ${value ? 'on' : ''}`}
      onClick={() => onChange(!value)}>
      <span className="set-switch-thumb"/>
    </button>
  );
}

function SetSelect({ value, options, onChange }) {
  return (
    <div className="set-select-wrap">
      <select
        className="set-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg width="10" height="6" viewBox="0 0 10 6" className="set-select-caret">
        <path fill="currentColor" d="M0 0h10L5 6z"/>
      </svg>
    </div>
  );
}

function SettingsModal({ t, setTweak, onClose, onReset, themes }) {
  return (
    <ModalShell onClose={onClose} width={620}
      kicker="PREFERENCES" title="設定"
      subtitle="個人化你的儀表板顯示與互動偏好。所有變更即時生效並自動保存。">

      <div className="set-list">
        <div className="set-sect">
          <div className="set-sect-h">
            <span className="set-sect-num">01</span>
            <span className="set-sect-name">顯示偏好</span>
          </div>

          <SetRow label="漲跌色慣例"
            hint="台股 / 港股市場習慣紅漲綠跌；歐美市場習慣綠漲紅跌。">
            <SetSeg
              value={t.convention}
              onChange={(v) => setTweak('convention', v)}
              options={[
                { value: 'red_up',   label: '紅漲綠跌' },
                { value: 'green_up', label: '綠漲紅跌' },
              ]}/>
          </SetRow>

          <SetRow label="主題色"
            hint="影響強調按鈕、連結、選取狀態與圖表筆觸的主要色相。">
            <SetSwatches
              value={t.theme}
              onChange={(v) => setTweak('theme', v)}
              options={[
                { value: 'blue',  label: '海軍藍', color: themes.blue.accent },
                { value: 'teal',  label: '青藍',   color: themes.teal.accent },
                { value: 'amber', label: '琥珀',   color: themes.amber.accent },
              ]}/>
          </SetRow>
        </div>

        <div className="set-sect">
          <div className="set-sect-h">
            <span className="set-sect-num">02</span>
            <span className="set-sect-name">版面密度</span>
          </div>

          <SetRow label="資訊密度"
            hint="調整列高、間距與基礎字級。密集適合多螢幕、舒適適合長時間閱讀。">
            <SetSeg
              value={t.density}
              onChange={(v) => setTweak('density', v)}
              options={[
                { value: 'compact', label: '密集' },
                { value: 'regular', label: '標準' },
                { value: 'comfy',   label: '舒適' },
              ]}/>
          </SetRow>

          <SetRow label="圖表樣式"
            hint="個股、指數詳情頁的預設圖表呈現方式。">
            <SetSeg
              value={t.chartType}
              onChange={(v) => setTweak('chartType', v)}
              options={[
                { value: 'line',   label: '折線' },
                { value: 'area',   label: '面積' },
                { value: 'candle', label: '蠟燭' },
              ]}/>
          </SetRow>
        </div>

        <div className="set-sect">
          <div className="set-sect-h">
            <span className="set-sect-num">03</span>
            <span className="set-sect-name">介面元件</span>
          </div>

          <SetRow label="顯示左側導覽"
            hint="關閉後可獲得更大主視窗，仍可從快捷鍵 [ 切換。">
            <SetSwitch value={t.leftNav}
              onChange={(v) => setTweak('leftNav', v)}/>
          </SetRow>

          <SetRow label="顯示自選清單側欄"
            hint="右側自選即時報價欄。新增 / 移除標的不受影響。">
            <SetSwitch value={t.sidebar}
              onChange={(v) => setTweak('sidebar', v)}/>
          </SetRow>
        </div>

        <div className="set-sect">
          <div className="set-sect-h">
            <span className="set-sect-num">04</span>
            <span className="set-sect-name">字體</span>
          </div>

          <SetRow label="中英字型比例"
            hint="Inter 為英文 / 數字字體，Noto Sans TC 為中文字體。">
            <SetSelect
              value={t.fontRatio}
              onChange={(v) => setTweak('fontRatio', v)}
              options={[
                { value: 'balanced', label: '中性 — Inter + Noto' },
                { value: 'display',  label: '英文 / 數字優先' },
                { value: 'cjk',      label: '中文優先' },
              ]}/>
          </SetRow>
        </div>
      </div>

      <div className="set-foot">
        <div className="set-foot-meta">
          設定會即時保存到此檔案 ·
          <strong style={{ color: 'var(--text)', marginLeft: 4 }}>EDITMODE 區塊</strong>
        </div>
        <div style={{ flex: 1 }}/>
        <button className="ghost-btn" onClick={onReset}>回復預設</button>
        <button className="primary-btn" onClick={onClose}>完成</button>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED — modal scaffold
// ─────────────────────────────────────────────────────────────
function ModalShell({ children, onClose, width = 640, kicker, title, subtitle }) {
  useEffectM(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-card" style={{ width }} onClick={e => e.stopPropagation()}>
        <button className="overlay-x" onClick={onClose} aria-label="關閉">×</button>
        {(kicker || title) && (
          <div className="overlay-head">
            {kicker && <div className="overlay-kicker">{kicker}</div>}
            {title && <h2 className="overlay-h">{title}</h2>}
            {subtitle && <div className="overlay-sub">{subtitle}</div>}
          </div>
        )}
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NEWS DETAIL — opens when user clicks a news card
// shows full story + impact analysis + glossary terms used
// ─────────────────────────────────────────────────────────────
function NewsDetail({ news, onClose }) {
  const conv = useConv();
  return (
    <ModalShell onClose={onClose} width={720}
      kicker={`${news.tag} · ${news.source} · ${news.time}`}
      title={news.title}>
      {news.summary && (
        <p className="nd-lead">{news.summary}</p>
      )}
      <div className="nd-body-text">
        <p>市場反應方面，相關標的<strong>{news.related && news.related[0]}</strong>應聲走升，
          帶動類股全面攀高。法人指出，本則消息將持續影響市場至少 1–2 個交易日。</p>
        <p>進一步分析：<GTerm>毛利率</GTerm>維持高檔反映議價能力穩固，
          而<GTerm>資本支出</GTerm>展望上修則暗示供應鏈訂單將延續至 2026 下半年。</p>
        <p>策略上，建議投資人觀察殖利率反應與<GTerm>美元指數</GTerm>是否同步走弱，
          作為下一個進場時機的訊號。</p>
      </div>

      {news.impact && (
        <div className="nd-impact">
          <div className="nd-impact-label">即時影響</div>
          <div className="nd-impact-row">
            <div className="nd-imp-sym">{news.impact.sym}</div>
            <div className="nd-imp-chg" style={{
              color: news.impact.dir > 0 ? conv.upColor : conv.downColor,
            }}>{news.impact.chg}</div>
            <div style={{ flex: 1 }}/>
            <Sparkline seed={101 + news.impact.sym.length} dir={news.impact.dir} w={120} h={32} fill/>
          </div>
        </div>
      )}

      {news.related && (
        <div className="nd-section">
          <div className="nd-section-h">相關標的</div>
          <div className="nd-related">
            {news.related.map(r => (
              <span key={r} className="nd-pill">{r}</span>
            ))}
          </div>
        </div>
      )}

      {news.glossary && (
        <div className="nd-section">
          <div className="nd-section-h">本則用語</div>
          <div className="nd-gl">
            {news.glossary.map(t => (
              <GTerm key={t}>{t}</GTerm>
            ))}
            <span className="nd-gl-hint">點擊查看解釋</span>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// GLOSSARY POPUP — opens for a single term (click ?-icon)
// ─────────────────────────────────────────────────────────────
function GlossaryPopup({ term, onClose, onJump }) {
  const def = DATA.glossary[term];
  // related: pick three other random terms
  const related = Object.keys(DATA.glossary)
    .filter(k => k !== term).slice(0, 6);
  return (
    <ModalShell onClose={onClose} width={520}
      kicker="財經百科 · 名詞解釋" title={term}>
      <p className="gl-def">{def}</p>
      <div className="gl-related">
        <div className="gl-related-h">相關詞彙</div>
        <div className="gl-related-chips">
          {related.map(r => (
            <button key={r} className="gl-chip" onClick={() => onJump(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="gl-foot">
        <button className="ghost-btn" onClick={onClose}>知道了</button>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// GLOSSARY INDEX — full A→Z browser
// ─────────────────────────────────────────────────────────────
function GlossaryIndex({ onClose, onPick }) {
  const [q, setQ] = useStateM('');
  const all = Object.entries(DATA.glossary);
  const filtered = q
    ? all.filter(([k, v]) => k.toLowerCase().includes(q.toLowerCase()) || v.includes(q))
    : all;
  return (
    <ModalShell onClose={onClose} width={720}
      kicker="LEARN" title="財經百科 · 名詞索引"
      subtitle="點擊任一詞彙查看完整解釋；也可在新聞中直接點擊有 ? 標記的詞。">
      <div className="gi-search">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="搜尋名詞…"/>
        <span className="gi-count">{filtered.length} 個結果</span>
      </div>
      <div className="gi-list">
        {filtered.map(([term, def]) => (
          <button key={term} className="gi-item" onClick={() => onPick(term)}>
            <span className="gi-term">{term}</span>
            <span className="gi-def">{def}</span>
          </button>
        ))}
        {filtered.length === 0 && <div className="gi-empty">找不到相關詞彙</div>}
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// SYMBOL DETAIL — opens when clicking a market row / watchlist item
// ─────────────────────────────────────────────────────────────
function SymbolDetail({ item, onClose, onAddWatch, inWatchlist }) {
  const conv = useConv();
  const [tf, setTf] = useStateM('1M');
  return (
    <ModalShell onClose={onClose} width={760}>
      <div className="sd-head">
        <div>
          {item.region && <RegionTag code={item.region}/>}
          <h2 className="sd-name">{item.name}</h2>
          <div className="sd-sym">{item.sym}</div>
        </div>
        <div className="sd-pricing">
          <div className="sd-price">{item.val}</div>
          <div style={{
            color: item.chg > 0 ? conv.upColor : item.chg < 0 ? conv.downColor : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14,
          }}>
            {item.chg > 0 ? '+' : ''}{item.chg.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="sd-tfs">
        {['1D','5D','1M','3M','6M','1Y','YTD','5Y','MAX'].map(t => (
          <button key={t} className={`tfbtn ${tf === t ? 'active' : ''}`}
            onClick={() => setTf(t)}>{t}</button>
        ))}
      </div>
      <BigChart seed={item.seed || 7} dir={item.chg >= 0 ? 1 : -1} height={240}/>
      <div className="sd-stats">
        <div className="sd-stat"><span>開盤</span><strong>{item.val}</strong></div>
        <div className="sd-stat"><span>區間</span><strong>{item.val} ~ {item.val}</strong></div>
        <div className="sd-stat"><span>52週高</span><strong>{item.val}</strong></div>
        <div className="sd-stat"><span>52週低</span><strong>{item.val}</strong></div>
        <div className="sd-stat"><span>成交量</span><strong>2.34M</strong></div>
        <div className="sd-stat"><span>本益比</span><strong>24.1</strong></div>
      </div>
      <div className="sd-actions">
        <button className="primary-btn"
          onClick={() => { onAddWatch(item); onClose(); }}
          disabled={inWatchlist}>
          {inWatchlist ? '✓ 已在自選清單' : '＋ 加入自選'}
        </button>
        <button className="ghost-btn">查看新聞</button>
        <button className="ghost-btn">設定提醒</button>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD WATCH — manual entry
// ─────────────────────────────────────────────────────────────
function AddWatchModal({ onClose, onAdd }) {
  const [sym, setSym] = useStateM('');
  const [name, setName] = useStateM('');
  const submit = () => {
    if (!sym) return;
    onAdd({
      sym: sym.toUpperCase(),
      name: name || sym.toUpperCase(),
      val: (100 + Math.random() * 400).toFixed(2),
      chg: +(((Math.random() - 0.4) * 4)).toFixed(2),
      seed: 200 + Math.floor(Math.random() * 200),
    });
    onClose();
  };
  const QUICK = ['2317.TW', '2454.TW', '0050.TW', 'MSFT', 'META', 'AMD'];
  return (
    <ModalShell onClose={onClose} width={460}
      kicker="新增" title="加入自選清單"
      subtitle="輸入股票代碼或從常見熱門中選擇。">
      <div className="aw-form">
        <label>
          <span>代碼</span>
          <input value={sym} onChange={e => setSym(e.target.value)}
            placeholder="如 AAPL、2330.TW、BTC-USD" autoFocus
            onKeyDown={e => e.key === 'Enter' && submit()}/>
        </label>
        <label>
          <span>顯示名稱 <em>（選填）</em></span>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="自動沿用代碼"/>
        </label>
      </div>
      <div className="aw-quick">
        <div className="aw-quick-h">熱門搜尋</div>
        <div className="aw-quick-chips">
          {QUICK.map(s => (
            <button key={s} className="aw-chip" onClick={() => setSym(s)}>{s}</button>
          ))}
        </div>
      </div>
      <div className="aw-actions">
        <button className="ghost-btn" onClick={onClose}>取消</button>
        <button className="primary-btn" onClick={submit} disabled={!sym}>新增</button>
      </div>
    </ModalShell>
  );
}

Object.assign(window, {
  ModalShell, NewsDetail, GlossaryPopup, GlossaryIndex, SymbolDetail, AddWatchModal,
  SettingsModal,
});
