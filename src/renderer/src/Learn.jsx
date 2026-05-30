import { useState } from 'react'

// ── localStorage hook ─────────────────────────────────────────────────────
function useReadSet() {
  const KEY = 'wf-learn-read'
  const [read, setRead] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
  })
  const mark = (id) => setRead(prev => {
    const next = new Set(prev); next.add(id)
    localStorage.setItem(KEY, JSON.stringify([...next]))
    return next
  })
  return [read, mark]
}

// ── Category meta ─────────────────────────────────────────────────────────
const CATS = {
  basics:      { label:'市場基礎', color:'#3b82f6', bg:'rgba(59,130,246,0.12)', icon:'📐' },
  tech:        { label:'技術分析', color:'#a855f7', bg:'rgba(168,85,247,0.12)', icon:'📊' },
  sentiment:   { label:'市場情緒', color:'#f59e0b', bg:'rgba(245,158,11,0.12)',  icon:'🧭' },
  fundamental: { label:'基本面',   color:'#22c55e', bg:'rgba(34,197,94,0.12)',   icon:'🔍' },
}

// ── SVG Visuals ───────────────────────────────────────────────────────────
function CandleVis() {
  const candles = [
    { x:64,  o:108, c:60,  h:42,  l:124, up:true  },
    { x:148, o:62,  c:100, h:48,  l:112, up:false },
    { x:232, o:92,  c:70,  h:76,  l:130, up:true  },
  ]
  return (
    <svg viewBox="0 0 296 168" width="100%" height="158" style={{ display:'block' }}>
      {candles.map((c, i) => {
        const col = c.up ? '#ef4444' : '#22c55e'
        const bodyTop = Math.min(c.o, c.c)
        const bodyH   = Math.max(Math.abs(c.c - c.o), 4)
        return (
          <g key={i}>
            <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={col} strokeWidth="2"/>
            <rect x={c.x - 13} y={bodyTop} width="26" height={bodyH} fill={col} rx="3"/>
          </g>
        )
      })}
      <text x="64"  y="28"  fontSize="11" fill="#94a3b8" textAnchor="middle">上影線</text>
      <text x="64"  y="152" fontSize="11" fill="#94a3b8" textAnchor="middle">下影線</text>
      <text x="64"  y="90"  fontSize="11" fill="#ef4444" textAnchor="middle" fontWeight="600">陽線</text>
      <text x="148" y="90"  fontSize="11" fill="#22c55e" textAnchor="middle" fontWeight="600">陰線</text>
      <line x1="72" y1="50" x2="68" y2="62" stroke="#475569" strokeWidth="1"/>
      <line x1="72" y1="122" x2="68" y2="114" stroke="#475569" strokeWidth="1"/>
      <rect x="168" y="142" width="14" height="12" fill="#ef4444" rx="2"/>
      <text x="186" y="153" fontSize="11" fill="#ef4444">陽線 (台)</text>
      <rect x="244" y="142" width="14" height="12" fill="#22c55e" rx="2"/>
      <text x="262" y="153" fontSize="11" fill="#22c55e">陰</text>
    </svg>
  )
}

function MAVis() {
  const prices = [82,80,84,78,82,88,90,86,92,95,91,96,100,98,104]
  const ma5  = prices.map((_,i) => i<4  ? null : prices.slice(i-4,i+1).reduce((a,b)=>a+b)/5)
  const ma20 = prices.map((_,i) => i<14 ? null : prices.slice(i-14,i+1).reduce((a,b)=>a+b)/15)
  const W=296, H=130, pad=14
  const xs     = prices.map((_,i) => pad + i*(W-pad*2)/(prices.length-1))
  const scaleY = v => H - 20 - (v-75)/(110-75)*(H-40)
  const linePath = pts => pts.reduce((acc,p,i) => acc+(i===0?'M':'L')+`${p[0].toFixed(1)},${p[1].toFixed(1)} `,'')
  const priceL = linePath(prices.map((v,i) => [xs[i], scaleY(v)]))
  const ma5L   = linePath(ma5.map((v,i)   => v != null ? [xs[i], scaleY(v)] : null).filter(Boolean))
  const ma20L  = linePath(ma20.map((v,i)  => v != null ? [xs[i], scaleY(v)] : null).filter(Boolean))
  const gcX = xs[10], gcY = scaleY(91)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display:'block' }}>
      <path d={priceL} fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="2"/>
      <path d={ma5L}   fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeDasharray="5 2"/>
      <path d={ma20L}  fill="none" stroke="#3b82f6" strokeWidth="2.2"/>
      <circle cx={gcX} cy={gcY} r="6" fill="none" stroke="#fbbf24" strokeWidth="2"/>
      <text x={gcX+9} y={gcY+4} fontSize="11" fill="#fbbf24" fontWeight="600">黃金交叉</text>
      <line x1="10" y1={H-8} x2="24" y2={H-8} stroke="rgba(148,163,184,0.4)" strokeWidth="2"/>
      <text x="28" y={H-4} fontSize="11" fill="#64748b">股價</text>
      <line x1="62" y1={H-8} x2="76" y2={H-8} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2"/>
      <text x="80" y={H-4} fontSize="11" fill="#f59e0b">MA5</text>
      <line x1="108" y1={H-8} x2="122" y2={H-8} stroke="#3b82f6" strokeWidth="2"/>
      <text x="126" y={H-4} fontSize="11" fill="#3b82f6">MA20</text>
    </svg>
  )
}

