// Chronological walk-forward evaluator. Only settled outcomes update weights.
export function walkForward(contracts,{learningRate=.012}={}){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const sigmoid=x=>1/(1+Math.exp(-clamp(x,-30,30)));
 let weights=[0,0,0,0],lastEnd=-Infinity;const results=[];
 for(const c of [...contracts].sort((a,b)=>a.start-b.start)){
  if(c.start<lastEnd)throw Error('Overlapping contracts: chronological nonoverlap required');
  if(![0,1].includes(c.outcome)||!Number.isFinite(c.target)||c.target<=0)throw Error('Verified target and settled outcome required');
  const times=[c.start+30000,c.start+(c.end-c.start)/2,c.end-30000];
  const forecasts=times.map(at=>{const h=c.prices.filter(p=>p.time<=at);if(h.length<2)return null;const first=h[0].price,p=h.at(-1).price;
   const x=[1,clamp((p-c.target)/c.target*1000,-10,10),clamp((p-first)/first*1000,-10,10),clamp((at-c.start)/(c.end-c.start),0,1)];
   const pYes=sigmoid(weights.reduce((sum,w,i)=>sum+w*x[i],0));return {at,pYes,x,brier:(pYes-c.outcome)**2};
  }).filter(Boolean);
  if(!forecasts.length)throw Error('Insufficient timestamped observations');
  results.push({id:c.id,outcome:c.outcome,weightsBefore:[...weights],forecasts:forecasts.map(({at,pYes,brier})=>({at,pYes,brier}))});
  // Outcomes are not used until ALL predictions for this contract have been made.
  for(const f of forecasts){const err=f.pYes-c.outcome;weights=weights.map((w,i)=>clamp(w-learningRate*err*f.x[i],-5,5))}
  lastEnd=c.end;
 }
 const scored=results.flatMap(r=>r.forecasts);
 return {contracts:results.length,forecasts:scored.length,brier:scored.length?scored.reduce((sum,x)=>sum+x.brier,0)/scored.length:null,weights,results,validated:false};
}

/** Strict chronological holdout. Training never updates parameters using test outcomes. */
export function evaluateHoldout(contracts,{trainFraction=.7,learningRate=.012}={}){
 if(!(trainFraction>.1&&trainFraction<.9))throw Error('trainFraction must be between .1 and .9');
 const sorted=[...contracts].sort((a,b)=>a.start-b.start);
 if(sorted.length<20)throw Error('At least 20 independently settled contracts required');
 const cut=Math.floor(sorted.length*trainFraction),train=sorted.slice(0,cut),test=sorted.slice(cut);
 if(train.at(-1).end>test[0].start)throw Error('Train/test contracts overlap');
 const fit=walkForward(train,{learningRate});
 const weights=fit.weights.slice(),sigmoid=x=>1/(1+Math.exp(-Math.max(-30,Math.min(30,x))));
 const predictions=[];
 for(const c of test){
  if(![0,1].includes(c.outcome)||!Number.isFinite(c.target)||c.target<=0)throw Error('Verified settlement outcome required');
  for(const at of [c.start+30000,c.start+(c.end-c.start)/2,c.end-30000]){
   const h=c.prices.filter(p=>p.time<=at);
   if(h.length<2)continue;
   const first=h[0].price,p=h.at(-1).price,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
   const x=[1,clamp((p-c.target)/c.target*1000,-10,10),clamp((p-first)/first*1000,-10,10),clamp((at-c.start)/(c.end-c.start),0,1)];
   const probability=sigmoid(weights.reduce((sum,w,i)=>sum+w*x[i],0));
   predictions.push({contract:c.id,at,probability,outcome:c.outcome,brier:(probability-c.outcome)**2,phase:at<c.start+(c.end-c.start)/2?'OPENING':at===c.start+(c.end-c.start)/2?'MIDPOINT':'CLOSING'});
  }
 }
 const brier=rows=>rows.length?rows.reduce((sum,x)=>sum+x.brier,0)/rows.length:null;
 const baseline=predictions.length?predictions.reduce((sum,x)=>sum+(0.5-x.outcome)**2,0)/predictions.length:null;
 return {validated:false,trainingContracts:train.length,testContracts:test.length,trainingEnd:train.at(-1).end,testStart:test[0].start,modelBrier:brier(predictions),coinFlipBaselineBrier:baseline,beatsCoinFlipBaseline:predictions.length?brier(predictions)<baseline:null,phaseScores:Object.fromEntries(['OPENING','MIDPOINT','CLOSING'].map(phase=>[phase,{count:predictions.filter(x=>x.phase===phase).length,brier:brier(predictions.filter(x=>x.phase===phase))}])),frozenWeights:weights,predictions,limitations:'No training on test outcomes. Must compare to timestamped market prices and assess independent contracts, fees, calibration and uncertainty.'};
}
