import test from 'node:test';
import assert from 'node:assert/strict';
import {addSpotObservation,spotDiagnostics} from '../spot-diagnostics.mjs';
test('rejects invalid and stale spot observations',()=>{assert.equal(addSpotObservation(-1),false);assert.equal(addSpotObservation(100,Date.now()-60000),false)});
test('collects server observations and rejects duplicate timestamp',()=>{const now=Date.now();assert.equal(addSpotObservation(100,now-20000),true);assert.equal(addSpotObservation(101,now-20000),false);const r=spotDiagnostics(now);assert.equal(r.status,'COLLECTING');assert.equal(r.sampleCount,1);assert.equal(r.validated,false)});
test('stale server data cannot be represented as live',()=>{const r=spotDiagnostics(Date.now()+60000);assert.equal(r.status,'STALE');assert.equal(r.momentum,null)});