function RSIVis() {
  const W=296, barY=46, barH=44
  const toX = v => 14 + v*(W-28)/100
  const zones = [
    { x:0,  w:30, col:'rgba(239,68,68,0.20)',  lbl:'超賣', lc:'#ef4444' },
    { x:30, w:40, col:'rgba(148,163,184,0.07)', lbl:'中性', lc:'#94a3b8' },
    { x:70, w:30, col:'rgba(34,197,94,0.20)',   lbl:'超買', lc:'#22c55e' },
  ]
  return (
    <svg viewBox={`0 0 ${W} 120`} width="100%" height="116" style={{ display:'block' }}>
      {zones.map(z => (
        <rect key={z.lbl} x={toX(z.x)} y={barY} width={(W-28)*z.w/100}
          height={barH} fill={z.col} rx={z.x===0 || z.x===70 ? 4 : 0}/>
      ))}
      <rect x={toX(0)} y={barY} width={W-28} height={barH} fill="none" stroke="rgba(100,116,139,0.35)" strokeWidth="1.2" rx="4"/>
      {[0,30,50,70,100].map(m => (
        <text key={m} x={toX(m)} y={barY-9} textAnchor="middle" fontSize="11"
          fill="#64748b" fontFamily="monospace">{m}</text>
      ))}
      {[{v:22,lbl:'超賣',col:'#ef4444'},{v:78,lbl:'超買',col:'#22c55e'}].map(({v,lbl,col}) => (
        <g key={v}>
          <circle cx={toX(v)} cy={barY+barH/2} r="10" fill={col} opacity="0.9"/>
          <text x={toX(v)} y={barY+barH+17} textAnchor="middle" fontSize="11" fill={col} fontWeight="700">{lbl}</text>
        </g>
      ))}
      {zones.map(z => (
        <text key={z.lbl+'t'} x={toX(z.x + z.w/2)} y={barY+barH/2+5}
          textAnchor="middle" fontSize="12" fill={z.lc} fontWeight="700" opacity="0.85">{z.lbl}</text>
      ))}
    </svg>
  )
}

function MACDVis() {
  const macd = [-3,-2.5,-1.5,-0.5,0.2,1,1.5,1.2,0.6,0,-0.8,-0.5]
  const sig  = [-2.8,-2.6,-2,-1.2,-0.4,0.4,0.9,1.1,0.9,0.4,-0.3,-0.4]
  const hist = macd.map((v,i) => v - sig[i])
  const W=296, H=124, mid=58
  const xs = macd.map((_,i) => 18 + i*(W-36)/(macd.length-1))
  const sy  = v => mid - v*14
  const lp  = pts => pts.reduce((a,p,i) => a+(i===0?'M':'L')+`${xs[i].toFixed(1)},${sy(p).toFixed(1)} `,'')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display:'block' }}>
      <line x1="14" y1={mid} x2={W-6} y2={mid} stroke="rgba(100,116,139,0.3)" strokeWidth="1" strokeDasharray="3 3"/>
      {hist.map((v,i) => (
        <rect key={i} x={xs[i]-9} y={v>0?sy(v):mid} width="18"
          height={Math.abs(v)*14} fill={v>0?'rgba(34,197,94,0.55)':'rgba(239,68,68,0.55)'} rx="2"/>
      ))}
      <path d={lp(macd)} fill="none" stroke="#3b82f6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={lp(sig)}  fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 2"/>
      <circle cx={xs[4]} cy={sy(0.2)} r="5.5" fill="none" stroke="#fbbf24" strokeWidth="2"/>
      <text x={xs[4]+9} y={sy(0.2)+4} fontSize="11" fill="#fbbf24" fontWeight="600">交叉</text>
      <line x1="14" y1={H-8} x2="28" y2={H-8} stroke="#3b82f6" strokeWidth="2.4"/>
      <text x="32" y={H-4} fontSize="11" fill="#3b82f6">MACD</text>
      <line x1="80" y1={H-8} x2="94" y2={H-8} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2"/>
      <text x="98" y={H-4} fontSize="11" fill="#f59e0b">訊號線</text>
      <rect x="144" y={H-13} width="11" height="8" fill="rgba(34,197,94,0.6)" rx="1.5"/>
      <text x="159" y={H-4} fontSize="11" fill="#64748b">柱狀圖</text>
    </svg>
  )
}

