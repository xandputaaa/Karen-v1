import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('validation module parses',()=>assert.doesNotThrow(()=>execFileSync(process.execPath,['--check','validation.mjs'])));
test('selective historical policy is segmented by model version',()=>{
 assert.match(source,/selectiveNetEdgeAuditByModelVersion:Object\.fromEntries/);
 assert.match(source,/selectiveNetEdgeAudit\(finished\.filter\(p=>\(p\.modelVersion\|\|'LEGACY_UNVERSIONED'\)===version\)\)/);
});
