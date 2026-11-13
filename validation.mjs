import {readFile,appendFile,mkdir,writeFile,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
const path=process.env.KAREN_FORECAST_LOG_PATH||'/tmp/karen-forecast-events.jsonl';
const base='https://external-api.kalshi.com/trade-api/v2';
// Increment this immutable identifier whenever forecast math, features or selection policy changes.
const MODEL_VERSION='btc15-v0-drift-shrunk-lognormal-fresh15s-20261113';
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

function makeForecast(m){if(!m?.targetVerified||!Number.isFinite(m.target)||!Number.isFinite(Date.parse(m.closeTime)))return null;const now=Date.now(),remaining=(Date.parse(m.closeTime)-now)/1000;if(remaining<=0||remaining>900)return null;const points=samples.filter(x=>x.at<=now&&now-x.at<=900000);if(points.length<7||now-points.at(-1).at>15000)return null;const returns=[];for(let i=1;i<points.length;i++){const dt=(points[i].at-points[i-1].at)/1000;if(dt>=5&&dt<=90)returns.push({dt,r:Math.log(points[i].price/points[i-1].price)})}if(returns.length<6)return null;const time=returns.reduce((a,x)=>a+x.dt,0),sum=returns.reduce((a,x)=>a+x.r,0);const drift=clamp(sum/time,-.00002,.00002)*.15;const sigma=Math.max(.00002,Math.sqrt(returns.reduce((a,x)=>a+(x.r-drift*x.dt)**2,0)/time));const spot=points.at(-1).price;const z=(Math.log(m.target/spot)-drift*remaining)/(sigma*Math.sqrt(remaining));const pYes=clamp(1-cdf(z),.001,.999);return {type:'forecast',id:m.ticker+':'+Math.floor(now/30000),ticker:m.ticker,at:new Date(now).toISOString(),closeTime:m.closeTime,spot,reference:'Coinbase BTC/USD spot (not settlement index)',target:m.target,pYes,projected:spot*Math.exp(drift*remaining),sigma,remainingSeconds:Math.round(remaining),phase:remaining>450?'FIRST_HALF':'SECOND_HALF',sampleCount:points.length,yesAsk:m.yesAsk,noAsk:m.noAsk,model:'v0-drift-shrunk-lognormal',modelVersion:MODEL_VERSION,validated:false}}
async function checkResolution(p){
 if(resolved.has(p.id)||Date.now()<Date.parse(p.closeTime)+90000)return;
 if(Date.now()-(resolutionAttempts.get(p.ticker)||0)<60000)return;
 resolutionAttempts.set(p.ticker,Date.now());
 try{
  const r=await fetch(base+'/markets/'+encodeURIComponent(p.ticker),{signal:AbortSignal.timeout(6500)});
  if(!r.ok){lastError='Settlement lookup HTTP '+r.status;return}
  const data=await r.json(),m=data.market;
  if(!m||!['yes','no'].includes(String(m.result).toLowerCase()))return;
  if(String(m.ticker||'')!==p.ticker){lastError='Settlement ticker mismatch for '+p.ticker;return;}
  const y=String(m.result).toLowerCase()==='yes'?1:0;
  const cohort=[...predictions.values()].filter(x=>x.ticker===p.ticker&&!resolved.has(x.id)&&Date.parse(x.closeTime)<=Date.now()-90000);
  for(const x of cohort){
   const row={type:'resolution',id:x.id,ticker:x.ticker,at:new Date().toISOString(),outcome:y,source:'Kalshi resolved market result',brier:(x.pYes-y)**2,correct:(x.pYes>=.5)===(y===1)};
   await event(row);
   resolved.set(x.id,row);
  }
 }catch(e){lastError='Settlement lookup: '+e.message}
}
export async function validationCycle(getMarket){if(!historyLoaded||running)return;running=true;try{const r=await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot',{signal:AbortSignal.timeout(5500)});if(!r.ok)throw Error('Coinbase '+r.status);const data=await r.json(),price=Number(data?.data?.amount);if(!Number.isFinite(price)||price<=0)throw Error('Invalid spot');const now=Date.now();samples.push({at:now,price});while(samples.length>1000||samples[0]?.at<now-1800000)samples.shift();const marketData=await getMarket();if(marketData?.status==='STALE'||marketData?.verified===false)throw Error('Kalshi market snapshot stale or unverified');const p=makeForecast(marketData?.market);if(p&&!predictions.has(p.id)){await event(p);predictions.set(p.id,p)}lastError=null;lastCycle=new Date().toISOString()}catch(e){lastError=e.message}finally{const now=Date.now();const unresolved=[...new Map([...predictions.values()].filter(x=>!resolved.has(x.id)&&Date.parse(x.closeTime)<now-90000).map(x=>[x.ticker,x])).values()].slice(0,3);for(const x of unresolved)await checkResolution(x);running=false}}
// Illustrative Kalshi-style taker fee only: actual fee schedules, rounding and tiers may differ.
function estimatedTakerFeePerShare(price){return Math.ceil(100*0.07*price*(1-price))/100}
function executionAudit(finished){
 const observations=[];
 for(const p of finished){
  const y=resolved.get(p.id)?.outcome;
  const side=p.pYes>=.5?'YES':'NO';
  const ask=side==='YES'?p.yesAsk:p.noAsk;
  const probability=side==='YES'?p.pYes:1-p.pYes;
  if(!Number.isFinite(ask)||ask<=0||ask>=1||!Number.isFinite(probability))continue;
  const won=(side==='YES'?y===1:y===0);
  observations.push({ticker:p.ticker,phase:p.phase,at:p.at,side,ask,probability,won,unitGrossPnl:(won?1:0)-ask,estimatedGrossEdge:probability-ask,estimatedFeePerShare:estimatedTakerFeePerShare(ask),unitEstimatedNetPnl:(won?1:0)-ask-estimatedTakerFeePerShare(ask),estimatedNetEdge:probability-ask-estimatedTakerFeePerShare(ask)});
 }
 const distinct=new Set(observations.map(x=>x.ticker)).size;
 const mean=observations.length?observations.reduce((a,x)=>a+x.unitGrossPnl,0)/observations.length:null;
 const firstByContract=new Map();
 for(const x of observations){const prev=firstByContract.get(x.ticker);if(!prev||Date.parse(x.at)<Date.parse(prev.at))firstByContract.set(x.ticker,x)}
 const independent=[...firstByContract.values()];
 const contractMean=independent.length?independent.reduce((a,x)=>a+x.unitGrossPnl,0)/independent.length:null;
 const winRate=independent.length?independent.filter(x=>x.won).length/independent.length:null;const estimatedNetMean=independent.length?independent.reduce((a,x)=>a+x.unitEstimatedNetPnl,0)/independent.length:null;
 return {policy:'Choose higher model probability at observed ask; hypothetical one-share immediate fill',quoteObservations:observations.length,distinctContracts:distinct,firstQuotePerContractCount:independent.length,meanHypotheticalGrossPnlPerShare:mean,firstQuotePerContractMeanGrossPnlPerShare:contractMean,firstQuotePerContractWinRate:winRate,illustrativeTakerFeeFormula:'ceil(100 * 0.07 * ask * (1-ask))/100 per share; not verified against current venue fee table',firstQuotePerContractEstimatedNetPnlPerShare:estimatedNetMean,feeAdjustedPnl:null,realizedPnl:null,fillRate:null,spreadCostIncludedInAsk:true,limitations:'Unvalidated model-selection diagnostic, not a recommended or profitable strategy. Assumes instantaneous execution at historical asking quotes, with illustrative taker fees only, and no verified current fee schedule, slippage, latency, quantity or missing quotes. Multiple snapshots per contract are correlated; first-quote summary reduces duplicate counting. Resting orders require independently verified order-book and fill simulation.'}
}
export async function forecastStorageProbe(){
 const directory=dirname(path),probePath=directory+'/.karen-storage-probe-'+process.pid,markerPath=directory+'/.karen-retention-marker';
 const payload='karen-storage-check-'+Date.now();
 let markerWasPresent=false,markerCreatedAt=null;
 try{
  await mkdir(directory,{recursive:true});
  try{
   const previous=JSON.parse((await readFile(markerPath,'utf8')).trim().replace(/\\n$/, ''));
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
function phasePerformance(finished){
 return ['FIRST_HALF','SECOND_HALF'].map(phase=>{
  const rows=finished.filter(p=>p.phase===phase);
  const byTicker=new Map();
  for(const p of rows){const prior=byTicker.get(p.ticker);if(!prior||Date.parse(p.at)<Date.parse(prior.at))byTicker.set(p.ticker,p)}
  const independent=[...byTicker.values()];
  const mean=(list,fn)=>list.length?list.reduce((sum,p)=>sum+fn(p),0)/list.length:null;
  return {phase,forecastCount:rows.length,distinctContracts:byTicker.size,firstForecastPerContractCount:independent.length,meanBrier:mean(independent,p=>(p.pYes-resolved.get(p.id).outcome)**2),directionalAccuracy:mean(independent,p=>Number((p.pYes>=.5)===(resolved.get(p.id).outcome===1))),meanAbsoluteProbabilityError:mean(independent,p=>Math.abs(p.pYes-resolved.get(p.id).outcome)),evaluationUnit:'first eligible forecast per contract per phase'};
 });
}
function pairedPhaseComparison(finished){
 const first=new Map();
 for(const p of finished){if(p.phase!=='FIRST_HALF'&&p.phase!=='SECOND_HALF')continue;const key=p.ticker+'|'+p.phase;const prev=first.get(key);if(!prev||Date.parse(p.at)<Date.parse(prev.at))first.set(key,p)}
 const pairs=[];
 for(const [key,early] of first){if(!key.endsWith('|FIRST_HALF'))continue;const late=first.get(early.ticker+'|SECOND_HALF');if(!late)continue;const outcome=resolved.get(early.id).outcome;if(resolved.get(late.id).outcome!==outcome)continue;pairs.push({early,late,outcome})}
 const n=pairs.length;
 const score=(p,y)=>(p.pYes-y)**2;
 const mean=fn=>n?pairs.reduce((sum,p)=>sum+fn(p),0)/n:null;
 return {evaluationUnit:'first eligible forecast in each half, paired on the same settled contract',pairedContracts:n,firstHalfBrier:mean(p=>score(p.early,p.outcome)),secondHalfBrier:mean(p=>score(p.late,p.outcome)),secondHalfMinusFirstHalfBrier:mean(p=>score(p.late,p.outcome)-score(p.early,p.outcome)),firstHalfAccuracy:mean(p=>Number((p.early.pYes>=.5)===(p.outcome===1))),secondHalfAccuracy:mean(p=>Number((p.late.pYes>=.5)===(p.outcome===1))),interpretation:'Later forecasts have less uncertainty because more of the contract has elapsed. This is not evidence of earlier predictive skill or profitable executable odds.',validated:false};
}
function chronologicalHoldout(finished){
 const first=new Map();
 for(const p of finished){
  if(!Number.isFinite(Date.parse(p.at))||!Number.isFinite(Date.parse(p.closeTime))||Date.parse(p.at)>=Date.parse(p.closeTime)||!Number.isFinite(p.pYes)||p.pYes<0||p.pYes>1)continue;
  const previous=first.get(p.ticker);
  if(!previous||Date.parse(p.at)<Date.parse(previous.at))first.set(p.ticker,p);
 }
 const ordered=[...first.values()].sort((a,b)=>Date.parse(a.closeTime)-Date.parse(b.closeTime)||a.ticker.localeCompare(b.ticker));
 const cut=Math.floor(ordered.length*.7),train=ordered.slice(0,cut),holdout=ordered.slice(cut);
 const summarize=rows=>({contracts:rows.length,firstCloseTime:rows[0]?.closeTime||null,lastCloseTime:rows.at(-1)?.closeTime||null,meanBrier:rows.length?rows.reduce((n,p)=>n+(p.pYes-resolved.get(p.id).outcome)**2,0)/rows.length:null,directionalAccuracy:rows.length?rows.filter(p=>(p.pYes>=.5)===(resolved.get(p.id).outcome===1)).length/rows.length:null});
 return {method:'Chronological 70/30 descriptive split by contract close time; first valid pre-close forecast per contract',train:summarize(train),holdout:summarize(holdout),minimumHoldoutContracts:30,holdoutReviewReady:holdout.length>=30,modelFrozenBeforeHoldout:false,validated:false,warning:'Not a true prospective or leakage-safe model validation until the model version, parameters, and selection process are frozen before holdout outcomes. Do not tune on this holdout.'};
}
function forecastHistoryAudit(){
 const all=[...predictions.values()],complete=all.filter(p=>resolved.has(p.id));
 const invalid=all.filter(p=>!p.ticker||!Number.isFinite(p.pYes)||p.pYes<0||p.pYes>1||!Number.isFinite(Date.parse(p.at))||!Number.isFinite(Date.parse(p.closeTime)));
 const futureLeak=all.filter(p=>Date.parse(p.at)>=Date.parse(p.closeTime));
 const orphanResolutions=[...resolved.values()].filter(r=>!predictions.has(r.id));
 const invalidResolutions=[...resolved.values()].filter(r=>r.outcome!==0&&r.outcome!==1||!predictions.has(r.id)||predictions.get(r.id).ticker!==r.ticker||r.source!=='Kalshi resolved market result');
 const tickerOutcomes=new Map(),conflictingTickers=new Set();
 for(const r of resolved.values()){if(tickerOutcomes.has(r.ticker)&&tickerOutcomes.get(r.ticker)!==r.outcome)conflictingTickers.add(r.ticker);else tickerOutcomes.set(r.ticker,r.outcome)}
 const duplicateContractTimes=new Set(),duplicates=[];
 for(const p of all){const k=p.ticker+'|'+p.at;if(duplicateContractTimes.has(k))duplicates.push(k);else duplicateContractTimes.add(k)}
 return {savedForecasts:all.length,resolvedForecasts:complete.length,unresolvedForecasts:all.length-complete.length,distinctSavedContracts:new Set(all.map(p=>p.ticker)).size,invalidForecasts:invalid.length,postCloseForecasts:futureLeak.length,duplicateTickerTimestamps:duplicates.length,recordFormatErrors:malformedEvents,orphanResolutions:orphanResolutions.length,invalidResolutions:invalidResolutions.length,conflictingSettlementTickers:conflictingTickers.size,verifiedOutcomesOnly:complete.every(p=>resolved.get(p.id).source==='Kalshi resolved market result'),note:'In-memory audit of reloaded JSONL events; does not establish exchange quote fillability or prediction skill.'};
}
function eligibleSettledForecast(p){
 const r=resolved.get(p.id);
 if(!r||r.ticker!==p.ticker||r.source!=='Kalshi resolved market result'||(r.outcome!==0&&r.outcome!==1)||!Number.isFinite(p.pYes)||p.pYes<0||p.pYes>1||!Number.isFinite(Date.parse(p.at))||!Number.isFinite(Date.parse(p.closeTime))||Date.parse(p.at)>=Date.parse(p.closeTime))return false;
 for(const other of resolved.values())if(other.ticker===p.ticker&&(other.outcome!==0&&other.outcome!==1||other.outcome!==r.outcome||other.source!=='Kalshi resolved market result'))return false;
 return true;
}
function modelVersionAudit(finished){
 const versions=new Map();
 for(const p of predictions.values()){
  const version=typeof p.modelVersion==='string'&&p.modelVersion?p.modelVersion:'LEGACY_UNVERSIONED';
  if(!versions.has(version))versions.set(version,{version,savedForecasts:0,resolvedEligibleForecasts:0,distinctEligibleContracts:new Set(),firstSeen:null,lastSeen:null});
  const v=versions.get(version);v.savedForecasts++;
  if(Number.isFinite(Date.parse(p.at))){if(!v.firstSeen||p.at<v.firstSeen)v.firstSeen=p.at;if(!v.lastSeen||p.at>v.lastSeen)v.lastSeen=p.at}
 }
 for(const p of finished){const version=p.modelVersion||'LEGACY_UNVERSIONED',v=versions.get(version);v.resolvedEligibleForecasts++;v.distinctEligibleContracts.add(p.ticker)}
 return {currentVersion:MODEL_VERSION,versions:[...versions.values()].map(v=>{const cohort=finished.filter(p=>(p.modelVersion||'LEGACY_UNVERSIONED')===v.version);const first=new Map();for(const p of cohort){const previous=first.get(p.ticker);if(!previous||Date.parse(p.at)<Date.parse(previous.at))first.set(p.ticker,p)}const independent=[...first.values()];return {...v,distinctEligibleContracts:v.distinctEligibleContracts.size,firstEligibleForecastPerContract:independent.length,firstForecastMeanBrier:independent.length?independent.reduce((sum,p)=>sum+(p.pYes-resolved.get(p.id).outcome)**2,0)/independent.length:null,firstForecastDirectionalAccuracy:independent.length?independent.filter(p=>(p.pYes>=.5)===(resolved.get(p.id).outcome===1)).length/independent.length:null,evaluationUnit:'first eligible pre-close forecast per contract for this version'};}),prospectiveValidationEstablished:false,warning:'Version labels are recorded at forecast creation but cannot prove code immutability or a frozen prospective evaluation. Legacy records are explicitly unversioned.'};
}
// Calibration diagnostics are descriptive until a model is frozen and evaluated prospectively.
function calibrationDiagnostics(finished){
 const first=new Map();
 for(const p of finished){const previous=first.get(p.ticker);if(!previous||Date.parse(p.at)<Date.parse(previous.at))first.set(p.ticker,p)}
 const rows=[...first.values()],n=rows.length;
 const base={evaluationUnit:'first eligible forecast per distinct settled contract',contracts:n,minimumContractsForInitialReview:100,readyForInitialReview:n>=100,prospectivelyValidated:false,meanBrier:null,constantBaseRateBrier:null,brierSkillVersusSampleBaseRate:null,expectedCalibrationError:null,accuracy:null,accuracyWilson95:null,probabilityBuckets:[],warning:'Descriptive in-sample diagnostics only. The sample base rate is fitted on these same outcomes; not a prospective baseline or trading edge. A 90% price-band coverage claim also requires timestamped interval forecasts and independently verified settlement-index values.'};
 if(!n)return base;
 const outcomes=rows.map(p=>resolved.get(p.id).outcome),yesRate=outcomes.reduce((a,y)=>a+y,0)/n;
 const brier=rows.reduce((a,p,i)=>a+(p.pYes-outcomes[i])**2,0)/n;
 const baseline=rows.reduce((a,p,i)=>a+(yesRate-outcomes[i])**2,0)/n;
 const correct=rows.reduce((a,p,i)=>a+Number((p.pYes>=.5)===(outcomes[i]===1)),0);
 const z=1.96,phat=correct/n,denom=1+z*z/n,center=(phat+z*z/(2*n))/denom,margin=z*Math.sqrt(phat*(1-phat)/n+z*z/(4*n*n))/denom;
 const buckets=Array.from({length:10},(_,i)=>{const members=rows.filter(p=>Math.min(9,Math.floor(p.pYes*10))===i);const count=members.length;return {range:(i*10)+'–'+((i+1)*10)+'%',count,meanPredicted:count?members.reduce((a,p)=>a+p.pYes,0)/count:null,observedYes:count?members.reduce((a,p)=>a+resolved.get(p.id).outcome,0)/count:null}});
 const ece=buckets.reduce((sum,b)=>sum+(b.count/n)*Math.abs((b.meanPredicted??0)-(b.observedYes??0)),0);
 return {...base,meanBrier:brier,constantBaseRateBrier:baseline,brierSkillVersusSampleBaseRate:baseline>0?1-brier/baseline:null,expectedCalibrationError:ece,accuracy:phat,accuracyWilson95:{lower:Math.max(0,center-margin),upper:Math.min(1,center+margin)},probabilityBuckets:buckets};
}
export function validationReport(){const finished=[...predictions.values()].filter(eligibleSettledForecast);const brier=finished.length?finished.reduce((a,p)=>a+(p.pYes-resolved.get(p.id).outcome)**2,0)/finished.length:null;const accuracy=finished.length?finished.filter(p=>((p.pYes>=.5)===(resolved.get(p.id).outcome===1))).length/finished.length:null;const buckets=Array.from({length:5},(_,i)=>{const rows=finished.filter(p=>Math.min(4,Math.floor(p.pYes*5))===i);return {range:(i*20)+'–'+((i+1)*20)+'%',count:rows.length,meanPredicted:rows.length?rows.reduce((a,p)=>a+p.pYes,0)/rows.length:null,observedYes:rows.length?rows.reduce((a,p)=>a+resolved.get(p.id).outcome,0)/rows.length:null}});return {ok:true,model:'v0-drift-shrunk-lognormal',validated:false,status:new Set(finished.map(p=>p.ticker)).size>=100?'EVALUATION_IN_PROGRESS':'INSUFFICIENT_OUTCOMES',minimumOutcomesForInitialReview:100,forecastCount:predictions.size,resolvedForecastCount:finished.length,excludedSettledForecastCount:[...predictions.values()].filter(p=>resolved.has(p.id)&&!eligibleSettledForecast(p)).length,distinctResolvedContracts:new Set(finished.map(p=>p.ticker)).size,meanBrier:brier,observedDirectionalAccuracy:accuracy,calibrationBuckets:buckets,calibrationDiagnostics:calibrationDiagnostics(finished),executionAudit:executionAudit(finished),phasePerformance:phasePerformance(finished),pairedPhaseComparison:pairedPhaseComparison(finished),historyAudit:forecastHistoryAudit(),modelVersionAudit:modelVersionAudit(finished),chronologicalHoldout:chronologicalHoldout(finished),latestForecast:[...predictions.values()].at(-1)||null,lastCycle,lastError,storage:{path,mode:path.startsWith('/tmp/')?'EPHEMERAL':'PERSISTENCE_NOT_VERIFIED',persistentVerified:false,historyLoaded,malformedEvents,error:storageError,warning:'File path alone does not establish durability. Attach a persistent Railway volume or external database and verify restart retention.'},limitations:'Multiple forecasts per contract are correlated. Not out-of-sample validated. Coinbase spot differs from Kalshi settlement index. No fee-adjusted backtest or live-trading claims. Quote-based execution audit is hypothetical, not a strategy P&L.'}}
