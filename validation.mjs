import {readFile,appendFile,mkdir,writeFile,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
const path=process.env.KAREN_FORECAST_LOG_PATH||'/tmp/karen-forecast-events.jsonl';
const base='https://external-api.kalshi.com/trade-api/v2';
const samples=[],predictions=new Map(),resolved=new Map(),resolutionAttempts=new Map();
let running=false,lastError=null,lastCycle=null,storageError=null,historyLoaded=false,malformedEvents=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const erf=x=>{const s=x<0?-1:1,z=Math.abs(x),t=1/(1+.3275911*z);return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z))};
const cdf=x=>.5*(1+erf(x/Math.sqrt(2)));
async function event(obj){try{await mkdir(dirname(path),{recursive:true});await appendFile(path,JSON.stringify(obj)+'\n',{flag:'a'});storageError=null}catch(e){storageError=e.message;throw e}}
export async function loadForecastHistory(){
 try{
  const content=await readFile(path,'utf8');
  for(const line of content.split('\n')){
   if(!line.trim())continue;
   try{
    const x=JSON.parse(line);
    if(x.type==='forecast'&&typeof x.id==='string')predictions.set(x.id,x);
    else if(x.type==='resolution'&&typeof x.id==='string')resolved.set(x.id,x);
    else malformedEvents++;
   }catch{malformedEvents++}
  }
 }catch(e){if(e.code!=='ENOENT'){storageError=e.message;lastError=e.message}}
 historyLoaded=true;
}

