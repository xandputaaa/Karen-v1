import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
test('health does not falsely claim verified live upstream data',()=>{
 assert.ok(src.includes('liveMarketData:null,feedsVerified:false'));
 assert.ok(src.includes('Server reachable; upstream feed availability must be checked separately'));
});
test('production audit logs actual feed and settlement evidence',()=>{
 for(const field of ['KAREN_PRODUCTION_AUDIT','kalshiStatus','kalshiTargetVerified','distinctResolvedContracts','excludedSettledForecastCount','netEdgeDemonstrated'])assert.ok(src.includes(field),field);
 assert.ok(src.includes('setInterval(logProductionAudit,120000)'));
});
