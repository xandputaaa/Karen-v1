
/* KAREN forward BTC settlement scenario: explicitly unvalidated and read-only. */
const chartState={historySource:null,samples:[],price:null,status:'CONNECTING',interval:'15M',venue:'Kalshi',demo:false,demoTick:0,market:null,marketUpdated:null,forecastLog:[],lastMarketKey:null};
const fmt=n=>Number.isFinite(n)?'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const erfApprox=x=>{const sign=x<0?-1:1;const z=Math.abs(x),t=1/(1+.3275911*z);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z))};
const normalCdf=z=>.5*(1+erfApprox(z/Math.sqrt(2)));
function estimateFuture(data,seconds,market){
 if(data.length<4||!Number.isFinite(seconds)||seconds<=0||!Number.isFinite(data.at(-1)?.time)||data.at(-1).time>Date.now()+2000||Date.now()-data.at(-1).time>15000)return null;
 const returns=[];for(let i=1;i<data.length;i++){const dt=(data[i].time-data[i-1].time)/1000;if(dt>=3&&dt<=120&&data[i].price>0&&data[i-1].price>0)returns.push({r:Math.log(data[i].price/data[i-1].price),dt})}
 if(returns.length<3)return null;
 const total=returns.reduce((a,x)=>a+x.dt,0),sum=returns.reduce((a,x)=>a+x.r,0);
 const drift=clamp(sum/total,-.00002,.00002)*.15; // strongly shrink short-window drift
 const variance=returns.reduce((a,x)=>a+(x.r-drift*x.dt)**2,0)/Math.max(total,1);
 const sigma=Math.max(Math.sqrt(variance),.00002); // floor is an assumption, not calibration
 const start=data[data.length-1].price;
 const projected=t=>start*Math.exp(drift*t);
 const band=t=>{const spread=1.645*sigma*Math.sqrt(t);return [projected(t)*Math.exp(-spread),projected(t)*Math.exp(spread)]};
 const target=market?.targetVerified&&Number.isFinite(Number(market.target))?Number(market.target):null;
 const end=projected(seconds),spread=sigma*Math.sqrt(seconds);
 const pUp=target!==null&&spread>0?clamp(1-normalCdf((Math.log(target/start)-drift*seconds)/spread),.001,.999):null;
 const yes=Number(market?.yesAsk),no=Number(market?.noAsk);
 const evUp=null; // No actionable EV before calibration, executable quote freshness and fees are verified
 const evDown=null;
 return {start,end,seconds,drift,sigma,band,projected,target,pUp,evUp,evDown,signal:target!==null?(end>=target?'UP':'DOWN'):'WAIT',samples:returns.length,provisional:returns.length<10};
}
async function warmBtcHistory(){if(chartState.demo)return;try{const r=await fetch('/api/btc/history',{cache:'no-store'});if(!r.ok)throw Error('history');const d=await r.json();if(!d.ok||!Array.isArray(d.samples))throw Error('samples');const combined=[...d.samples,...chartState.samples].filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.price)&&p.price>0).sort((a,b)=>a.time-b.time);const dedup=[];for(const p of combined){if(dedup.length&&dedup.at(-1).time===p.time)dedup[dedup.length-1]=p;else dedup.push(p)}chartState.samples=dedup.slice(-480);chartState.historySource=d.source;drawBtcChart()}catch{chartState.historySource='Historical candles unavailable; collecting live samples';drawBtcChart()}}
function verifiedTargetForScale(m){return m?.targetVerified&&Number.isFinite(Number(m.target))?Number(m.target):NaN}
function broadcastFuturePath(){
 // Never publish simulated or alternate-venue prices under a live Kalshi contract identity.
 if(chartState.demo||chartState.venue!=='Kalshi')return;
 const m=chartState.market,now=Date.now(),close=m?.closeTime?Date.parse(m.closeTime):NaN;
 const remaining=Number.isFinite(close)?Math.max(0,Math.min(900,(close-now)/1000)):null;
 const data=chartState.samples.filter(p=>p.time>=now-900000);
 const forecast=estimateFuture(data,remaining,m);
 window.dispatchEvent(new CustomEvent('karen:btc-forecast',{detail:{ticker:m?.ticker||null,closeTime:m?.closeTime||null,target:m?.targetVerified?Number(m.target):null,spot:chartState.price,projected:forecast?.end??null,pUp:forecast?.pUp??null,phase:Number.isFinite(close)?now<close-450000?'FIRST HALF':'SECOND HALF':'UNKNOWN',at:now,experimental:true,demo:false}}));
}
function drawBtcChart(){
 const card=document.querySelector('.chartcard');if(!card)return;
 const now=Date.now(),duration={LIVE:900000,'5M':300000,'15M':900000,'1H':3600000}[chartState.interval]||900000;
 const data=chartState.samples.filter(p=>p.time>=now-duration).slice(-240);
 const market=!chartState.demo&&chartState.venue==='Kalshi'?chartState.market:null;
 const close=market?.closeTime?Date.parse(market.closeTime):NaN;
 const seconds=chartState.demo?Math.max(0,900-(chartState.demoTick*15)%900):Number.isFinite(close)?Math.min(900,Math.max(0,(close-now)/1000)):null;
 const estimate=estimateFuture(data,seconds,market);
 const contractStart=Number.isFinite(close)?close-900000:null;
 const midpoint=contractStart===null?null:contractStart+450000;
 const phase=midpoint===null?'UNKNOWN':now<midpoint?'FIRST HALF':'SECOND HALF';
 const untilMidpoint=midpoint===null?null:Math.max(0,(midpoint-now)/1000);
 const midpointEstimate=estimate&&untilMidpoint>0?estimate.projected(untilMidpoint):null;
 const observedMidpoint=midpoint!==null&&now>=midpoint?chartState.samples.filter(p=>p.time>=contractStart&&p.time<=midpoint).at(-1):null;
 const halfwayPrice=midpointEstimate??observedMidpoint?.price??null;
 const phaseTime=contractStart===null?'—':Math.max(0,Math.min(900,Math.floor((now-contractStart)/1000)));
 const phaseClock=Math.floor(phaseTime/60)+':'+String(phaseTime%60).padStart(2,'0');

 if(!chartState.demo&&chartState.venue==='Kalshi')window.dispatchEvent(new CustomEvent('karen:btc-forecast',{detail:{ticker:market?.ticker||null,closeTime:market?.closeTime||null,target:market?.targetVerified?Number(market.target):null,spot:chartState.price,projected:estimate?.end??null,pUp:estimate?.pUp??null,phase,at:now,experimental:true,demo:false}}));
 const valid=data.length>=2,remaining=chartState.demo?'DEMO · '+Math.floor(seconds/60)+'m '+String(Math.floor(seconds%60)).padStart(2,'0')+'s':seconds===null?'NO ACTIVE CONTRACT':Math.floor(seconds/60)+'m '+String(Math.floor(seconds%60)).padStart(2,'0')+'s LEFT';
 const low=valid?Math.min(...data.map(x=>x.price)):0,high=valid?Math.max(...data.map(x=>x.price)):1;
 const [bandLo,bandHi]=estimate?estimate.band(seconds):[low,high];
 const min=Math.min(low,bandLo,...(Number.isFinite(verifiedTargetForScale(market))?[verifiedTargetForScale(market)]:[]))-Math.max((high-low)*.15,2);
 const max=Math.max(high,bandHi,...(Number.isFinite(verifiedTargetForScale(market))?[verifiedTargetForScale(market)]:[]))+Math.max((high-low)*.15,2);
 const y=v=>260-(v-min)/Math.max(1,max-min)*220;
 const history=data.map((p,i)=>(i?'L':'M')+(14+i*460/Math.max(1,data.length-1)).toFixed(1)+' '+y(p.price).toFixed(1)).join(' ');
 const future=estimate?Array.from({length:21},(_,i)=>{const t=seconds*i/20;return {x:474+290*i/20,t,y:y(estimate.projected(t)),b:estimate.band(t)}}):[];
 const path=pts=>pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 const futurePath=path(future);
 const midpointX=estimate&&untilMidpoint!==null&&untilMidpoint>0&&seconds>0?474+290*untilMidpoint/seconds:null;
 const bandPath=future.length?path(future.map(p=>({x:p.x,y:y(p.b[1])})))+' '+future.slice().reverse().map(p=>'L'+p.x.toFixed(1)+' '+y(p.b[0]).toFixed(1)).join(' ')+' Z':'';
 const tone=estimate?.signal==='UP'?'#36d48b':estimate?.signal==='DOWN'?'#f45b6c':'#f4f5f6';
 const verified=market?.targetVerified===true;
 const pct=n=>n===null||n===undefined?'—':(n*100).toFixed(1)+'% (unvalidated)';
 const edge=n=>n===null||n===undefined?'Not validated':(n*100).toFixed(1)+'¢ / share before fees';
 card.classList.add('kalshi-card');
 card.innerHTML='<div class="kalshi-head"><div class="karen-demo-switch"><span>DATA SOURCE</span><button data-demo="off" class="'+(!chartState.demo?'active':'')+'">LIVE SPOT</button><button data-demo="on" class="'+(chartState.demo?'active':'')+'">SIMULATED DEMO</button></div><div class="kalshi-venues"><button data-venue="Kalshi" class="'+(chartState.venue==='Kalshi'?'active':'')+'">Kalshi 15m</button><button data-venue="Polymarket" class="'+(chartState.venue==='Polymarket'?'active':'')+'">Polymarket 5m</button></div><div class="kalshi-heading"><span class="kalshi-btc-icon">₿</span><strong>BTC · FUTURE PATH</strong><span class="kalshi-countdown">'+remaining+'</span></div><div class="kalshi-prices"><div><small>'+(chartState.demo?'Demo target · not supplied':'Verified Kalshi target')+'</small><strong>'+(verified?fmt(Number(market.target)):'UNAVAILABLE')+'</strong></div><div><small>'+(chartState.demo?'Now · simulated BTC':'Now · Coinbase spot')+'</small><strong>'+fmt(chartState.price)+'</strong></div></div></div>'+
 '<div class="karen-signal '+(estimate?estimate.signal.toLowerCase():'wait')+'">KAREN · '+(estimate&&estimate.signal!=='WAIT'?'EXPERIMENTAL '+estimate.signal:'WAIT')+' <small>'+(estimate?(estimate.provisional?'EARLY ESTIMATE · LOW DATA':'Forward scenario · not calibrated'):'Collecting 4+ timed samples and verifying contract')+'</small></div>'+
 '<div class="kalshi-graph"><svg viewBox="0 0 790 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Actual BTC history and forward experimental forecast">'+
 [48,156,264].map((v,i)=>'<line x1="0" x2="770" y1="'+v+'" y2="'+v+'" stroke="#ffffff18"/><text x="690" y="'+(v-8)+'" fill="#a6abb1" font-size="14">'+fmt(max-(v-40)/230*(max-min))+'</text>').join('')+
 (midpointX!==null?'<line x1="'+midpointX+'" x2="'+midpointX+'" y1="18" y2="280" stroke="#ffffff4d" stroke-dasharray="3 7"/><text x="'+Math.min(midpointX+5,710)+'" y="36" fill="#aeb2b8" font-size="11">7:30 MID</text>':'')+
 '<line x1="474" y1="12" x2="474" y2="280" stroke="#ffffff55" stroke-dasharray="4 5"/><text x="480" y="18" fill="#fff" font-size="13">NOW → FUTURE</text>'+
 (valid?'<path d="'+history+'" fill="none" stroke="#f6f7f8" stroke-width="3" stroke-linejoin="round"/>':'')+
 (estimate?'<path d="'+bandPath+'" fill="'+tone+'" opacity=".12"/><path d="'+futurePath+'" fill="none" stroke="'+tone+'" stroke-width="3.5" stroke-dasharray="8 6"/>':'')+
 (verified?'<line x1="12" y1="'+y(Number(market.target))+'" x2="765" y2="'+y(Number(market.target))+'" stroke="#ffffff8a" stroke-dasharray="3 6"/>':'')+'</svg>'+
 (!valid?'<div class="kalshi-placeholder">Collecting live BTC history<small>Loading real Coinbase candles; no synthetic history.</small></div>':'')+'</div>'+
 '<div class="karen-phases"><div><small>CONTRACT CLOCK</small><b>'+phaseClock+' / 15:00</b></div><div><small>ACTIVE PHASE</small><b>'+phase+'</b></div><div><small>7:30 midpoint · '+(phase==='FIRST HALF'?'predicted':'observed')+'</small><b>'+fmt(halfwayPrice)+'</b></div><div><small>15:00 settlement · projected</small><b>'+fmt(estimate?.end)+'</b></div></div>'+
 '<div class="karen-projection"><strong style="color:'+(estimate?tone:'#f5f5f5')+'">┄ KAREN projected future path</strong><div class="projection-metrics"><div><small>Forecast at settlement</small><b>'+fmt(estimate?.end)+'</b></div><div><small>Assumed 90% scenario band · unverified</small><b>'+(estimate?fmt(bandLo)+' – '+fmt(bandHi):'—')+'</b></div><div><small>Finish above target · model</small><b>'+pct(estimate?.pUp)+'</b></div><div><small>Finish below target · model</small><b>'+pct(estimate?.pUp===null||estimate?.pUp===undefined?null:1-estimate.pUp)+'</b></div></div><small>Unvalidated volatility/drift model, NOT a proven probability or profitable trading signal. Coinbase spot is not the Kalshi settlement index. Scenario bands are model assumptions, not calibrated confidence intervals.</small></div>'+
 '<div class="projection-metrics projection-edge"><div><small>YES theoretical edge, before fees</small><b>'+edge(estimate?.evUp)+'</b></div><div><small>NO theoretical edge, before fees</small><b>'+edge(estimate?.evDown)+'</b></div></div>'+
 '<div class="kalshi-foot"><span class="kalshi-live-dot"></span><span>'+chartState.status+'</span><div class="kalshi-periods">'+['LIVE','5M','15M','1H'].map(t=>'<button type="button" data-kalshi-period="'+t+'" class="'+(chartState.interval===t?'active':'')+'">'+t+'</button>').join('')+'</div></div>'+
 '<p class="kalshi-disclaimer">'+(chartState.demo?'SIMULATED DEMO. ':'')+'Forecast uses sampled Coinbase spot and verified Kalshi contract close time when available. Early estimates use limited observations. Missing target/quotes produce unavailable metrics, never invented odds. No validated edge or fee-adjusted profit claim.</p>';
 if(estimate&&!chartState.demo&&market?.ticker){const key=market.ticker;const last=chartState.forecastLog.at(-1);if(!last||last.key!==key||now-last.at>=30000){chartState.forecastLog.push({key,at:now,phase,midpointForecast:midpointEstimate,price:estimate.start,projected:estimate.end,target:estimate.target,pUp:estimate.pUp,closeTime:market.closeTime});chartState.forecastLog=chartState.forecastLog.slice(-300)}}
}
async function updateBtcChart(){if(chartState.demo)return;try{const r=await fetch('/api/btc/spot',{cache:'no-store'});if(!r.ok)throw Error('spot');const d=await r.json();if(!d.ok||!Number.isFinite(d.price))throw Error('price');chartState.price=d.price;const at=Date.now();if(!chartState.samples.length||at>chartState.samples.at(-1).time)chartState.samples.push({price:d.price,time:at});chartState.samples=chartState.samples.slice(-480);chartState.status='LIVE · COINBASE REFERENCE'}catch{chartState.status='SPOT FEED OFFLINE'}broadcastFuturePath();drawBtcChart()}
async function updateKalshiChart(){try{const r=await fetch('/api/kalshi/btc15m',{cache:'no-store'});if(!r.ok)throw Error('market');const d=await r.json();chartState.market=d.market||null;chartState.marketUpdated=d.receivedAt||null}catch{chartState.market=null}broadcastFuturePath();drawBtcChart()}
const chartObserver=new MutationObserver(()=>{const card=document.querySelector('.chartcard');if(card&&!card.classList.contains('kalshi-card'))drawBtcChart()});
chartObserver.observe(document.getElementById('app'),{childList:true,subtree:true});
document.addEventListener('click',e=>{const demo=e.target.closest('[data-demo]');if(demo){chartState.demo=demo.dataset.demo==='on';chartState.samples=[];chartState.price=null;chartState.demoTick=0;if(chartState.demo)seedDemo();else{warmBtcHistory();updateBtcChart()}drawBtcChart();return}const v=e.target.closest('[data-venue]');if(v){chartState.venue=v.dataset.venue;drawBtcChart();return}const b=e.target.closest('[data-kalshi-period]');if(b){chartState.interval=b.dataset.kalshiPeriod;drawBtcChart()}});
function nextDemoSample(){if(!chartState.demo)return;const t=chartState.demoTick++,previous=chartState.price??70165;const price=previous+Math.sin(t/8)*2+Math.cos(t/3)*1.5;chartState.price=price;chartState.samples.push({price,time:Date.now()});chartState.samples=chartState.samples.slice(-480);chartState.status='SIMULATED DEMO';drawBtcChart()}
function seedDemo(){chartState.samples=[];const now=Date.now();let price=70165;for(let i=0;i<75;i++){price+=Math.sin(i/8)*2+Math.cos(i/3)*1.5;chartState.samples.push({price,time:now-(74-i)*15000})}chartState.price=price;drawBtcChart()}
setInterval(nextDemoSample,15000);setInterval(updateBtcChart,5000);setInterval(updateKalshiChart,15000);setInterval(()=>{if(document.querySelector('.chartcard')&&!document.hidden)drawBtcChart()},1000);
warmBtcHistory();updateBtcChart();updateKalshiChart();
