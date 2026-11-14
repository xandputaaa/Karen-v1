import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('validation source parses',()=>assert.doesNotThrow(()=>execFileSync(process.execPath,['--check','validation.mjs'])));
test('selective policy uses earliest snapshot and abstains without positive net edge',()=>{
 assert.match(source,/function selectiveNetEdgeAudit\(finished\)/);
 assert.match(source,/Date\.parse\(p\.at\)<Date\.parse\(old\.at\)/);
 assert.match(source,/if\(edge<=0\)\{abstained\+\+;continue\}/);
 assert.match(source,/selectiveNetEdgeAudit:selectiveNetEdgeAudit\(finished\)/);
 assert.match(source,/demonstratedTradableEdge:false/);
});
