/* global React, DATA, Num, ChangeBadge, Sparkline, BigChart, GTerm,
   useConv, RegionTag, SectionTitle, seedRand, makeSeries */

// ─────────────────────────────────────────────────────────────
// SYMBOL PAGE — full-screen takeover of the main scroll area.
// Opens when the user clicks any market row, pulse chip,
// watchlist item, or matrix cell.  Designed to feel like a
// terminal "company page" — dense, calm, lots of numbers.
// ─────────────────────────────────────────────────────────────
const { useState: useStateP, useMemo: useMemoP, useContext: useContextP } = React;

// ── classify the row so the page can adapt sections ─────────
function classify(item) {
  const s = item.sym || '';
  if (/USD|EUR|JPY|GBP|TWD|HKD|CNY|AUD|DXY/.test(s) && /\//.test(s) || s === 'DXY') return 'forex';
  if (/^US\d|^JP\d|^DE\d|^TW\d/.test(s)) return 'bond';
  if (['CL','BZ','GC','SI','HG','NG','ZC','CT'].includes(s)) return 'commod';
  if (['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX'].includes(s) || /-USD$/.test(s)) return 'crypto';
  if (['SPX','NDX','DJI','TWII','HSI','N225','000300','KOSPI','SX5E','FTSE','DAX','BVSP'].includes(s)) return 'index';
  return 'stock';
}

// ── mock-data synthesizer (deterministic from item.seed) ────
function synth(item) {
  const r = seedRand((item.seed || 7) * 11);
  const val = parseFloat(String(item.val).replace(/,/g, '')) || 100;
  const prev = val - val * item.chg / 100;
  const open = prev + (r() - 0.5) * val * 0.005;
  const high = Math.max(val, open) * (1 + r() * 0.014);
  const low  = Math.min(val, open) * (1 - r() * 0.012);
  const vol  = Math.floor((r() * 60 + 8)) ;
  const range = ((high - low) / prev * 100);
  // 52w
  const hi52 = val * (1 + r() * 0.32);
  const lo52 = val * (1 - r() * 0.28);
  const rangePos = (val - lo52) / (hi52 - lo52);
  // history returns
  const hist = ['1週','1月','3月','6月','YTD','1年','3年','5年'].map((p, i) => ({
    p,
    pct: +((r() - 0.42) * (i + 1) * 4.5).toFixed(2),
  }));
  // peers (5 fake)
  const peers = ['ABC','XYZ','MNO','QRS','TUV'].map((p, i) => ({
    sym: p, name: `${p} Inc.`,
    val: (val * (0.4 + r())).toFixed(2),
    chg: +((r() - 0.45) * 4).toFixed(2),
    pe: +(8 + r() * 35).toFixed(1),
    seed: (item.seed || 7) * 7 + i,
  }));
  // technical
  const rsi = Math.floor(20 + r() * 60);
  const macd = +((r() - 0.45) * 2).toFixed(2);
  const k = Math.floor(15 + r() * 70);
  const d = Math.floor(20 + r() * 65);
  // chips (institutional)
  const chips = [
    { who: '外資',   d1: Math.floor((r()-0.4)*5000), d5: Math.floor((r()-0.4)*22000), mtd: Math.floor((r()-0.4)*84000) },
    { who: '投信',   d1: Math.floor((r()-0.5)*800),  d5: Math.floor((r()-0.5)*3600),  mtd: Math.floor((r()-0.5)*12000) },
    { who: '自營商', d1: Math.floor((r()-0.5)*1200), d5: Math.floor((r()-0.5)*5200),  mtd: Math.floor((r()-0.5)*18000) },
  ];
  // quarterly EPS / revenue
  const quarters = ['24Q2','24Q3','24Q4','25Q1','25Q2','25Q3','25Q4','26Q1'];
  const eps = quarters.map((q, i) => +((1.2 + r() * 2 + i * 0.1) * (1 + (r() - 0.5) * 0.2)).toFixed(2));
  const rev = quarters.map((q, i) => Math.floor(420 + r() * 180 + i * 24));
  const margin = quarters.map(() => +(38 + r() * 14).toFixed(1));
  return { val, prev, open, high, low, vol, range, hi52, lo52, rangePos,
           hist, peers, rsi, macd, k, d, chips, quarters, eps, rev, margin };
}

// ── micro: stat tile used in header rail ────────────────────
function StatTile({ label, value, sub }) {
  return (
    <div className="sp-stat">
      <div className="sp-stat-lbl">{label}</div>
      <div className="sp-stat-val">{value}</div>
      {sub && <div className="sp-stat-sub">{sub}</div>}
    </div>
  );
}

// ── micro: card wrapper ─────────────────────────────────────
function SPCard({ kicker, title, action, children, pad = true }) {
  return (
    <section className="sp-card">
      {(kicker || title) && (
        <header className="sp-card-h">
          {kicker && <span className="sp-kicker">{kicker}</span>}
          <span className="sp-card-title">{title}</span>
          <div style={{ flex: 1 }}/>
          {action}
        </header>
      )}
      <div className={`sp-card-b ${pad ? '' : 'np'}`}>{children}</div>
    </section>
  );
}

// ── micro: gauge bar (0–100) ────────────────────────────────
function GaugeBar({ value, min = 0, max = 100, zones }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <div className="sp-gauge">
      <div className="sp-gauge-track">
        {zones && zones.map((z, i) => (
          <div key={i} className="sp-gauge-zone"
            style={{ left: `${z.from}%`, width: `${z.to - z.from}%`, background: z.color }}/>
        ))}
        <div className="sp-gauge-fill" style={{ width: `${pct * 100}%` }}/>
        <div className="sp-gauge-thumb" style={{ left: `${pct * 100}%` }}/>
      </div>
      <div className="sp-gauge-scale">
        <span>{min}</span><span>{Math.round((min + max) / 2)}</span><span>{max}</span>
      </div>
    </div>
  );
}

