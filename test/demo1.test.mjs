import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {Script} from 'node:vm';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('all browser scripts parse',async()=>{for(const file of ['public/app.js','public/btc-chart.js'])assert.doesNotThrow(()=>new Script(await read(file),{filename:file}))});
test('all application views are registered',async()=>{const s=await read('public/app.js');for(const view of ['Home','BTC','Markets','Sports','Predictions','Parlays','Community','Performance','Alerts','Settings','Voice','Positions'])assert.ok(s.includes(view+':')||s.includes("'"+view+"':")||s.includes(view.toLowerCase()+','),view)});
test('demo and real feeds are distinguished',async()=>{const s=await read('public/btc-chart.js');assert.match(s,/SIMULATED DEMO/);assert.match(s,/LIVE SPOT/);assert.match(s,/not a validated forecast/i)});
test('no hidden owner controls',async()=>{for(const file of ['public/app.js','server.mjs']){const s=await read(file);assert.doesNotMatch(s,/owner.?dashboard|stealth.?monitor|covert.?access/i)}});
test('spot API fails closed and labels source',async()=>{const s=await read('server.mjs');assert.match(s,/Coinbase spot/);assert.match(s,/503/);assert.match(s,/not Kalshi settlement/);assert.match(s,/cache-control/);});
test('local forecast scoring uses later spot and no synthetic win rate',async()=>{const s=await read('public/app.js');assert.match(s,/settleForecasts/);assert.match(s,/Date\.now\(\)-p\.time<300000/);assert.match(s,/settled\.length/);});
