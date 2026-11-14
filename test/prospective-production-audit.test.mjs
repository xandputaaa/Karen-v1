import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
test('production audit reports prospective review progress separately from historical contracts',()=>{
 for(const key of ['prospectiveModelVersion','prospectiveSettledContracts','prospectiveReviewTarget','prospectiveReviewReady','prospectiveAccuracy','prospectiveHypotheticalSelected','prospectiveFillabilityVerified'])assert.ok(source.includes(key),key);
 assert.match(source,/prospectiveSettledContracts:v\.prospectiveShadowAudit\?\.contracts/);
 assert.match(source,/distinctResolvedContracts:v\.distinctResolvedContracts/);
});
