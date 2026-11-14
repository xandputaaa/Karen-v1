import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('new prospective model version cannot inherit legacy results',()=>{
 assert.ok(src.includes("MODEL_VERSION='btc15-v1-prospective-frozen-20261113'"));
 assert.ok(src.includes('p.modelVersion===MODEL_VERSION&&Date.parse(p.at)>=Date.parse(PROSPECTIVE_START)'));
 assert.ok(src.includes('const first=new Map()'));
 assert.ok(src.includes('prospectiveShadowAudit:prospectiveShadowAudit(finished)'));
});
test('shadow evaluation never claims a validated tradable advantage',()=>{
 for(const guard of ['minimumContractsForReview:100','feeScheduleVerified:false','actualFillabilityVerified:false','realMoneyEdgeEstablished:false','modelCodeImmutableIndependentlyVerified:false'])assert.ok(src.includes(guard),guard);
});