// ── micro: range slider showing today's range inside 52w ────
function RangeRow({ label, lo, hi, val }) {
  const pct = Math.max(0, Math.min(1, (val - lo) / (hi - lo)));
  return (
    <div className="sp-range">
      <div className="sp-range-h">
        <span className="sp-range-lbl">{label}</span>
        <span className="sp-range-pct">{(pct * 100).toFixed(0)}%</span>
      </div>
      <div className="sp-range-bar">
        <div className="sp-range-thumb" style={{ left: `${pct * 100}%` }}/>
      </div>
      <div className="sp-range-foot">
        <span>{typeof lo === 'number' ? lo.toFixed(2) : lo}</span>
        <span>{typeof hi === 'number' ? hi.toFixed(2) : hi}</span>
      </div>
    </div>
  );
}

// ── bar chart for quarterly financials ──────────────────────
function MiniBars({ data, labels, color = 'var(--accent)', fmt = (v) => v }) {
  const max = Math.max(...data) * 1.15;
  return (
    <div className="sp-bars">
      {data.map((v, i) => (
        <div key={i} className="sp-bar-col">
          <div className="sp-bar-val">{fmt(v)}</div>
          <div className="sp-bar-track">
            <div className="sp-bar-fill"
              style={{ height: `${(v / max) * 100}%`, background: color }}/>
          </div>
          <div className="sp-bar-lbl">{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

// ── BIG: symbol page itself ─────────────────────────────────
function SymbolPage({ item, onClose, onAddWatch, inWatchlist, onOpenSymbol, onOpenNews }) {
  const conv = useConv();
  const [tf, setTf] = useStateP('3M');
  const [chartType, setChartType] = useStateP(conv.chartType);
  const kind = classify(item);
  const d = useMemoP(() => synth(item), [item]);
  const isStock = kind === 'stock';

  // related news (match by sym fuzzy)
  const news = DATA.news.filter(n => n.related?.some(r =>
    r.includes(item.sym) || item.sym.includes(r)
  )).slice(0, 4);

  return (
    <div className="sp-page">
      {/* ── HEADER STRIP ─────────────────────────────────── */}
      <header className="sp-head">
        <button className="sp-back" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>返回脈動</span>
        </button>

        <div className="sp-head-mid">
          <div className="sp-id">
            {item.region && <RegionTag code={item.region}/>}
            <span className="sp-sym">{item.sym}</span>
            <span className="sp-name">{item.name}</span>
            <span className="sp-exch">
              {kind === 'stock' ? (item.sym.includes('.TW') ? '臺灣證券交易所' : 'NASDAQ Global Select') :
               kind === 'index'  ? '指數' :
               kind === 'forex'  ? '即期匯率 · ICE' :
               kind === 'commod' ? '期貨 · NYMEX/CME' :
               kind === 'bond'   ? '政府公債' :
               kind === 'crypto' ? '加密貨幣 · 全球綜合' : ''}
            </span>
          </div>
          <div className="sp-meta">
            <span className="sp-live">
              <i className="sp-live-dot"/> 即時 · 14:32:08 GMT+8
            </span>
            <span className="sp-meta-sep">·</span>
            <span>更新延遲 &lt; 200ms</span>
            <span className="sp-meta-sep">·</span>
            <span>本日已成交 {d.vol.toFixed(1)}M 股</span>
          </div>
        </div>

        <div className="sp-head-r">
          <div className="sp-price-wrap">
            <div className="sp-price">{item.val}</div>
            <div className="sp-chg" style={{
              color: item.chg > 0 ? conv.upColor : item.chg < 0 ? conv.downColor : 'var(--text-muted)',
            }}>
              {item.chg > 0 ? '+' : ''}{(item.val * item.chg / 100).toFixed(2)} ·
              <strong> {item.chg > 0 ? '+' : ''}{item.chg.toFixed(2)}%</strong>
            </div>
          </div>
          <div className="sp-act">
            <button className="primary-btn"
              onClick={() => onAddWatch(item)}
              disabled={inWatchlist}>
              {inWatchlist ? '✓ 已自選' : '＋ 加入自選'}
            </button>
            <button className="ghost-btn">設定提醒</button>
            <button className="ghost-btn" title="分享">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── SCROLL ────────────────────────────────────────── */}
      <div className="sp-scroll">

        {/* HERO CHART CARD */}
        <SPCard kicker="LIVE" title="即時走勢" pad={false}
          action={
            <div className="sp-chart-tools">
              <div className="sp-tf">
                {['1D','5D','1M','3M','6M','YTD','1Y','5Y','MAX'].map(p => (
                  <button key={p} className={`sp-tf-btn ${tf === p ? 'on' : ''}`}
                    onClick={() => setTf(p)}>{p}</button>
                ))}
              </div>
              <div className="sp-ct">
                {[
                  { v: 'line',   l: '折線' },
                  { v: 'area',   l: '面積' },
                  { v: 'candle', l: 'K' },
                ].map(o => (
                  <button key={o.v} className={`sp-ct-btn ${chartType === o.v ? 'on' : ''}`}
                    onClick={() => setChartType(o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
          }>
          <div className="sp-quickstat">
            <StatTile label="開盤" value={d.open.toFixed(2)}/>
            <StatTile label="最高" value={d.high.toFixed(2)}/>
            <StatTile label="最低" value={d.low.toFixed(2)}/>
            <StatTile label="前收" value={d.prev.toFixed(2)}/>
            <StatTile label="成交量" value={`${d.vol.toFixed(1)}M`}/>
            <StatTile label="振幅" value={`${d.range.toFixed(2)}%`}/>
            <StatTile label="均價" value={((d.high + d.low + parseFloat(item.val)) / 3).toFixed(2)}/>
            <StatTile label="VWAP" value={(parseFloat(item.val) * 0.998).toFixed(2)}/>
          </div>
          <div style={{ padding: '8px 16px 16px' }}>
            <BigChart seed={item.seed || 7}
              dir={item.chg >= 0 ? 1 : -1}
              height={300} kind={chartType}/>
          </div>
        </SPCard>

        {/* 2-COLUMN BODY */}
        <div className="sp-grid">
          <div className="sp-col">
            {/* TECHNICAL */}
            <SPCard kicker="TECH" title="技術指標"
              action={<span className="sp-card-aux">日線 · 14 日</span>}>
              <div className="sp-tech">
                <div className="sp-tech-row">
                  <div className="sp-tech-l">
                    <div className="sp-tech-name"><GTerm>RSI</GTerm></div>
                    <div className="sp-tech-tag" style={{
                      color: d.rsi > 70 ? conv.downColor : d.rsi < 30 ? conv.upColor : 'var(--text-muted)',
                    }}>
                      {d.rsi > 70 ? '超買' : d.rsi < 30 ? '超賣' : '中性'}
                    </div>
                  </div>
                  <div className="sp-tech-r">
                    <div className="sp-tech-val">{d.rsi}</div>
                    <GaugeBar value={d.rsi} zones={[
                      { from: 0, to: 30, color: 'color-mix(in srgb, var(--green) 25%, transparent)' },
                      { from: 70, to: 100, color: 'color-mix(in srgb, var(--red) 25%, transparent)' },
                    ]}/>
                  </div>
                </div>

                <div className="sp-tech-row">
                  <div className="sp-tech-l">
                    <div className="sp-tech-name">MACD</div>
                    <div className="sp-tech-tag" style={{
                      color: d.macd > 0 ? conv.upColor : conv.downColor,
                    }}>{d.macd > 0 ? '黃金交叉' : '死亡交叉'}</div>
                  </div>
                  <div className="sp-tech-r">
                    <div className="sp-tech-val">{d.macd > 0 ? '+' : ''}{d.macd.toFixed(2)}</div>
                    <GaugeBar value={d.macd} min={-2} max={2}/>
                  </div>
                </div>

                <div className="sp-tech-row">
                  <div className="sp-tech-l">
                    <div className="sp-tech-name">KD</div>
                    <div className="sp-tech-tag">
                      K {d.k} · D {d.d}
                    </div>
                  </div>
                  <div className="sp-tech-r">
                    <div className="sp-tech-val">
                      {d.k > d.d ? '↗' : '↘'} {d.k > 80 ? '高檔' : d.k < 20 ? '低檔' : '中性'}
                    </div>
                    <GaugeBar value={d.k}/>
                  </div>
                </div>

                <div className="sp-ma">
                  {[
                    { p: '5MA',   val: parseFloat(item.val) * (1 - 0.012), above: item.chg > 0 },
                    { p: '20MA',  val: parseFloat(item.val) * (1 - 0.028), above: item.chg > 0.5 },
                    { p: '60MA',  val: parseFloat(item.val) * (1 - 0.052), above: item.chg > -1 },
                    { p: '120MA', val: parseFloat(item.val) * (1 - 0.084), above: item.chg > -2 },
                    { p: '240MA', val: parseFloat(item.val) * (1 - 0.114), above: true },
                  ].map(m => (
                    <div key={m.p} className="sp-ma-pill">
                      <span className="sp-ma-p">{m.p}</span>
                      <span className="sp-ma-v">{m.val.toFixed(2)}</span>
                      <span className="sp-ma-state" style={{
                        color: m.above ? conv.upColor : conv.downColor,
                      }}>{m.above ? '上' : '下'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SPCard>

            {/* CHIPS — only for stocks / index */}
            {(isStock || kind === 'index') && (
              <SPCard kicker="CHIPS" title="籌碼面 · 三大法人買賣超"
                action={<span className="sp-card-aux">單位：張</span>}>
                <table className="sp-chips">
                  <thead>
                    <tr>
                      <th>法人</th><th>本日</th><th>5 日</th><th>本月累計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.chips.map(c => (
                      <tr key={c.who}>
                        <td className="sp-chips-who">{c.who}</td>
                        {[c.d1, c.d5, c.mtd].map((v, i) => (
                          <td key={i} className="sp-chips-num" style={{
                            color: v > 0 ? conv.upColor : v < 0 ? conv.downColor : 'var(--text-muted)',
                          }}>
                            {v > 0 ? '+' : ''}{v.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SPCard>
            )}

            {/* FUNDAMENTALS — stocks only */}
            {isStock && (
              <SPCard kicker="FUND" title="基本面 · 季度財報">
                <div className="sp-fund">
                  <div className="sp-fund-block">
                    <div className="sp-fund-h">
                      <span>每股盈餘 EPS</span>
                      <span className="sp-fund-h-r">最新 ${d.eps[d.eps.length - 1]}</span>
                    </div>
                    <MiniBars data={d.eps} labels={d.quarters}
                      color={conv.upColor}
                      fmt={v => v.toFixed(2)}/>
                  </div>
                  <div className="sp-fund-block">
                    <div className="sp-fund-h">
                      <span>營收（億）</span>
                      <span className="sp-fund-h-r">YoY +{((d.rev[7] / d.rev[3] - 1) * 100).toFixed(1)}%</span>
                    </div>
                    <MiniBars data={d.rev} labels={d.quarters}
                      color="var(--accent)"
                      fmt={v => v}/>
                  </div>
                  <div className="sp-fund-block">
                    <div className="sp-fund-h">
                      <span><GTerm>毛利率</GTerm>（%）</span>
                      <span className="sp-fund-h-r">近 8 季均 {(d.margin.reduce((a,b)=>a+b)/8).toFixed(1)}%</span>
                    </div>
                    <MiniBars data={d.margin} labels={d.quarters}
                      color="#2dd4bf"
                      fmt={v => v.toFixed(0) + '%'}/>
                  </div>
                </div>
              </SPCard>
            )}

            {/* HISTORY RETURNS */}
            <SPCard kicker="PERF" title="歷史報酬"
              action={<span className="sp-card-aux">含現金股利</span>}>
              <div className="sp-perf">
                {d.hist.map(h => (
                  <div key={h.p} className="sp-perf-cell">
                    <div className="sp-perf-p">{h.p}</div>
                    <div className="sp-perf-v" style={{
                      color: h.pct > 0 ? conv.upColor : h.pct < 0 ? conv.downColor : 'var(--text-muted)',
                    }}>
                      {h.pct > 0 ? '+' : ''}{h.pct.toFixed(2)}%
                    </div>
                    <div className="sp-perf-bar">
                      <div className="sp-perf-bar-fill" style={{
                        width: `${Math.min(60, Math.abs(h.pct))}%`,
                        background: h.pct > 0 ? conv.upColor : conv.downColor,
                        marginLeft: h.pct < 0 ? `${50 - Math.min(50, Math.abs(h.pct))}%` : '50%',
                      }}/>
                      <div className="sp-perf-bar-axis"/>
                    </div>
                  </div>
                ))}
              </div>
            </SPCard>
          </div>

          {/* RIGHT COLUMN ────────────────────────────────── */}
          <div className="sp-col">
            {/* Quote ladder */}
            <SPCard kicker="QUOTE" title="即時報價">
              <div className="sp-quote">
                <div className="sp-quote-pair">
                  <div className="sp-quote-side">
                    <div className="sp-quote-label">買價</div>
                    <div className="sp-quote-val" style={{ color: conv.upColor }}>
                      {(d.val - 0.01).toFixed(2)}
                    </div>
                    <div className="sp-quote-sub">{Math.floor(d.vol * 8)} 張</div>
                  </div>
                  <div className="sp-quote-side">
                    <div className="sp-quote-label">賣價</div>
                    <div className="sp-quote-val" style={{ color: conv.downColor }}>
                      {(d.val + 0.01).toFixed(2)}
                    </div>
                    <div className="sp-quote-sub">{Math.floor(d.vol * 6)} 張</div>
                  </div>
                </div>

                <RangeRow label="本日區間" lo={d.low} hi={d.high} val={d.val}/>
                <RangeRow label="52 週區間" lo={d.lo52} hi={d.hi52} val={d.val}/>
              </div>
            </SPCard>

            {/* Key stats */}
            <SPCard kicker="STATS" title="關鍵統計">
              <dl className="sp-kv">
                {[
                  ['市值',          isStock ? `${(d.val * 0.012).toFixed(2)}T USD` : '—'],
                  ['本益比 P/E',    isStock ? (12 + (d.rsi % 20)).toFixed(1) : '—'],
                  ['股價淨值比 P/B', isStock ? (1.2 + (d.k % 6) * 0.4).toFixed(2) : '—'],
                  ['股息殖利率',     isStock ? `${(0.8 + (d.d % 4)).toFixed(2)}%` : '—'],
                  ['Beta',          (0.6 + d.rsi / 100).toFixed(2)],
                  ['週轉率',         `${(d.vol / 200).toFixed(2)}%`],
                  ['本益成長比 PEG', isStock ? (0.8 + d.macd).toFixed(2) : '—'],
                  ['流動股數',       isStock ? `${(d.vol * 280).toFixed(0)}M` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="sp-kv-row">
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </SPCard>

            {/* Peer comparison — stocks only */}
            {isStock && (
              <SPCard kicker="PEERS" title="同業比較"
                action={<button className="sp-card-aux as-link">完整列表 →</button>}>
                <div className="sp-peers">
                  {d.peers.map(p => (
                    <button key={p.sym} className="sp-peer"
                      onClick={() => onOpenSymbol(p)}>
                      <div className="sp-peer-l">
                        <div className="sp-peer-sym">{p.sym}</div>
                        <div className="sp-peer-name">{p.name}</div>
                      </div>
                      <Sparkline seed={p.seed} dir={p.chg >= 0 ? 1 : -1}
                        w={64} h={20} fill/>
                      <div className="sp-peer-r">
                        <div className="sp-peer-val">{p.val}</div>
                        <div className="sp-peer-chg" style={{
                          color: p.chg > 0 ? conv.upColor : conv.downColor,
                        }}>
                          {p.chg > 0 ? '+' : ''}{p.chg.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </SPCard>
            )}

            {/* Related news */}
            <SPCard kicker="NEWS" title="相關新聞"
              action={<span className="sp-card-aux">{news.length} 則</span>}>
              {news.length === 0 ? (
                <div className="sp-empty">尚無相關新聞</div>
              ) : (
                <div className="sp-news">
                  {news.map(n => (
                    <button key={n.id} className="sp-news-row"
                      onClick={() => onOpenNews(n)}>
                      <div className="sp-news-tag">{n.tag}</div>
                      <div className="sp-news-title">{n.title}</div>
                      <div className="sp-news-meta">
                        <span>{n.source}</span>
                        <span>·</span>
                        <span>{n.time}</span>
                        {n.impact && (
                          <>
                            <span>·</span>
                            <span style={{
                              color: n.impact.dir > 0 ? conv.upColor : conv.downColor,
                            }}>{n.impact.sym} {n.impact.chg}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SPCard>
          </div>
        </div>

        {/* COMPANY PROFILE — stocks only */}
        {isStock && (
          <SPCard kicker="ABOUT" title="公司簡介">
            <div className="sp-about">
              <p className="sp-about-text">
                {item.name}（{item.sym}）為一家在{item.sym.includes('.TW') ? '臺灣' : '美國'}上市的公司，
                主要從事相關產業之研發、製造與銷售。公司近年積極布局
                <GTerm>主權 AI</GTerm>、雲端與高效能運算領域，
                並透過策略性<GTerm>資本支出</GTerm>擴張產能。
                最新季報顯示<GTerm>毛利率</GTerm>維持高檔水位，
                法人對公司未來 12 個月展望持中性偏多看法。
              </p>
              <dl className="sp-about-meta">
                <div><dt>產業</dt><dd>半導體 / 系統整合</dd></div>
                <div><dt>類股</dt><dd>科技 · 大型權值</dd></div>
                <div><dt>上市日</dt><dd>1997.09.05</dd></div>
                <div><dt>員工數</dt><dd>76,478</dd></div>
                <div><dt>總部</dt><dd>{item.sym.includes('.TW') ? '台灣新竹' : 'California, USA'}</dd></div>
                <div><dt>CEO</dt><dd>Anonymous, M.D.</dd></div>
                <div><dt>下次財報</dt><dd>2026.07.18</dd></div>
                <div><dt>股東會</dt><dd>2026.06.05</dd></div>
              </dl>
            </div>
          </SPCard>
        )}

        <div className="sp-bottom">
          資料來源：Yahoo Finance · cnyes ·
          <strong style={{ color: 'var(--text)', margin: '0 4px' }}>僅供參考，不構成投資建議</strong>
          · 顯示資訊可能延遲 15 分鐘
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SymbolPage });
