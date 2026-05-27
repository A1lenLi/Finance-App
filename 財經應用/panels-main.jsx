/* global React, DATA, Num, ChangeBadge, Sparkline, BigChart, RegionTag, GTerm, SectionTitle, useConv */

// ─────────────────────────────────────────────────────────────
// HERO — today's narrative (feed-first editorial card)
// ─────────────────────────────────────────────────────────────
function Hero({ onOpenNews }) {
  const { todayStory, news } = DATA;
  const heroNews = news.find(n => n.tier === 'hero');
  const conv = useConv();
  return (
    <section className="hero">
      <div className="hero-l">
        <div className="hero-stamp">
          <span className="hero-date">{todayStory.date}</span>
          <span className="hero-sep">·</span>
          <span className="hero-day">{todayStory.weekday}</span>
          <span className="hero-sep">·</span>
          <span className="hero-time">{todayStory.time} <em>{todayStory.tz}</em></span>
          <span className="hero-sep">·</span>
          <span className="hero-kicker">{todayStory.kicker}</span>
        </div>
        <h1 className="hero-h">
          美科技股創高、<GTerm>FOMC</GTerm>{' '}鴿派轉向期待升溫，
          新台幣強升 <span className="hero-num up">0.4<i>%</i></span>
        </h1>
        <p className="hero-sub">
          輝達 Q1 財報超預期帶動 Nasdaq 收高 <em>1.8%</em>，
          市場押注 6 月<GTerm>降息</GTerm>機率自上週 48% 攀升至 <em>72%</em>；
          <GTerm>美元指數</GTerm>走弱拖累亞幣全面走強，台股早盤一度站上 <em>23,800</em> 點。
        </p>
        <div className="hero-tags">
          {todayStory.tags.map(t => <span key={t} className="hero-tag">#{t}</span>)}
          <button className="hero-cta" onClick={() => heroNews && onOpenNews(heroNews)}>
            完整脈絡 →
          </button>
        </div>
      </div>
      <div className="hero-r">
        <div className="hero-bullets">
          {todayStory.bullets.map((b, i) => (
            <div key={i} className="bullet">
              <div className="b-label">{b.label}</div>
              <div className="b-val">{b.value}</div>
              <div className="b-chg" style={{
                color: b.dir > 0 ? conv.upColor : b.dir < 0 ? conv.downColor : 'var(--text-muted)'
              }}>{b.chg}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// PULSE STRIP — horizontal scrolling ticker of every index
// ─────────────────────────────────────────────────────────────
function PulseStrip({ onSelect }) {
  const { pulseStrip } = DATA;
  const conv = useConv();
  return (
    <section className="pulse">
      <div className="pulse-rail">
        {pulseStrip.map(p => (
          <button key={p.sym} className="pulse-card" onClick={() => onSelect(p)}>
            <div className="pulse-row1">
              <RegionTag code={p.region} />
              <span className="pulse-sym">{p.sym}</span>
            </div>
            <div className="pulse-name">{p.name}</div>
            <div className="pulse-val">{p.val}</div>
            <div className="pulse-bot">
              <Sparkline seed={p.seed} dir={p.chg >= 0 ? 1 : -1} w={64} h={20} fill/>
              <span className="pulse-chg" style={{
                color: p.chg > 0 ? conv.upColor : p.chg < 0 ? conv.downColor : 'var(--text-muted)'
              }}>
                {p.chg > 0 ? '+' : ''}{p.chg.toFixed(2)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// MARKET MATRIX — Indices / Forex / Commodities / Treasuries / Crypto
// One section with tabs, each tab shows a data table + featured chart
// ─────────────────────────────────────────────────────────────
const MATRIX_TABS = [
  { id: 'indices',     label: '全球股市',   data: 'indices',     hasSpark: true,  primary: '指數' },
  { id: 'forex',       label: '外匯匯率',   data: 'forex',       hasSpark: true,  primary: '貨幣' },
  { id: 'commodities', label: '大宗商品',   data: 'commodities', hasSpark: true,  primary: '商品' },
  { id: 'treasuries',  label: '公債殖利率', data: 'treasuries',  hasSpark: false, primary: '殖利率' },
  { id: 'crypto',      label: '加密貨幣',   data: 'crypto',      hasSpark: true,  primary: '幣別' },
];

function MarketMatrix({ onSelect, defaultTab = 'indices' }) {
  const [tab, setTab] = React.useState(defaultTab);
  const [featured, setFeatured] = React.useState(null);
  const conv = useConv();
  const cfg = MATRIX_TABS.find(t => t.id === tab);
  const rows = DATA[cfg.data];
  const feat = featured && featured.tab === tab ? featured.item : rows[0];

  return (
    <section className="matrix panel">
      <div className="matrix-head">
        <SectionTitle kicker="MARKETS" label="市場矩陣" count={rows.length}
          action={
            <div className="matrix-tabs">
              {MATRIX_TABS.map(t => (
                <button key={t.id}
                  className={`mtab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => { setTab(t.id); setFeatured(null); }}>
                  {t.label}
                </button>
              ))}
            </div>
          } />
      </div>
      <div className="matrix-body">
        <div className="matrix-table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th className="al">{cfg.primary}</th>
                {tab === 'crypto' && <th>市值</th>}
                {tab === 'commodities' && <th>單位</th>}
                <th>現價</th>
                <th>漲跌幅</th>
                {cfg.hasSpark && <th>1D 走勢</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.sym}
                    className={feat.sym === r.sym ? 'sel' : ''}
                    onClick={() => setFeatured({ tab, item: r })}>
                  <td className="al">
                    <div className="cellname">
                      {r.region && <RegionTag code={r.region}/>}
                      <div className="cellname-txt">
                        <span className="t">{r.name}</span>
                        <span className="s">{r.sym}</span>
                      </div>
                    </div>
                  </td>
                  {tab === 'crypto' && <td className="mono">{r.mcap}</td>}
                  {tab === 'commodities' && <td className="mono dim">{r.unit}</td>}
                  <td className="mono">{r.val}</td>
                  <td>
                    <span style={{
                      color: r.chg > 0 ? conv.upColor : r.chg < 0 ? conv.downColor : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)', fontWeight: 600,
                    }}>
                      {r.chg > 0 ? '+' : ''}{r.chg.toFixed(2)}%
                    </span>
                  </td>
                  {cfg.hasSpark && (
                    <td className="ar">
                      <Sparkline seed={r.seed} dir={r.chg >= 0 ? 1 : -1} w={70} h={20}/>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="matrix-featured">
          <div className="mf-head">
            {feat.region && <RegionTag code={feat.region}/>}
            <div>
              <div className="mf-name">{feat.name}</div>
              <div className="mf-sym">{feat.sym}</div>
            </div>
            <div className="mf-price">
              <div className="mf-val">{feat.val}</div>
              <div style={{
                color: feat.chg > 0 ? conv.upColor : feat.chg < 0 ? conv.downColor : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
              }}>
                {feat.chg > 0 ? '+' : ''}{feat.chg.toFixed(2)}%
              </div>
            </div>
          </div>
          <BigChart seed={feat.seed} dir={feat.chg >= 0 ? 1 : -1} height={180}/>
          <div className="mf-tfs">
            {['1D','5D','1M','3M','6M','1Y','YTD','5Y'].map((t, i) => (
              <button key={t} className={`tfbtn ${i === 0 ? 'active' : ''}`}>{t}</button>
            ))}
            <div style={{ flex: 1 }}/>
            <button className="mf-detail" onClick={() => onSelect(feat)}>查看完整數據 →</button>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Hero, PulseStrip, MarketMatrix });
