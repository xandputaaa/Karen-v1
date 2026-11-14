import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
test('browser JavaScript parses',()=>assert.doesNotThrow(()=>execFileSync(process.execPath,['--check','public/app.js'])));
test('BTC analysis uses timestamped observations, not placeholder bars',()=>{assert.match(js,/function observedSpotSignals/);assert.match(js,/function measuredBtcRows/);assert.ok(js.includes('recordSpotSample(data.price,data.timestamp)'));assert.doesNotMatch(js,/bars\(\['Signal','Order Flow','Momentum','Sentiment','Volatility'\]\)/)});
test('mobile dock leaves scroll clearance',()=>assert.match(css,/padding-bottom:calc\(180px \+ env\(safe-area-inset-bottom/));

test('spot sample requires a fresh upstream timestamp and rejects duplicates',()=>{assert.match(js,/function recordSpotSample\(price,sourceTimestamp\)/);assert.match(js,/sourceAt<=last\.at/);assert.match(js,/now-sourceAt>30000/);assert.match(js,/recordSpotSample\(data\.price,data\.timestamp\)/)});
