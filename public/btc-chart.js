const chartState={samples:[],price:null,status:'CONNECTING',interval:'LIVE'};
const fmt=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function drawBtcChart(){
 const card=document.querySelector('.chartcard');if(!card)return;
 const data=chartState.samples.slice(-100),valid=data.length>=2;
 const values=data.map(x=>x.price),lo=valid?Math.min(...values):0,hi=valid?Math.max(...values):1;
 const padding=Math.max((hi-lo)*.2,1),min=lo-padding,max=hi+padding;
 const points=data.map((p,i)=>({x:12+i*670/Math.max(1,data.length-1),y:263-(p.price-min)/(max-min)*215}));
 const path=points.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 const end=points[points.length-1],area=valid?path+' L '+end.x+' 278 L 12 278 Z':'';
 const ticks=valid?[max,(min+max)/2,min].map(fmt):['—','—','—'];
 card.classList.add('kalshi-card');card.innerHTML='<div class="kalshi-head"><div class="kalshi-heading"><span class="kalshi-btc-icon">₿</span><strong>BTC 15 min</strong><span class="kalshi-countdown">LIVE</span></div><div class="kalshi-prices"><div><small>Kalshi target</small><strong>NOT VERIFIED</strong></div><div><small>Now · Coinbase spot</small><strong>'+(chartState.price?fmt(chartState.price):'—')+'</strong></div></div></div>'+
 '<div class="kalshi-graph"><svg viewBox="0 0 790 300" preserveAspectRatio="none" role="img" aria-label="Live Bitcoin spot price samples"><defs><linearGradient id="kalshiOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9817" stop-opacity=".36"/><stop offset="1" stop-color="#ff9817" stop-opacity="0"/></linearGradient></defs>'+
 [48,156,264].map((y,i)=>'<line x1="0" x2="698" y1="'+y+'" y2="'+y+'" stroke="#ffffff18"/><text x="716" y="'+(y+5)+'" fill="#8d8e91" font-size="17">'+ticks[i]+'</text>').join('')+
 (valid?'<path d="'+area+'" fill="url(#kalshiOrange)"/><path d="'+path+'" fill="none" stroke="#ff9817" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" class="kalshi-price-line"/><circle cx="'+end.x+'" cy="'+end.y+'" r="15" fill="#ff9817" opacity=".09" class="kalshi-pulse"/><circle cx="'+end.x+'" cy="'+end.y+'" r="7" fill="#ff9817"/>':'')+
 '</svg>'+(!valid?'<div class="kalshi-placeholder">Waiting for verified BTC samples<small>The line begins moving as real spot updates arrive.</small></div>':'')+'</div>'+
 '<div class="kalshi-foot"><span class="kalshi-live-dot"></span><span>'+chartState.status+'</span><div class="kalshi-periods">'+['LIVE','5M','15M','1H'].map(t=>'<button type="button" data-kalshi-period="'+t+'" class="'+(chartState.interval===t?'active':'')+'">'+t+'</button>').join('')+'</div></div>'+
 '<p class="kalshi-disclaimer">Live sampled Coinbase BTC/USD spot price · approximately 15-second updates. Not Kalshi contract prices, settlement target, or Up/Down odds. Historical chart builds only while this page is open.</p>';
}
async function updateBtcChart(){try{const r=await fetch('/api/btc/spot',{cache:'no-store'});if(!r.ok)throw Error('feed');const d=await r.json();if(!d.ok||!Number.isFinite(d.price))throw Error('price');chartState.price=d.price;chartState.samples.push({price:d.price,time:Date.now()});chartState.samples=chartState.samples.slice(-240);chartState.status='LIVE · COINBASE SPOT'}catch{chartState.status='SPOT FEED OFFLINE'}drawBtcChart()}
const chartObserver=new MutationObserver(()=>{const card=document.querySelector('.chartcard');if(card&&!card.classList.contains('kalshi-card'))drawBtcChart()});
chartObserver.observe(document.getElementById('app'),{childList:true,subtree:true});
document.addEventListener('click',e=>{const b=e.target.closest('[data-kalshi-period]');if(!b)return;chartState.interval=b.dataset.kalshiPeriod;drawBtcChart()});
updateBtcChart();setInterval(updateBtcChart,15000);
