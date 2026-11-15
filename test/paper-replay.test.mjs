import test from 'node:test';import assert from 'node:assert/strict';import {replayPaperEvents} from '../research/paper-replay.mjs';
const f=(id,at,pYes=.9)=>({type:'forecast',id,ticker:'A',at,closeTime:'2026-11-15T18:15:00Z',target:100,pYes,yesAsk:.3,noAsk:.72,modelVersion:'frozen'});
const r=(outcome=1)=>({type:'resolution',id:'a',ticker:'A',at:'2026-11-15T18:17:00Z',source:'Kalshi resolved market result',outcome});
test('replay selects earliest forecast only and settles with verified-source outcome',()=>{const x=replayPaperEvents([f('a','2026-11-15T18:05:00Z'),f('b','2026-11-15T18:10:00Z',.1),r()],{modelVersion:'frozen'});assert.equal(x.decisions,1);assert.equal(x.settled,1);assert.equal(x.realOrdersPlaced,0);assert.equal(x.retrospective,true);});
test('unverified resolution source cannot settle',()=>{const x=replayPaperEvents([f('a','2026-11-15T18:05:00Z'),{...r(),source:'unverified'}]);assert.equal(x.unsettled,1);});
test('conflicting outcomes prevent settlement',()=>{const x=replayPaperEvents([f('a','2026-11-15T18:05:00Z'),r(1),r(0)]);assert.equal(x.settled,0);assert.equal(x.conflictedContracts,1);});
test('filters model version without relabeling',()=>{const x=replayPaperEvents([f('a','2026-11-15T18:05:00Z'),r()],{modelVersion:'different'});assert.equal(x.decisions,0);});

test('different forecast ID on same ticker cannot settle an earlier prediction',()=>{const x=replayPaperEvents([f('a','2026-11-15T18:05:00Z'),{...r(),id:'b'}]);assert.equal(x.settled,0);assert.equal(x.unsettled,1);});
test('resolution for another ticker cannot settle matching forecast ID',()=>{const x=replayPaperEvents([f('a','2026-11-15T18:05:00Z'),{...r(),ticker:'B'}]);assert.equal(x.settled,0);});
