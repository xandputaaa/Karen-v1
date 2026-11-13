import test from 'node:test';import assert from 'node:assert/strict';import {walkForward,evaluateHoldout} from '../research/walkforward.mjs';
const make=i=>({id:String(i),start:i*900000,end:(i+1)*900000,target:100,prices:Array.from({length:31},(_,j)=>({time:i*900000+j*30000,price:100+(i%2?1:-1)*j*.03})),outcome:i%2});
test('walk-forward predictions cannot see future contract outcome',()=>{const data=Array.from({length:120},(_,i)=>make(i));const a=walkForward(data);const altered=structuredClone(data);altered[119].outcome=1-altered[119].outcome;const b=walkForward(altered);assert.equal(a.forecasts,360);assert.deepEqual(a.results.slice(0,-1),b.results.slice(0,-1));assert.deepEqual(a.results.at(-1).forecasts,b.results.at(-1).forecasts.map((x,i)=>({...x,brier:a.results.at(-1).forecasts[i].brier})));assert.equal(a.validated,false)});
test('overlapping contracts rejected',()=>assert.throws(()=>walkForward([make(0),{...make(0),id:'duplicate'}]),/Overlapping/));

test('holdout does not learn from unseen test outcomes',()=>{
 const data=Array.from({length:100},(_,i)=>make(i));
 const a=evaluateHoldout(data),altered=structuredClone(data);
 for(let i=70;i<100;i++)altered[i].outcome=1-altered[i].outcome;
 const b=evaluateHoldout(altered);
 assert.deepEqual(a.frozenWeights,b.frozenWeights);
 assert.deepEqual(a.predictions.map(x=>x.probability),b.predictions.map(x=>x.probability));
 assert.equal(a.trainingContracts,70);
 assert.equal(a.testContracts,30);
 assert.equal(a.validated,false);
 assert.ok(a.modelBrier!==null);
});
