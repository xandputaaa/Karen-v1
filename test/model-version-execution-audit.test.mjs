import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('validation source parses',()=>assert.doesNotThrow(()=>execFileSync(process.execPath,['--check','validation.mjs'])));
test('execution audits separate model versions and legacy events',()=>{
 assert.match(source,/executionAuditByModelVersion:Object\.fromEntries/);
 assert.match(source,/p\.modelVersion\|\|'LEGACY_UNVERSIONED'/);
 assert.match(source,/executionAudit\(finished\.filter\(p=>/);
});
