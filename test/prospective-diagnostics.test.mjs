import test from 'node:test';
import assert from 'node:assert/strict';
import {prospectiveDiagnostics,wilsonInterval} from '../research/prospective-diagnostics.mjs';
const f=(id,ticker,at,pYes,modelVersion='frozen')=>({type:'forecast',id,ticker,at,closeTime:'2026-11-15T12:15:00Z',pYes,remainingSeconds:600,modelVersion});
const r=(id,ticker,outcome)=>({type:'resolution',id,ticker,at:'2026-11-15T12:17:00Z',outcome});
test('deduplicates snapshots by contract, choosing earliest not most accurate',()=>{
 const e=[f('a','A','2026-11-15T12:05:00Z',.9),f('b','A','2026-11-15T12:06:00Z',.1),r('a','A',0),r('b','A',0)];
 const d=prospectiveDiagnostics(e);assert.equal(d.settled,1);assert.equal(d.accuracy,0);assert.equal(d.confusion.falseUp,1);
});
test('pending, mismatched and invalid records cannot become wins',()=>{
 const e=[f('a','A','2026-11-15T12:05:00Z',.8),f('b','B','2026-11-15T12:05:00Z',.2),r('a','WRONG',1),f('bad','C','2026-11-15T12:16:00Z',.5)];
 const d=prospectiveDiagnostics(e);assert.equal(d.settled,0);assert.equal(d.pending,1);assert.equal(d.mismatched,1);assert.equal(d.invalid.forecast,1);assert.equal(d.accuracy,null);
});
test('horizon and model version filtering; correct Brier and baselines',()=>{
 const e=[f('a','A','2026-11-15T12:05:00Z',.8),r('a','A',1),f('b','B','2026-11-15T12:05:00Z',.3),r('b','B',0),f('c','C','2026-11-15T12:05:00Z',.9,'other'),r('c','C',0)];
 const d=prospectiveDiagnostics(e,{modelVersion:'frozen',horizonSeconds:600});assert.equal(d.settled,2);assert.equal(d.accuracy,1);assert.ok(Math.abs(d.brier-.065)<1e-12);assert.equal(d.alwaysUpAccuracy,.5);assert.equal(d.calibration.reduce((s,x)=>s+x.count,0),2);
});
test('Wilson interval bounds and empty cohort',()=>{assert.equal(wilsonInterval(0,0),null);assert.equal(prospectiveDiagnostics([]).accuracy,null);assert.ok(wilsonInterval(5,10).lower<.5);assert.throws(()=>wilsonInterval(11,10));});