function VIXVis() {
  const zones = [
    {label:'平靜', range:'< 15', col:'#22c55e'},
    {label:'正常', range:'15–25',col:'#f59e0b'},
    {label:'恐慌', range:'25–40',col:'#f97316'},
    {label:'危機', range:'> 40', col:'#ef4444'},
  ]
  return (
    <svg viewBox="0 0 296 106" width="100%" height="100" style={{ display:'block' }}>
      {zones.map((z,i) => (
        <g key={z.label}>
          <rect x={14+i*67} y={14} width="63" height="52" rx="8"
            fill={z.col} opacity="0.13" stroke={z.col} strokeWidth="1.4" strokeOpacity="0.6"/>
          <text x={45+i*67} y={36} textAnchor="middle" fontSize="15" fontWeight="700" fill={z.col}>{z.label}</text>
          <text x={45+i*67} y={54} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{z.range}</text>
        </g>
      ))}
      <text x="148" y="84" textAnchor="middle" fontSize="11" fill="#475569">← VIX 數值 →</text>
    </svg>
  )
}

function FGVis() {
  const W=296, cx=148, cy=90, r=70
  const zones = [
    {a1:-180,a2:-144,col:'#ef4444',lbl:'極恐'},
    {a1:-144,a2:-108,col:'#f97316',lbl:'恐慌'},
    {a1:-108,a2:-72, col:'#eab308',lbl:'中性'},
    {a1:-72, a2:-36, col:'#84cc16',lbl:'貪婪'},
    {a1:-36, a2:0,   col:'#22c55e',lbl:'極貪'},
  ]
  const arc = (a1,a2,r) => {
    const tr = d => d*Math.PI/180
    const x1=cx+r*Math.cos(tr(a1)), y1=cy+r*Math.sin(tr(a1))
    const x2=cx+r*Math.cos(tr(a2)), y2=cy+r*Math.sin(tr(a2))
    return `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`
  }
  const needleA = -90
  const nx = cx + 58*Math.cos(needleA*Math.PI/180)
  const ny = cy + 58*Math.sin(needleA*Math.PI/180)
  return (
    <svg viewBox={`0 0 ${W} 114`} width="100%" height="110" style={{ display:'block' }}>
      {zones.map(z => (
        <path key={z.lbl} d={arc(z.a1,z.a2,r)} fill={z.col} opacity="0.20"
          stroke={z.col} strokeOpacity="0.6" strokeWidth="0.8"/>
      ))}
      {zones.map(z => {
        const midA = (z.a1+z.a2)/2*Math.PI/180
        const tx=cx+(r-22)*Math.cos(midA), ty=cy+(r-22)*Math.sin(midA)
        return <text key={z.lbl+'t'} x={tx.toFixed(1)} y={(ty+4).toFixed(1)}
          textAnchor="middle" fontSize="11" fill={z.col} fontWeight="700">{z.lbl}</text>
      })}
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
        stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="6" fill="#1e293b" stroke="#f1f5f9" strokeWidth="2"/>
      <text x={cx} y={cy+20} textAnchor="middle" fontSize="11" fill="#94a3b8">50 · 中性</text>
    </svg>
  )
}

