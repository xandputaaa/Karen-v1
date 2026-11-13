import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('frontend does not relabel stale or unverified Kalshi data as live',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/data\.status==='STALE'/);
 assert.match(js,/data\.verified===true&&data\.market/);
 assert.match(js,/status==='STALE'\?'feed-offline'/);
 assert.match(js,/Market-implied quote \(not calibrated probability\)/);
});
