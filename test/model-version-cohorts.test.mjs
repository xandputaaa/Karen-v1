import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('model version cohort metrics are contract independent and labeled unvalidated',()=>{
 const source=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
 assert.match(source,/firstEligibleForecastPerContract:independent\.length/);
 assert.match(source,/firstForecastMeanBrier:/);
 assert.match(source,/firstForecastDirectionalAccuracy:/);
 assert.match(source,/first eligible pre-close forecast per contract for this version/);
 assert.match(source,/prospectiveValidationEstablished:false/);
 assert.match(source,/LEGACY_UNVERSIONED/);
});
