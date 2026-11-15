// Pure, read-only diagnostics. Input is a sequence of timestamped forecast and resolution events.
// Never infer a missing outcome or treat repeated snapshots as independent contracts.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function wilsonInterval(successes,n,z=1.96){
 if(!Number.isInteger(n)||n<0||!Number.isInteger(successes)||successes<0||successes>n)throw Error('Invalid binomial counts');
 if(!n)return null;
 const p=successes/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
 return {lower:Math.max(0,c-h),upper:Math.min(1,c+h)};
}
export function prospectiveDiagnostics(events,{modelVersion=null,horizonSeconds=null}={}){
 const forecasts=new Map(),resolutions=new Map(),invalid={forecast:0,resolution:0};
 for(const e of events){
  if(!e||typeof e.id!=='string'||typeof e.ticker!=='string')continue;
  if(e.type==='forecast'){
   const at=Date.parse(e.at),close=Date.parse(e.closeTime);
   if(!Number.isFinite(at)||!Number.isFinite(close)||at>=close||!finite(e.pYes)||e.pYes<0||e.pYes>1){invalid.forecast++;continue}
   if(modelVersion!==null&&e.modelVersion!==modelVersion)continue;
   if(horizonSeconds!==null&&(!finite(e.remainingSeconds)||Math.abs(e.remainingSeconds-horizonSeconds)>15))continue;
   if(!forecasts.has(e.id))forecasts.set(e.id,e);
  }else if(e.type==='resolution'){
   if(e.outcome!==0&&e.outcome!==1){invalid.resolution++;continue}
   if(!resolutions.has(e.id))resolutions.set(e.id,e);
  }
 }
 // Earliest qualifying forecast per ticker; never cherry-pick later forecasts.
 const first=new Map();
 for(const p of forecasts.values()){
  const prev=first.get(p.ticker);
  if(!prev||Date.parse(p.at)<Date.parse(prev.at))first.set(p.ticker,p);
 }
 const rows=[];let pending=0,mismatched=0;
 for(const p of first.values()){
  const r=resolutions.get(p.id);
  if(!r){pending++;continue}
  if(r.ticker!==p.ticker||Date.parse(r.at)<Date.parse(p.closeTime)){mismatched++;continue}
  rows.push({p:p.pYes,y:r.outcome,side:p.pYes>=.5?1:0});
 }
 const n=rows.length,correct=rows.filter(x=>x.side===x.y).length;
 const confusion={trueUp:0,falseUp:0,trueDown:0,falseDown:0};
 for(const x of rows){if(x.side===1&&x.y===1)confusion.trueUp++;else if(x.side===1)confusion.falseUp++;else if(x.y===0)confusion.trueDown++;else confusion.falseDown++}
 const up=rows.filter(x=>x.y===1).length;
 const bins=Array.from({length:10},(_,i)=>{const selected=rows.filter(x=>Math.min(9,Math.floor(x.p*10))===i);return {range:[i/10,(i+1)/10],count:selected.length,meanForecast:selected.length?selected.reduce((a,x)=>a+x.p,0)/selected.length:null,observedUpRate:selected.length?selected.reduce((a,x)=>a+x.y,0)/selected.length:null}});
 return {unit:'one earliest eligible forecast per ticker',modelVersion,horizonSeconds,contracts:first.size,settled:n,pending,mismatched,invalid,correct,accuracy:n?correct/n:null,accuracy95Wilson:wilsonInterval(correct,n),upBaseRate:n?up/n:null,alwaysUpAccuracy:n?up/n:null,alwaysDownAccuracy:n?1-up/n:null,brier:n?rows.reduce((a,x)=>a+(x.p-x.y)**2,0)/n:null,confusion,calibration:bins,validated:false,tradableEdgeDemonstrated:false};
}
