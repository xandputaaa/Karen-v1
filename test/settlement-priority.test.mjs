import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('resolution retries include recent contracts even with historical backlog',()=>{
 assert.match(s,/sort\(\(a,b\)=>Date\.parse\(a\.closeTime\)-Date\.parse\(b\.closeTime\)\)/);
 assert.match(s,/unresolved\.length<=3\?unresolved:\[unresolved\[0\],\.\.\.unresolved\.slice\(-2\)\]/);
});
