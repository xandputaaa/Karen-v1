import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const chart=readFileSync(new URL('../public/btc-chart.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
test('demo cannot inherit verified Kalshi market context',()=>{
 assert.ok(chart.includes("const market=!chartState.demo&&chartState.venue==='Kalshi'?chartState.market:null;"));
 assert.ok(chart.includes('Demo target · not supplied'));
 assert.ok(chart.includes('Now · simulated BTC'));
});
test('Kalshi countdown is capped at 15 minutes and demo is explicit',()=>{
 assert.ok(chart.includes('Math.min(900,Math.max(0,(close-now)/1000))'));
 assert.ok(chart.includes("chartState.demo?'DEMO · '"));
});
test('future chart preserves geometry and mobile content clears navigation',()=>{
 assert.ok(chart.includes('preserveAspectRatio="xMidYMid meet"'));
 assert.ok(css.includes('.kalshi-graph{height:260px;min-height:260px}'));
 assert.ok(css.includes('padding-bottom:calc(220px + env(safe-area-inset-bottom'));
});
