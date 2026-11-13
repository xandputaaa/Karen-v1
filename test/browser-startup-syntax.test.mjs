import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('both browser scripts parse without JavaScript syntax errors',()=>{
 for(const file of ['public/app.js','public/btc-chart.js']){
  assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',file],{stdio:'pipe'}),file);
 }
});
test('validation refresh is asynchronous',()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(source,/async function refreshValidation\(\)/);
});
