/* global React, DATA, ChangeBadge, GTerm, SectionTitle, useConv, Sparkline */

// ─────────────────────────────────────────────────────────────
// NEWS FEED — feed-first, large hero card + stack of cards
// Click → opens news detail overlay (story + impact + glossary)
// ─────────────────────────────────────────────────────────────
function NewsFeed({ onOpen, filter = 'all' }) {
  const { news } = DATA;
  const [tab, setTab] = React.useState(filter);
  const tabs = [
  { id: 'all', label: '全部' },
  { id: '頭條', label: '頭條' },
  { id: '央行', label: '央行' },
  { id: '匯市', label: '匯市' },
  { id: '科技', label: '科技' },
  { id: '加密', label: '加密' }];

  const filtered = tab === 'all' ? news : news.filter((n) => n.tag === tab);

  return (
    <section className="newsfeed panel">
      <div className="nf-head">
        <SectionTitle kicker="LIVE" label="今日新聞動態" count={filtered.length}
        action={
        <div className="nf-tabs">
              {tabs.map((t) =>
          <button key={t.id}
          className={`nf-tab ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
          )}
            </div>
        } />
      </div>
      <div className="nf-body">
        {filtered.map((n, i) =>
        <article key={n.id}
        className={`ncard tier-${n.tier} ${i === 0 && n.tier === 'hero' ? 'first' : ''}`}
        onClick={() => onOpen(n)}>
            <div className="ncard-meta">
              <span className={`ntag ntag-${n.tag}`}>{n.tag}</span>
              <span className="nsrc">{n.source}</span>
              <span className="ndot">·</span>
              <span className="ntime">{n.time}</span>
              {n.impact &&
            <>
                  <span className="ndot">·</span>
                  <span className="nimpact">
                    影響 <strong>{n.impact.sym}</strong>{' '}
                    <span style={{
                  color: n.impact.dir > 0 ? 'var(--green)' : 'var(--red)',
                  fontFamily: 'var(--font-mono)', fontWeight: 600
                }}>{n.impact.chg}</span>
                  </span>
                </>
            }
            </div>
            <h3 className="ncard-h">{n.title}</h3>
            {n.summary && <p className="ncard-sum">{n.summary}</p>}
            {n.related &&
          <div className="ncard-rel">
                {n.related.map((r) => <span key={r} className="rel-tag">{r}</span>)}
                <div style={{ flex: 1 }} />
                <span className="ncard-go">展開 →</span>
              </div>
          }
          </article>
        )}
      </div>
    </section>);

}

// ─────────────────────────────────────────────────────────────
// ECONOMIC CALENDAR — this week
// ─────────────────────────────────────────────────────────────
function Calendar() {
  const { calendar } = DATA;
  const byDate = {};
  calendar.forEach((c) => {(byDate[c.date] = byDate[c.date] || []).push(c);});
  const impColor = (i) => i === 3 ? 'var(--red)' : i === 2 ? 'var(--amber)' : 'var(--text-muted)';

  return (
    <section className="cal panel">
      <SectionTitle kicker="CALENDAR" label="本週經濟日曆" count={calendar.length}
      action={<button className="ghost-btn">全部 →</button>} />
      <div className="cal-body">
        {Object.entries(byDate).map(([date, items]) =>
        <div key={date} className="cal-group">
            <div className="cal-date">
              <span className="cd-num">{date}</span>
              <span className="cd-day">週{items[0].day}</span>
            </div>
            <div className="cal-items">
              {items.map((c, i) =>
            <div key={i} className="cal-row">
                  <span className="cal-time">{c.time}</span>
                  <span className="cal-flag">
                    <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: impColor(c.imp), display: 'inline-block'
                }} />
                    {c.region}
                  </span>
                  <span className="cal-evt">{c.evt}</span>
                  <span className="cal-prev"><em>前值</em> {c.prev}</span>
                  <span className="cal-est"><em>預期</em> {c.est}</span>
                </div>
            )}
            </div>
          </div>
        )}
      </div>
    </section>);

}

// ─────────────────────────────────────────────────────────────
// SENTIMENT — VIX / Fear & Greed / advance-decline / put-call
// ─────────────────────────────────────────────────────────────
function SentimentBar() {
  const { sentiment } = DATA;
  const conv = useConv();
  const s = sentiment;

  // adv/dec bar
  const total = s.advDec.adv + s.advDec.dec + s.advDec.unch;
  const advPct = s.advDec.adv / total * 100;
  const decPct = s.advDec.dec / total * 100;

  // F&G arc — 0 to 100 → arc 0° to 270°
  const fgAngle = s.fearGreed.val / 100 * 270 - 135;

  return (
    <section className="senti panel">
      <SectionTitle kicker="SENTIMENT" label="市場情緒" />
      <div className="senti-body">
        {/* Fear & Greed gauge */}
        <div className="s-card s-card-fg">
          <div className="s-label"><GTerm>恐慌貪婪指數</GTerm></div>
          <div className="fg-gauge">
            <svg viewBox="-60 -55 120 95" width="120" height="95">
              {[0, 25, 50, 75, 100].map((p, i) => {
                const a = p / 100 * 270 - 225;
                const x1 = 48 * Math.cos(a * Math.PI / 180);
                const y1 = 48 * Math.sin(a * Math.PI / 180);
                const x2 = 56 * Math.cos(a * Math.PI / 180);
                const y2 = 56 * Math.sin(a * Math.PI / 180);
                const color = p < 25 ? 'var(--red)' : p < 50 ? '#f59e0b' : p < 75 ? '#facc15' : 'var(--green)';
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color} strokeWidth="3" strokeLinecap="round" />;
              })}
              {/* arc */}
              <path d="M -42 -20 A 47 47 0 1 1 42 -20"
              stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="round" />
              {/* needle */}
              <line x1="0" y1="0"
              x2={42 * Math.cos((fgAngle - 90) * Math.PI / 180)}
              y2={42 * Math.sin((fgAngle - 90) * Math.PI / 180)}
              stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="0" cy="0" r="4" fill="var(--text)" />
            </svg>
            <div className="fg-val">
              <span className="fg-num">{s.fearGreed.val}</span>
              <span className="fg-tx">{s.fearGreed.text}</span>
            </div>
          </div>
        </div>

        {/* VIX */}
        <div className="s-card">
          <div className="s-label"><GTerm>波動率指數</GTerm> · VIX</div>
          <div className="s-val">
            {s.vix.val}
            <span className="s-chg" style={{ color: conv.downColor }}>
              {s.vix.chg > 0 ? '+' : '−'}{Math.abs(s.vix.chg).toFixed(2)}
            </span>
          </div>
          <div className="s-sub">市場處於 <em>{s.vix.state}</em> 波動區間</div>
        </div>

        {/* Advance / Decline */}
        <div className="s-card s-card-wide">
          <div className="s-label"><GTerm>漲跌家數</GTerm></div>
          <div className="ad-row">
            <span style={{ color: conv.upColor, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ▲ {s.advDec.adv}
            </span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              · {s.advDec.unch}
            </span>
            <span style={{ color: conv.downColor, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ▼ {s.advDec.dec}
            </span>
          </div>
          <div className="ad-bar">
            <span style={{ width: `${advPct}%`, background: conv.upColor }} />
            <span style={{ width: `${100 - advPct - decPct}%`, background: 'var(--text-muted)' }} />
            <span style={{ width: `${decPct}%`, background: conv.downColor }} />
          </div>
          <div className="s-sub">新高 <em style={{ color: conv.upColor }}>{s.highsLows.newHigh}</em> · 新低 <em style={{ color: conv.downColor }}>{s.highsLows.newLow}</em></div>
        </div>

        {/* Put/Call */}
        <div className="s-card">
          <div className="s-label"><GTerm>Put/Call 比</GTerm></div>
          <div className="s-val">
            {s.putCall.val}
            <span className="s-chg" style={{ color: conv.upColor }}>
              {s.putCall.chg > 0 ? '+' : '−'}{Math.abs(s.putCall.chg).toFixed(2)}
            </span>
          </div>
          <div className="s-sub">避險需求 <em>溫和</em></div>
        </div>

        {/* Breadth */}
        <div className="s-card">
          <div className="s-label"><GTerm>市場廣度</GTerm></div>
          <div className="s-val">{s.breadth.val}<i style={{ fontSize: 16, fontStyle: 'normal' }}>%</i></div>
          <div className="s-sub">個股 <em>高於 200MA</em></div>
        </div>
      </div>
    </section>);

}

// ─────────────────────────────────────────────────────────────
// PORTFOLIO BAND — total / today / pnl + holdings
// ─────────────────────────────────────────────────────────────
function PortfolioBand() {
  const { portfolio } = DATA;
  const conv = useConv();
  return (
    <section className="port panel">
      <SectionTitle kicker="PORTFOLIO" label="我的投資組合"
      action={
      <div style={{ display: 'flex', gap: 6 }}>
            <button className="ghost-btn">交易紀錄</button>
            <button className="ghost-btn">編輯持股</button>
          </div>
      } />
      <div className="port-body">
        <div className="port-stats">
          <div className="pstat">
            <div className="ps-label">總市值</div>
            <div className="ps-big">NT$ {portfolio.totalValue.toLocaleString()}</div>
            <div className="ps-sub">基準幣別 <em>TWD</em></div>
          </div>
          <div className="pstat">
            <div className="ps-label">今日損益</div>
            <div className="ps-big" style={{ color: conv.upColor }}>
              +{portfolio.todayChg.toLocaleString()}
            </div>
            <div className="ps-sub" style={{ color: conv.upColor }}>
              +{portfolio.todayPct.toFixed(2)}%
            </div>
          </div>
          <div className="pstat">
            <div className="ps-label">累計損益</div>
            <div className="ps-big" style={{ color: conv.upColor }}>
              +{portfolio.totalPnL.toLocaleString()}
            </div>
            <div className="ps-sub" style={{ color: conv.upColor }}>
              +{portfolio.totalPnLPct.toFixed(2)}%
            </div>
          </div>
          <div className="pstat pstat-alloc">
            <div className="ps-label">配置</div>
            <div className="alloc-bar">
              {portfolio.holdings.map((h, i) => {
                const colors = ['#3b82f6', '#2dd4bf', '#a78bfa', '#f59e0b', '#ec4899', '#64748b'];
                return <span key={i} style={{ width: `${h.alloc}%`, background: colors[i % colors.length] }} title={`${h.name} ${h.alloc}%`} />;
              })}
            </div>
            <div className="alloc-leg">
              {portfolio.holdings.map((h, i) => {
                const colors = ['#3b82f6', '#2dd4bf', '#a78bfa', '#f59e0b', '#ec4899', '#64748b'];
                return (
                  <span key={i} className="alloc-leg-i">
                    <i style={{ background: colors[i % colors.length] }} />{h.name}
                  </span>);

              })}
            </div>
          </div>
        </div>
        <div className="port-table-wrap">
          <table className="dtable port-table">
            <thead>
              <tr>
                <th className="al">持股</th>
                <th>數量</th>
                <th>均價</th>
                <th>現價</th>
                <th>未實現損益</th>
                <th>配置</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.filter((h) => h.qty != null).map((h) => {
                const cost = h.qty * h.avg;
                const mv = h.qty * h.val;
                const pnl = mv - cost;
                const pct = pnl / cost * 100;
                return (
                  <tr key={h.sym}>
                    <td className="al">
                      <div className="cellname-txt">
                        <span className="t">{h.name}</span>
                        <span className="s">{h.sym}</span>
                      </div>
                    </td>
                    <td className="mono dim">{h.qty}</td>
                    <td className="mono dim">{h.avg.toLocaleString()}</td>
                    <td className="mono">{h.val.toLocaleString()}</td>
                    <td className="mono" style={{ color: pnl >= 0 ? conv.upColor : conv.downColor }}>
                      {pnl >= 0 ? '+' : '−'}{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>
                        ({pct >= 0 ? '+' : '−'}{Math.abs(pct).toFixed(2)}%)
                      </span>
                    </td>
                    <td className="mono dim">{h.alloc.toFixed(1)}%</td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>);

}

Object.assign(window, { NewsFeed, Calendar, SentimentBar, PortfolioBand });