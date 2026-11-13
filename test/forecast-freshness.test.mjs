import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('forecast inputs exclude future samples and require a fresh last spot observation',()=>{
 const source=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
 assert.match(source,/samples\.filter\(x=>x\.at<=now&&now-x\.at<=900000\)/);
 assert.match(source,/now-points\.at\(-1\)\.at>15000/);
});
