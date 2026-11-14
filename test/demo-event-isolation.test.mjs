import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public/btc-chart.js',import.meta.url),'utf8');
test('broadcastFuturePath exits during demo or non-Kalshi venue',()=>{
 assert.match(code,/function broadcastFuturePath\(\)\{[\s\S]*?if\(chartState\.demo\|\|chartState\.venue!==['"]Kalshi['"]\)return;/);
});
test('render forecast events require real Kalshi context',()=>{
 assert.match(code,/if\(!chartState\.demo&&chartState\.venue==='Kalshi'\)window\.dispatchEvent/);
 assert.match(code,/experimental:true,demo:false/);
});
