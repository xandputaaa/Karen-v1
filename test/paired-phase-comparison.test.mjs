import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
const start=source.indexOf('function pairedPhaseComparison(finished){');
const end=source.indexOf('function chronologicalHoldout(finished){',start);
assert.ok(start>=0&&end>start);
function run(rows,outcomes){const resolved=new Map(rows.map((p,i)=>[p.id,{outcome:outcomes[i]}]));const context=vm.createContext({resolved});vm.runInContext(source.slice(start,end),context);return vm.runInContext('pairedPhaseComparison',context)(rows)}
test('no matched phases produces null metrics',()=>{const r=run([],[]);assert.equal(r.pairedContracts,0);assert.equal(r.firstHalfBrier,null);assert.equal(r.secondHalfAccuracy,null)});
test('pairs one earliest snapshot per phase and same contract',()=>{const rows=[{id:'a',ticker:'A',phase:'FIRST_HALF',at:'2026-01-01T00:00:00Z',pYes:.4},{id:'b',ticker:'A',phase:'FIRST_HALF',at:'2026-01-01T00:01:00Z',pYes:.99},{id:'c',ticker:'A',phase:'SECOND_HALF',at:'2026-01-01T00:08:00Z',pYes:.8},{id:'d',ticker:'B',phase:'SECOND_HALF',at:'2026-01-01T00:08:00Z',pYes:.1}];const r=run(rows,[1,1,1,0]);assert.equal(r.pairedContracts,1);assert.ok(Math.abs(r.firstHalfBrier-.36)<1e-9);assert.ok(Math.abs(r.secondHalfBrier-.04)<1e-9);assert.equal(r.firstHalfAccuracy,0);assert.equal(r.secondHalfAccuracy,1);assert.equal(r.validated,false)});