function makeForecast(m){if(!m?.targetVerified||!Number.isFinite(m.target)||!Number.isFinite(Date.parse(m.closeTime)))return null;const now=Date.now(),remaining=(Date.parse(m.closeTime)-now)/1000;if(remaining<=0||remaining>900)return null;const points=samples.filter(x=>now-x.at<=900000);if(points.length<7)return null;const returns=[];for(let i=1;i<points.length;i++){const dt=(points[i].at-points[i-1].at)/1000;if(dt>=5&&dt<=90)returns.push({dt,r:Math.log(points[i].price/points[i-1].price)})}if(returns.length<6)return null;const time=returns.reduce((a,x)=>a+x.dt,0),sum=returns.reduce((a,x)=>a+x.r,0);const drift=clamp(sum/time,-.00002,.00002)*.15;const sigma=Math.max(.00002,Math.sqrt(returns.reduce((a,x)=>a+(x.r-drift*x.dt)**2,0)/time));const spot=points.at(-1).price;const z=(Math.log(m.target/spot)-drift*remaining)/(sigma*Math.sqrt(remaining));const pYes=clamp(1-cdf(z),.001,.999);return {type:'forecast',id:m.ticker+':'+Math.floor(now/30000),ticker:m.ticker,at:new Date(now).toISOString(),closeTime:m.closeTime,spot,reference:'Coinbase BTC/USD spot (not settlement index)',target:m.target,pYes,projected:spot*Math.exp(drift*remaining),sigma,remainingSeconds:Math.round(remaining),phase:remaining>450?'FIRST_HALF':'SECOND_HALF',sampleCount:points.length,yesAsk:m.yesAsk,noAsk:m.noAsk,model:'v0-drift-shrunk-lognormal',validated:false}}
async function checkResolution(p){if(resolved.has(p.id)||Date.now()<Date.parse(p.closeTime)+90000)return;if(Date.now()-(resolutionAttempts.get(p.ticker)||0)<60000)return;resolutionAttempts.set(p.ticker,Date.now());try{const r=await fetch(base+'/markets/'+encodeURIComponent(p.ticker),{signal:AbortSignal.timeout(6500)});if(!r.ok)return;const data=await r.json(),m=data.market;if(!m||!['yes','no'].includes(String(m.result).toLowerCase()))return;const y=String(m.result).toLowerCase()==='yes'?1:0;const x={type:'resolution',id:p.id,ticker:p.ticker,at:new Date().toISOString(),outcome:y,source:'Kalshi resolved market result',brier:(p.pYes-y)**2,correct:(p.pYes>=.5)===(y===1)};await event(x);resolved.set(p.id,x)}catch(e){lastError='Settlement lookup: '+e.message}}
export async function validationCycle(getMarket){if(!historyLoaded||running)return;running=true;try{const r=await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot',{signal:AbortSignal.timeout(5500)});if(!r.ok)throw Error('Coinbase '+r.status);const data=await r.json(),price=Number(data?.data?.amount);if(!Number.isFinite(price)||price<=0)throw Error('Invalid spot');const now=Date.now();samples.push({at:now,price});while(samples.length>1000||samples[0]?.at<now-1800000)samples.shift();const marketData=await getMarket();if(marketData?.status==='STALE'||marketData?.verified===false)throw Error('Kalshi market snapshot stale or unverified');const p=makeForecast(marketData?.market);if(p&&!predictions.has(p.id)){await event(p);predictions.set(p.id,p)}lastError=null;lastCycle=new Date().toISOString()}catch(e){lastError=e.message}finally{const now=Date.now();const unresolved=[...predictions.values()].filter(x=>!resolved.has(x.id)&&Date.parse(x.closeTime)<now-90000).slice(0,3);for(const x of unresolved)await checkResolution(x);running=false}}
function executionAudit(finished){
 const observations=[];
 for(const p of finished){
  const y=resolved.get(p.id)?.outcome;
  const side=p.pYes>=.5?'YES':'NO';
  const ask=side==='YES'?p.yesAsk:p.noAsk;
  const probability=side==='YES'?p.pYes:1-p.pYes;
  if(!Number.isFinite(ask)||ask<=0||ask>=1||!Number.isFinite(probability))continue;
  const won=(side==='YES'?y===1:y===0);
  observations.push({ticker:p.ticker,phase:p.phase,at:p.at,side,ask,probability,won,unitGrossPnl:(won?1:0)-ask,estimatedGrossEdge:probability-ask});
 }
 const distinct=new Set(observations.map(x=>x.ticker)).size;
 const mean=observations.length?observations.reduce((a,x)=>a+x.unitGrossPnl,0)/observations.length:null;
 const firstByContract=new Map();
 for(const x of observations){const prev=firstByContract.get(x.ticker);if(!prev||Date.parse(x.at)<Date.parse(prev.at))firstByContract.set(x.ticker,x)}
 const independent=[...firstByContract.values()];
 const contractMean=independent.length?independent.reduce((a,x)=>a+x.unitGrossPnl,0)/independent.length:null;
 const winRate=independent.length?independent.filter(x=>x.won).length/independent.length:null;
 return {policy:'Choose higher model probability at observed ask; hypothetical one-share immediate fill',quoteObservations:observations.length,distinctContracts:distinct,firstQuotePerContractCount:independent.length,meanHypotheticalGrossPnlPerShare:mean,firstQuotePerContractMeanGrossPnlPerShare:contractMean,firstQuotePerContractWinRate:winRate,feeAdjustedPnl:null,realizedPnl:null,fillRate:null,spreadCostIncludedInAsk:true,limitations:'Unvalidated model-selection diagnostic, not a recommended or profitable strategy. Assumes instantaneous execution at historical asking quotes, with no fees, slippage, latency, quantity or missing quotes. Multiple snapshots per contract are correlated; first-quote summary reduces duplicate counting. Resting orders require independently verified order-book and fill simulation.'}
}
export async function forecastStorageProbe(){
 const directory=dirname(path),probePath=directory+'/.karen-storage-probe-'+process.pid,markerPath=directory+'/.karen-retention-marker';
 const payload='karen-storage-check-'+Date.now();
 let markerWasPresent=false,markerCreatedAt=null;
 try{
  await mkdir(directory,{recursive:true});
  try{
   const previous=JSON.parse((await readFile(markerPath,'utf8')).trim().replace(/\\\\n$/, ''));
   markerWasPresent=previous.type==='karen-storage-retention-marker';
   markerCreatedAt=previous.createdAt||null;
  }catch(e){if(e.code!=='ENOENT')throw e}
  await writeFile(probePath,payload,{flag:'wx'});
  const echoed=await readFile(probePath,'utf8');
  await unlink(probePath);
  if(!markerWasPresent){
   markerCreatedAt=new Date().toISOString();
   await writeFile(markerPath,JSON.stringify({type:'karen-storage-retention-marker',createdAt:markerCreatedAt})+'\\n',{flag:'wx'});
  }
  return {ok:echoed===payload,writable:echoed===payload,historyLoaded,logPath:path,mountedVolumeExpected:path.startsWith('/data/'),restartRetentionVerified:markerWasPresent&&path.startsWith('/data/'),markerCreatedAt,warning:markerWasPresent?'Storage marker survived a process deployment; forecast content still requires independent audit.':'Marker initialized; restart and repeat check to confirm retention.'};
 }catch(e){
  try{await unlink(probePath)}catch{}
  return {ok:false,writable:false,historyLoaded,logPath:path,mountedVolumeExpected:path.startsWith('/data/'),restartRetentionVerified:false,error:e.message};
 }
}
export function validationReport(){const finished=[...predictions.values()].filter(p=>resolved.has(p.id));const brier=finished.length?finished.reduce((a,p)=>a+resolved.get(p.id).brier,0)/finished.length:null;const accuracy=finished.length?finished.filter(p=>resolved.get(p.id).correct).length/finished.length:null;const buckets=Array.from({length:5},(_,i)=>{const rows=finished.filter(p=>Math.min(4,Math.floor(p.pYes*5))===i);return {range:(i*20)+'–'+((i+1)*20)+'%',count:rows.length,meanPredicted:rows.length?rows.reduce((a,p)=>a+p.pYes,0)/rows.length:null,observedYes:rows.length?rows.reduce((a,p)=>a+resolved.get(p.id).outcome,0)/rows.length:null}});return {ok:true,model:'v0-drift-shrunk-lognormal',validated:false,status:new Set(finished.map(p=>p.ticker)).size>=100?'EVALUATION_IN_PROGRESS':'INSUFFICIENT_OUTCOMES',minimumOutcomesForInitialReview:100,forecastCount:predictions.size,resolvedForecastCount:finished.length,distinctResolvedContracts:new Set(finished.map(p=>p.ticker)).size,meanBrier:brier,observedDirectionalAccuracy:accuracy,calibrationBuckets:buckets,executionAudit:executionAudit(finished),latestForecast:[...predictions.values()].at(-1)||null,lastCycle,lastError,storage:{path,mode:path.startsWith('/tmp/')?'EPHEMERAL':'PERSISTENCE_NOT_VERIFIED',persistentVerified:false,historyLoaded,malformedEvents,error:storageError,warning:'File path alone does not establish durability. Attach a persistent Railway volume or external database and verify restart retention.'},limitations:'Multiple forecasts per contract are correlated. Not out-of-sample validated. Coinbase spot differs from Kalshi settlement index. No fee-adjusted backtest or live-trading claims. Quote-based execution audit is hypothetical, not a strategy P&L.'}}
