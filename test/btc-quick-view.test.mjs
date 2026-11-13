import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('BTC quick view distinguishes spot reference from settlement target',()=>{
 const code=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(code,/function btcQuickView\(\)/);
 assert.match(code,/S\.kalshiStatus==='LIVE SNAPSHOT'&&m\?\.targetVerified/);
 assert.match(code,/COINBASE SPOT · REFERENCE/);
 assert.match(code,/Coinbase reference is not the Kalshi settlement index/);
 assert.match(code,/btcQuickView\(\)\+kalshiMarketPanel\(\)/);
});
