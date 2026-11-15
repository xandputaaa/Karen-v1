// Offline replay of immutable forecast/resolution events into paper decisions.
// Never fetches markets, rewrites history, or places orders.
import {paperTicket} from './paper-execution.mjs';
import {recordPaperDecision,recordPaperSettlement,summarizePaperLedger} from './paper-ledger.mjs';
export function replayPaperEvents(events,{modelVersion=null,bankrollUsd=25,maxTicketLossUsd=10,extraCostPerShare=0}={}){
 const first=new Map(),resolved=new Map(),conflicted=new Set();
 for(const e of events||[]){
  if(e?.type==='forecast'&&typeof e.ticker==='string'&&Number.isFinite(Date.parse(e.at))&&Number.isFinite(Date.parse(e.closeTime))&&Date.parse(e.at)<Date.parse(e.closeTime)&&(!modelVersion||e.modelVersion===modelVersion)){
   const prior=first.get(e.ticker);if(!prior||Date.parse(e.at)<Date.parse(prior.at))first.set(e.ticker,e);
  }
  if(e?.type==='resolution'&&typeof e.ticker==='string'&&[0,1].includes(e.outcome)&&e.source==='Kalshi resolved market result'){
   const prior=resolved.get(e.ticker);if(prior&&prior.outcome!==e.outcome)conflicted.add(e.ticker);
   else resolved.set(e.ticker,e);
  }
 }
 const ledger=[];
 for(const p of [...first.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.ticker.localeCompare(b.ticker))){
  const ticket=paperTicket({forecast:p,market:{ticker:p.ticker,targetVerified:Number.isFinite(p.target)&&p.target>0,closeTime:p.closeTime,yesAsk:p.yesAsk,noAsk:p.noAsk,receivedAt:p.at},now:Date.parse(p.at),bankrollUsd,maxTicketLossUsd,extraCostPerShare});
  const d=recordPaperDecision(ticket,{decisionAt:p.at,modelVersion:p.modelVersion||'LEGACY_UNVERSIONED',source:'historical-forecast-snapshot'});
  ledger.push(d);
  const r=resolved.get(p.ticker);
  if(d.eligible&&r&&!conflicted.has(p.ticker)&&Number.isFinite(Date.parse(r.at))&&Date.parse(r.at)>=Date.parse(p.closeTime))ledger.push(recordPaperSettlement(d,{outcome:r.outcome,settledAt:r.at}));
 }
 return {...summarizePaperLedger(ledger),conflictedContracts:conflicted.size,source:'Offline historical forecast log replay',retrospective:true,prospectivelyValidated:false,demonstratedTradableEdge:false,events:ledger};
}
