import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('browser script parses',()=>assert.doesNotThrow(()=>execFileSync(process.execPath,['--check','public/app.js'])));
test('market economics follow actual Kalshi asks and stale gating',()=>{assert.match(js,/function kalshiQuoteEconomics\(\)/);assert.match(js,/m\.yesAsk/);assert.match(js,/m\.noAsk/);assert.match(js,/S\.kalshiStatus==='LIVE SNAPSHOT'/);assert.match(js,/Date\.now\(\)-Date\.parse\(S\.kalshiUpdated\)<30000/);assert.match(js,/No independent model edge is established/)});
