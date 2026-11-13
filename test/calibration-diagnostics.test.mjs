import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
const start=source.indexOf('function calibrationDiagnostics(finished){');
const end=source.indexOf('export function validationReport()',start);
assert.ok(start>=0&&end>start);
function run(rows,outcomes){const resolved=new Map(rows.map((p,i)=>[p.id,{outcome:outcomes[i]}]));const context=vm.createContext({resolved,Map,Array,Math,Date,Number,Set});vm.runInContext(source.slice(start,end),context);return vm.runInContext('calibrationDiagnostics',context)(rows)}
test('no settled contracts yields unavailable calibration, not invented zeros',()=>{const r=run([],[]);assert.equal(r.contracts,0);assert.equal(r.meanBrier,null);assert.equal(r.expectedCalibrationError,null);assert.equal(r.readyForInitialReview,false)});
test('one forecast per contract avoids correlated repeated snapshots',()=>{const rows=[{id:'a',ticker:'BTC1',at:'2026-01-01T00:00:00Z',pYes:.8},{id:'b',ticker:'BTC1',at:'2026-01-01T00:00:30Z',pYes:.1},{id:'c',ticker:'BTC2',at:'2026-01-01T00:00:00Z',pYes:.2}];const r=run(rows,[1,1,0]);assert.equal(r.contracts,2);assert.ok(Math.abs(r.meanBrier-.04)<1e-9);assert.equal(r.probabilityBuckets.reduce((n,b)=>n+b.count,0),2);assert.equal(r.accuracy,1);assert.ok(r.accuracyWilson95.lower<1)});
test('minimum sample gate requires 100 distinct contracts',()=>{const rows=Array.from({length:100},(_,i)=>({id:String(i),ticker:'BTC'+i,at:'2026-01-01T00:00:00Z',pYes:i%2?.75:.25}));const r=run(rows,rows.map((_,i)=>i%2));assert.equal(r.contracts,100);assert.equal(r.readyForInitialReview,true);assert.equal(r.prospectivelyValidated,false);assert.ok(r.expectedCalibrationError>=0)});
