import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('source parses',()=>assert.doesNotThrow(()=>execFileSync(process.execPath,['--check','validation.mjs'])));
test('selective evaluation splits entries chronologically without claiming prospective holdout',()=>{
 assert.match(source,/ordered=selections\.slice\(\)\.sort/);
 assert.match(source,/Math\.floor\(ordered\.length\*\.7\)/);
 assert.match(source,/prospectiveFrozenHoldout:false/);
 assert.match(source,/chronologicalEvaluation,estimatedMeanNetPnlPerSelectedShare/);
});
