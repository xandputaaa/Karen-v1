import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const src=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('validation module syntax parses',()=>assert.doesNotThrow(()=>execFileSync(process.execPath,['--check','validation.mjs'])));
test('fee evidence counts one observation per resolved contract',()=>{assert.match(src,/const independent=\[\.\.\.firstByContract\.values\(\)\]/);assert.match(src,/const netOutcomes=independent\.map/);assert.match(src,/approximate95Interval/);assert.match(src,/minimumContractsForReview:100/);assert.match(src,/demonstratedTradableEdge:false/);assert.match(src,/feeScheduleVerified:false/);assert.match(src,/fillabilityVerified:false/);assert.match(src,/modelFrozenProspectively:false/)});
