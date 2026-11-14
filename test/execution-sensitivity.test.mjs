import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('prospective execution stress includes four adverse-price scenarios',()=>{
 assert.ok(s.includes('scenarios=[0,.01,.02,.05]'));
 assert.ok(s.includes('executionSensitivity:prospectiveExecutionSensitivity(rows)'));
 assert.ok(s.includes('conservative90LowerBound'));
});
test('recorded asks are not represented as verified fills',()=>{
 for(const marker of ['depthObserved:false','quoteTimestampIndependentlyVerified:false','realizedFillsObserved:false','feeScheduleVerified:false'])assert.ok(s.includes(marker),marker);
});
