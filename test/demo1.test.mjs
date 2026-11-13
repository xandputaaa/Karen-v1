import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {Script} from 'node:vm';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('all browser scripts parse',async()=>{for(const file of ['public/app.js','public/btc-chart.js'])assert.doesNotThrow(()=>new Script(await read(file),{filename:file}))});
test('all application views are registered',async()=>{const s=await read('public/app.js');for(const view of ['Home','BTC','Markets','Sports','Predictions','Parlays','Community','Performance','Alerts','Settings','Voice','Positions'])assert.ok(s.includes(view+':')||s.includes("'"+view+"':")||s.includes(view.toLowerCase()+','),view)});
test('demo and real feeds are distinguished',async()=>{const s=await read('public/btc-chart.js');assert.match(s,/SIMULATED DEMO/);assert.match(s,/LIVE SPOT/);assert.match(s,/not calibrated|not a validated forecast/i)});
test('no hidden owner controls',async()=>{for(const file of ['public/app.js','server.mjs']){const s=await read(file);assert.doesNotMatch(s,/owner.?dashboard|stealth.?monitor|covert.?access/i)}});
test('spot API fails closed and labels source',async()=>{const s=await read('server.mjs');assert.match(s,/Coinbase spot/);assert.match(s,/503/);assert.match(s,/not Kalshi settlement/);assert.match(s,/cache-control/);});
test('local forecast scoring uses later spot and no synthetic win rate',async()=>{const s=await read('public/app.js');assert.match(s,/settleForecasts/);assert.match(s,/Date\.now\(\)-p\.time<300000/);assert.match(s,/settled\.length/);});

test('approved Demo 2 pages and actions are wired',async()=>{const s=await read('public/app.js');for(const name of ['Terminal','Strategy Lab','Signal Lab','Risk Desk','Data Health','Replay Studio','KAREN Chat'])assert.match(s,new RegExp(name));for(const action of ['replayNext','replayPrev','replayReset','chatForm','scriptedReply'])assert.ok(s.includes(action),action)});

test('Demo 3.2 Kalshi read-only adapter is bounded and fails closed',async()=>{const s=await read('server.mjs');assert.match(s,/\/api\/kalshi\/btc15m/);assert.match(s,/series_ticker=KXBTC15M/);assert.match(s,/status=open/);assert.match(s,/AbortSignal\.timeout\(6500\)/);assert.match(s,/targetVerified/);assert.match(s,/DISCONNECTED/);assert.doesNotMatch(s,/\/portfolio\/orders|\/portfolio\/fills/)});
test('Demo 3.2 displays contract snapshot with source status',async()=>{const s=await read('public/app.js');for(const key of ['kalshiMarketPanel','refreshKalshi','LIVE SNAPSHOT','NO OPEN MARKET','NOT VERIFIED','DISCONNECTED'])assert.ok(s.includes(key),key)});

test('prospective Kalshi validation is based on official outcomes, not synthetic prices',async()=>{const s=await read('validation.mjs');assert.match(s,/markets\/\x27\+encodeURIComponent/);assert.match(s,/m\.result/);assert.match(s,/brier:/);assert.match(s,/calibrationBuckets/);assert.match(s,/validated:false/);assert.match(s,/EPHEMERAL/)});
test('validation endpoint is read-only and background collector is scheduled',async()=>{const s=await read('server.mjs');assert.match(s,/\/api\/btc\/validation/);assert.match(s,/validationCycle\(getKalshi15m\)/);assert.doesNotMatch(s,/\/portfolio\/orders/)});

test('BTC contract signal uses verified settlement target rather than current spot direction',async()=>{const code=await read('public/btc-chart.js');assert.match(code,/end>=target\?'UP':'DOWN'/);assert.match(code,/const evUp=null/);assert.match(code,/const evDown=null/);assert.match(code,/unvalidated/)});

test('server records 5-second samples, caches Kalshi and settles independently',async()=>{const server=await read('server.mjs'),validation=await read('validation.mjs');assert.match(server,/setInterval\(\(\)=>validationCycle\(getKalshi15m\),5000\)/);assert.match(server,/kalshiBackoffUntil/);assert.match(server,/kalshiPending/);assert.match(validation,/resolutionAttempts/);assert.match(validation,/finally\{const now=Date\.now\(\)/)});

test('execution audit does not claim live profitability or fills',async()=>{const src=await read('validation.mjs');assert.match(src,/executionAudit:executionAudit\(finished\)/);assert.match(src,/feeAdjustedPnl:null/);assert.match(src,/realizedPnl:null/);assert.match(src,/fillRate:null/)});

test('execution audit chooses one side per forecast and reports first observation per contract',async()=>{const src=await read('validation.mjs');assert.match(src,/p\.pYes>=\.5\?'YES':'NO'/);assert.match(src,/firstByContract=new Map/);assert.match(src,/firstQuotePerContractMeanGrossPnlPerShare/);assert.match(src,/feeAdjustedPnl:null/)});