function CycleVis() {
  const phases = [
    {label:'復甦', sub:'希望萌發', x:148, y:16,  col:'#3b82f6'},
    {label:'繁榮', sub:'樂觀貪婪', x:258, y:72,  col:'#22c55e'},
    {label:'衰退', sub:'焦慮恐慌', x:220, y:158, col:'#f97316'},
    {label:'蕭條', sub:'絕望賣出', x:76,  y:158, col:'#ef4444'},
    {label:'築底', sub:'懷疑觀望', x:38,  y:72,  col:'#a855f7'},
  ]
  return (
    <svg viewBox="0 0 296 200" width="100%" height="190" style={{ display:'block' }}>
      <ellipse cx="148" cy="102" rx="98" ry="66" fill="none"
        stroke="rgba(100,116,139,0.22)" strokeWidth="2" strokeDasharray="6 3"/>
      {phases.map((p,i) => {
        const n = phases[(i+1)%phases.length]
        return <line key={i} x1={p.x} y1={p.y+8} x2={n.x} y2={n.y+8}
          stroke="rgba(100,116,139,0.18)" strokeWidth="1.4"/>
      })}
      {phases.map(p => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y+6} r="26" fill={p.col} opacity="0.1"
            stroke={p.col} strokeWidth="1.8" strokeOpacity="0.6"/>
          <text x={p.x} y={p.y+4} textAnchor="middle" fontSize="13" fontWeight="700" fill={p.col}>{p.label}</text>
          <text x={p.x} y={p.y+18} textAnchor="middle" fontSize="10" fill="#64748b">{p.sub}</text>
        </g>
      ))}
      <text x="148" y="106" textAnchor="middle" fontSize="12" fill="#475569" opacity="0.6">循環</text>
    </svg>
  )
}

const VISUALS = {
  candle: CandleVis, ma: MAVis, rsi: RSIVis,
  macd: MACDVis, vix: VIXVis, fg: FGVis, cycle: CycleVis,
}

