import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('malformed ESPN response is rejected, not presented as an empty live slate',()=>{
 const code=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(code,/if\(!Array\.isArray\(payload\?\.events\)\)throw Error\('Invalid ESPN scoreboard payload: events missing'\)/);
 assert.match(code,/status:'STALE'/);
 assert.match(code,/sportsRetryAt\.set\(league,Date\.now\(\)\+30000\)/);
});
