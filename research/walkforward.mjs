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