// ── Card Data ─────────────────────────────────────────────────────────────
const CARDS = [
  { id:'stock-basics', title:'股票是什麼？', sub:'所有投資的起點', cat:'basics', emoji:'🏢',
    summary:'股票代表對一家公司的部分所有權，持有者享有分紅與公司成長。',
    body:[
      {t:'p',v:'當公司需要資金，可以選擇「上市」——將部分所有權切割成股份，向大眾出售。每張股票代表你持有這家公司的一小部分。'},
      {t:'pts',v:['股東獲利方式：① 股價上漲（資本利得）② 公司分配股息','台灣上市股票在台灣證券交易所（TWSE）交易','上櫃股票在櫃買中心（TPEx）交易','台股最小買賣單位為「張」（1,000 股）']},
    ]},
  { id:'price-reading', title:'看懂股票報價', sub:'開高低收一眼掌握', cat:'basics', emoji:'📋',
    summary:'報價包含開、高、低、收四個核心價格，加上成交量，完整描述一天的市場行為。',
    body:[
      {t:'pts',v:['開盤價（O）— 當日第一筆成交價','最高價（H）— 全日最高成交價','最低價（L）— 全日最低成交價','收盤價（C）— 最後一筆，最重要的參考價']},
      {t:'key',v:'漲跌幅 = (今收 − 昨收) ÷ 昨收 × 100%'},
      {t:'p',v:'成交量代表當天共有多少股票易手。高成交量通常意味著市場對該股票有強烈觀點，不論漲跌。'},
    ]},
  { id:'indices', title:'股市指數', sub:'市場整體健康的體溫計', cat:'basics', emoji:'📊',
    summary:'指數是一籃子股票的加權均值，反映市場整體或特定板塊的走勢。',
    body:[
      {t:'p',v:'市場上有數千支股票，不可能逐一追蹤。指數把代表性股票打包成一個數字，讓你一眼看懂「今天市場整體表現怎樣」。'},
      {t:'pts',v:['台灣加權（TAIEX）— 所有上市股票市值加權','S&P 500 — 美國 500 家最大企業','Nasdaq — 以美國科技股為主','恆生指數 — 香港市場代表指數']},
      {t:'key',v:'指數的「點數」本身無意義，重要的是相對過去的「漲跌幅」。'},
    ]},
  { id:'forex', title:'匯率與台股的關係', sub:'美元走勢如何牽動市場', cat:'basics', emoji:'🌐',
    summary:'台幣升值對出口導向企業（半導體、電子）帶來匯損壓力；美元強勢通常使新興市場承壓。',
    body:[
      {t:'p',v:'台灣是出口導向的開放型小經濟體，大型企業的營收多以美元計價。匯率的變動直接影響以台幣計算的獲利。'},
      {t:'pts',v:['台幣升值 → 出口企業換回的台幣減少，獲利受壓','台幣貶值 → 出口企業台幣獲利增加','美元指數（DXY）強勢 → 資金易從新興市場流回美國','美元走弱 → 通常有利黃金、商品與新興市場']},
    ]},
  { id:'candlestick', title:'K 線圖', sub:'最通用的股價圖表語言', cat:'tech', emoji:'🕯️',
    summary:'每根 K 線濃縮了一段時間的開高低收，陽線代表上漲、陰線代表下跌。',
    body:[
      {t:'vis',v:'candle'},
      {t:'pts',v:['陽線（台灣紅色）— 收盤 > 開盤，買方佔優','陰線（台灣綠色）— 收盤 < 開盤，賣方佔優','上影線 — 當日衝高後回落，代表上方賣壓','下影線 — 當日跌深後回升，代表下方買盤承接']},
      {t:'tip',v:'長上影線常暗示賣壓沉重；長下影線則可能代表買盤強力承接。'},
    ]},
  { id:'ma', title:'移動平均線 MA', sub:'濾除雜訊、看清趨勢', cat:'tech', emoji:'📈',
    summary:'MA(n) 是過去 n 天收盤的均值，黃金交叉是常用的趨勢轉折信號。',
    body:[
      {t:'p',v:'單日股價波動劇烈，難以判斷趨勢。移動平均線取一段時間的均值，過濾短期雜訊，讓中長期趨勢更清晰。'},
      {t:'vis',v:'ma'},
      {t:'pts',v:['MA5（週線）— 短期動能方向','MA20（月線）— 中期趨勢','MA60（季線）— 長期格局','黃金交叉：短期 MA 上穿長期 MA → 潛在買進信號','死亡交叉：短期 MA 下穿長期 MA → 潛在賣出警示']},
    ]},
  { id:'rsi', title:'RSI 相對強弱指數', sub:'衡量多空力道的比例計', cat:'tech', emoji:'⚡',
    summary:'RSI 介於 0–100，>70 為超買、<30 為超賣，幫助判斷轉折時機。',
    body:[
      {t:'p',v:'RSI 計算過去 14 天中，上漲日平均漲幅與下跌日平均跌幅的比值。數字越高代表近期漲勢越強。'},
      {t:'vis',v:'rsi'},
      {t:'pts',v:['RSI > 70：超買，價格可能過熱，留意回檔','RSI 50–70：多方偏強格局','RSI 30–50：空方偏弱格局','RSI < 30：超賣，跌幅可能過大，留意反彈機會']},
      {t:'tip',v:'超買不代表立即反轉——強勢股可長時間維持高 RSI。需搭配其他指標確認。'},
    ]},
  { id:'macd', title:'MACD 指標', sub:'捕捉動能轉換的時機', cat:'tech', emoji:'📉',
    summary:'MACD 結合快慢 EMA，用交叉與柱狀圖判斷多空動能轉換。',
    body:[
      {t:'pts',v:['MACD 線 = EMA(12) − EMA(26)（快線減慢線）','訊號線 = MACD 的 9 日 EMA','柱狀圖 = MACD − 訊號線（動能的動能）']},
      {t:'vis',v:'macd'},
      {t:'pts',v:['MACD 上穿訊號線（黃金交叉）→ 動能轉多','MACD 下穿訊號線（死亡交叉）→ 動能轉空','柱狀圖由負轉正 → 空頭力道減弱','MACD 在零軸以上代表整體偏多頭格局']},
    ]},
  { id:'kd', title:'KD 隨機指標', sub:'短中期超買超賣的快速判斷', cat:'tech', emoji:'🔄',
    summary:'KD 衡量收盤價在近 N 天高低區間的相對位置，>80 超買、<20 超賣。',
    body:[
      {t:'p',v:'KD 計算今日收盤在近 9 天最高最低區間的位置，平滑後得到 K 值和 D 值。'},
      {t:'pts',v:['K 值（快線）反應靈敏但易有假訊號','D 值（慢線）是 K 值的三日平滑','KD > 80：超買區，留意賣壓','KD < 20：超賣區，留意反彈','K 線上穿 D 線 → 短期買進訊號','K 線下穿 D 線 → 短期賣出訊號']},
    ]},
  { id:'vix', title:'VIX 波動率指數', sub:'市場恐懼溫度計', cat:'sentiment', emoji:'🌡️',
    summary:'VIX 由選擇權隱含波動率推算，反映市場對未來 30 天波動的預期程度。',
    body:[
      {t:'p',v:'VIX 是芝加哥選擇權交易所（CBOE）基於 S&P 500 選擇權報價計算的「隱含波動率」。數字越高，代表越多人願意花錢買保險，市場愈恐懼。'},
      {t:'vis',v:'vix'},
      {t:'pts',v:['VIX < 15：市場平靜，風險偏好高','VIX 15–25：正常波動範圍','VIX > 30：市場明顯恐慌','VIX > 40：歷史性危機水準（2008 年曾超過 80）']},
      {t:'tip',v:'VIX 與股市通常呈負相關：股市大跌時 VIX 急升，牛市平穩期通常低迷。'},
    ]},
  { id:'fear-greed', title:'恐慌貪婪指數', sub:'群眾情緒的即時快照', cat:'sentiment', emoji:'😱',
    summary:'0–100 的情緒儀表，極度恐慌時常是逢低機會，極度貪婪時則需謹慎。',
    body:[
      {t:'p',v:'「在別人恐懼時貪婪，在別人貪婪時恐懼。」— 巴菲特。恐慌貪婪指數綜合多個市場指標，幫助逆向思考。'},
      {t:'vis',v:'fg'},
      {t:'pts',v:['0–25：極度恐慌（歷史上多為逢低機會）','25–45：恐慌','45–55：中性均衡','55–75：貪婪','75–100：極度貪婪（市場可能過熱）']},
      {t:'tip',v:'這是輔助工具，不是精準的買賣點——極度恐慌可能持續數週甚至數月。'},
    ]},
  { id:'market-cycle', title:'牛熊市週期', sub:'市場情緒的四季更迭', cat:'sentiment', emoji:'🔁',
    summary:'牛市（持續上漲 20%+）與熊市（從高點下跌 20%+）是股市永恆的循環。',
    body:[
      {t:'pts',v:['牛市（Bull Market）：指數從低點上漲超過 20%','熊市（Bear Market）：指數從高點下跌超過 20%','修正（Correction）：從近期高點下跌 10–20%','反彈（Rally）：空頭中的短暫回升，非趨勢反轉']},
      {t:'vis',v:'cycle'},
      {t:'tip',v:'美股自 1926 年以來，牛市平均持續約 9 年，熊市平均約 1.5 年。長期持有者歷史上都能度過熊市。'},
    ]},
  { id:'pe-ratio', title:'本益比 P/E Ratio', sub:'最基本的估值工具', cat:'fundamental', emoji:'💰',
    summary:'P/E = 股價 ÷ EPS，代表市場願意為每 1 元獲利付出多少倍的價格。',
    body:[
      {t:'key',v:'P/E = 股價（Price）÷ 每股盈餘（EPS）'},
      {t:'p',v:'若台積電股價 700 元，每股盈餘 40 元，則 P/E = 17.5 倍，代表投資人願意為台積電每賺 1 元獲利支付 17.5 元。'},
      {t:'pts',v:['P/E 高 → 市場對未來成長有更高期待（成長股）','P/E 低 → 可能低估，或公司成長動能趨緩','台股整體歷史均值約 15–20 倍','科技股 P/E 通常高於傳統產業','同產業橫向比較才有意義']},
    ]},
  { id:'dividend', title:'股息殖利率', sub:'持股的現金報酬率', cat:'fundamental', emoji:'💵',
    summary:'殖利率 = 年度每股股息 ÷ 股價，衡量每年光靠領息能拿回多少比例。',
    body:[
      {t:'key',v:'殖利率 = 年度股息 ÷ 當前股價 × 100%'},
      {t:'p',v:'假設某股股價 50 元，每年配息 2.5 元，殖利率 = 5%。不考慮股價漲跌，光持股一年就有 5% 的現金回報。'},
      {t:'pts',v:['台股殖利率普遍高，許多優質股 > 3%','殖利率 > 5% 在台灣算相對高','殖利率過高需注意：可能因股價大跌而「被動升高」','金融股、公用事業殖利率通常穩定','成長型科技股多不配息，保留盈餘再投資']},
    ]},
  { id:'eps', title:'EPS 每股盈餘', sub:'企業獲利能力的核心數字', cat:'fundamental', emoji:'📑',
    summary:'EPS = 稅後淨利 ÷ 流通股數，是計算 P/E 的基礎，也是財報最重要的單一數字。',
    body:[
      {t:'key',v:'EPS = 稅後淨利 ÷ 流通在外股數'},
      {t:'p',v:'若台積電某季稅後淨利 2,000 億元，流通股數 259 億股，EPS = 7.7 元。代表每持有一股，這季替你「賺了」7.7 元。'},
      {t:'pts',v:['EPS 年年成長 → 企業獲利能力持續提升','EPS 超越分析師預期 → 股價常見上漲','EPS 低於預期 → 股價常見下跌（即使仍獲利）','台灣每季公布一次，每年 4 次','留意「業外一次性損益」導致的 EPS 失真']},
    ]},
]

