import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatedTakerFeePerShare} from '../validation.mjs';
test('general taker fee rounds to centicent for one contract',()=>{
 assert.equal(estimatedTakerFeePerShare(.5),.0175);
 assert.equal(estimatedTakerFeePerShare(.1),.0063);
 assert.equal(estimatedTakerFeePerShare(.74),.0135);
});
test('reject invalid quote prices',()=>{
 for(const p of [NaN,Infinity,-1,0,1,2])assert.equal(estimatedTakerFeePerShare(p),null);
});