// ── Content block renderer ────────────────────────────────────────────────
function Block({ b, catColor }) {
  const V = b.v && VISUALS[b.v] ? VISUALS[b.v] : null
  if (b.t === 'p')   return <p className="lc-p">{b.v}</p>
  if (b.t === 'key') return <div className="lc-key" style={{ '--cc': catColor }}>{b.v}</div>
  if (b.t === 'tip') return (
    <div className="lc-tip">
      <span className="lc-tip-ico">💡</span>
      <span>{b.v}</span>
    </div>
  )
  if (b.t === 'pts') return (
    <ul className="lc-pts">
      {b.v.map((pt, i) => (
        <li key={i}>
          <span className="lc-pt-dot" style={{ background: catColor }}/>
          <span>{pt}</span>
        </li>
      ))}
    </ul>
  )
  if (b.t === 'vis' && V) return <div className="lc-vis"><V/></div>
  return null
}

// ── Single Card ───────────────────────────────────────────────────────────
function LearnCard({ card, isRead, onRead }) {
  const [open, setOpen] = useState(false)
  const cat = CATS[card.cat]
  const toggle = () => {
    setOpen(v => !v)
    if (!isRead) onRead(card.id)
  }
  return (
    <div className={`lc${open ? ' lc--open' : ''}${isRead ? ' lc--read' : ''}`}
         style={{ '--cc': cat.color }}>
      <div className="lc-stripe"/>
      <button className="lc-top" onClick={toggle}>
        <span className="lc-emoji-wrap">{card.emoji}</span>
        <div className="lc-info">
          <span className="lc-name">{card.title}</span>
          <span className="lc-tagline">{card.sub}</span>
        </div>
        <div className="lc-right">
          <span className="lc-cat-badge"
            style={{ color: cat.color, background: cat.bg }}>
            {cat.label}
          </span>
          {isRead && <span className="lc-read-mark">✓</span>}
          <svg className={`lc-chev${open ? ' lc-chev--up' : ''}`}
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {!open && <p className="lc-preview">{card.summary}</p>}

      {open && (
        <div className="lc-body">
          {card.body.map((b, i) => (
            <Block key={i} b={b} catColor={cat.color}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Mini Learn Card (embeddable in SymbolPage) ───────────────────────────
export { CARDS }

export function MiniLearnCard({ cardId }) {
  const card = CARDS.find(c => c.id === cardId)
  if (!card) return null
  const [open, setOpen] = useState(false)
  const [read, markRead] = useReadSet()
  const cat = CATS[card.cat]
  const toggle = () => { setOpen(v => !v); if (!read.has(card.id)) markRead(card.id) }
  return (
    <div className={`mlc${open ? ' mlc--open' : ''}${read.has(card.id) ? ' mlc--read' : ''}`}
         style={{ '--cc': cat.color }}>
      <div className="mlc-stripe"/>
      <button className="mlc-head" onClick={toggle}>
        <span className="mlc-emoji">{card.emoji}</span>
        <div className="mlc-info">
          <span className="mlc-name">{card.title}</span>
          <span className="mlc-sub">{card.sub}</span>
        </div>
        <div className="mlc-right">
          <span className="mlc-badge" style={{ color: cat.color, background: cat.bg }}>{cat.label}</span>
          {read.has(card.id) && <span className="mlc-read">✓</span>}
          <svg className={`mlc-chev${open ? ' mlc-chev--up' : ''}`}
            width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>
      {open && (
        <div className="mlc-body">
          {card.body.map((b, i) => <Block key={i} b={b} catColor={cat.color}/>)}
        </div>
      )}
    </div>
  )
}

// ── Learn Page ────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { id:'all',         label:'全部' },
  { id:'basics',      label:'市場基礎' },
  { id:'tech',        label:'技術分析' },
  { id:'sentiment',   label:'市場情緒' },
  { id:'fundamental', label:'基本面' },
]

export function LearnPage() {
  const [read, markRead] = useReadSet()
  const [filter, setFilter] = useState('all')

  const doneCount = CARDS.filter(c => read.has(c.id)).length
  const total     = CARDS.length
  const pct       = Math.round(doneCount / total * 100)
  const R = 28, C = +(2 * Math.PI * R).toFixed(2)

  return (
    <div className="lp">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="lp-hero">
        <div className="lp-hero-txt">
          <div className="lp-kicker">LEARN · 投資百科</div>
          <h1 className="lp-title">投資入門教學</h1>
          <p className="lp-desc">
            系統性掌握市場指標與投資邏輯，建立你的財經洞察力。<br/>
            點擊任意卡片展開詳細說明，閱讀後自動記錄進度。
          </p>
          {/* Category stat pills */}
          <div className="lp-stat-row">
            {Object.entries(CATS).map(([id, cat]) => {
              const total = CARDS.filter(c => c.cat === id).length
              const done  = CARDS.filter(c => c.cat === id && read.has(c.id)).length
              return (
                <div key={id} className="lp-stat-pill" style={{ '--sc': cat.color }}>
                  <span className="lp-stat-ico">{cat.icon}</span>
                  <span className="lp-stat-lbl">{cat.label}</span>
                  <span className="lp-stat-frac">{done}/{total}</span>
                </div>
              )
            })}
          </div>
        </div>
        {/* Progress ring */}
        <div className="lp-ring-wrap">
          <svg width="88" height="88" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={R} fill="none"
              stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
            <circle cx="36" cy="36" r={R} fill="none"
              stroke="var(--accent)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={+(C * (1 - pct / 100)).toFixed(2)}
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)' }}
            />
            <text x="36" y="33" textAnchor="middle"
              fontSize="15" fontWeight="700" fill="var(--text)"
              fontFamily="system-ui,sans-serif">{pct}%</text>
            <text x="36" y="46" textAnchor="middle"
              fontSize="8.5" fill="var(--text-muted)"
              fontFamily="system-ui,sans-serif">{doneCount}/{total}</text>
          </svg>
          <span className="lp-ring-lbl">學習進度</span>
        </div>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────── */}
      <div className="lp-tabs">
        {FILTER_TABS.map(tab => {
          const tabCards = tab.id === 'all' ? CARDS : CARDS.filter(c => c.cat === tab.id)
          const tabDone  = tabCards.filter(c => read.has(c.id)).length
          const col      = tab.id !== 'all' ? CATS[tab.id].color : undefined
          return (
            <button key={tab.id}
              className={`lp-tab${filter === tab.id ? ' lp-tab--on' : ''}`}
              style={filter === tab.id && col ? { '--tab-c': col } : undefined}
              onClick={() => setFilter(tab.id)}>
              {tab.id !== 'all' && (
                <span className="lp-tab-dot" style={{ background: CATS[tab.id].color }}/>
              )}
              {tab.id === 'all' && <span className="lp-tab-all-ico">✦</span>}
              {tab.label}
              <span className="lp-tab-badge">{tabDone}/{tabCards.length}</span>
            </button>
          )
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {filter === 'all'
        ? Object.entries(CATS).map(([catId, cat]) => {
            const catCards = CARDS.filter(c => c.cat === catId)
            const catDone  = catCards.filter(c => read.has(c.id)).length
            return (
              <section key={catId} className="lp-section">
                <div className="lp-sec-head" style={{ '--sc': cat.color }}>
                  <span className="lp-sec-ico">{cat.icon}</span>
                  <span className="lp-sec-title">{cat.label}</span>
                  <div className="lp-sec-pips">
                    {catCards.map(c => (
                      <div key={c.id} className="lp-sec-pip"
                        style={{ background: read.has(c.id) ? cat.color : 'var(--surface-3)' }}
                        title={c.title}/>
                    ))}
                  </div>
                  <span className="lp-sec-frac">{catDone}/{catCards.length}</span>
                </div>
                <div className="lp-grid">
                  {catCards.map(card => (
                    <LearnCard key={card.id} card={card}
                      isRead={read.has(card.id)} onRead={markRead}/>
                  ))}
                </div>
              </section>
            )
          })
        : (
          <div className="lp-grid lp-grid--solo">
            {CARDS.filter(c => c.cat === filter).map(card => (
              <LearnCard key={card.id} card={card}
                isRead={read.has(card.id)} onRead={markRead}/>
            ))}
          </div>
        )
      }

      <div className="lp-footer">
        投資涉及風險，本教學內容僅供學習參考，不構成任何投資建議。
      </div>
    </div>
  )
}
