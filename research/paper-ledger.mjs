// Pure, deterministic paper ledger. Caller persists returned records; this module never writes to live trading systems.
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function recordPaperDecision(ticket,{decisionAt,modelVersion,source='observed-ask'}={}){
 if(!ticket||typeof decisionAt!=='string'||!Number.isFinite(Date.parse(decisionAt))||typeof modelVersion!=='string'||!modelVersion)throw Error('Missing immutable decision metadata');
 const eligible=ticket.eligible===true;
 if(eligible&&(!ticket.ticker||!Number.isFinite(ticket.shares)||ticket.shares<1||ticket.orderSubmitted!==false))throw Error('Invalid paper ticket');
 const record={kind:'paper_decision',mode:'PAPER_ONLY',decisionAt,modelVersion,source,eligible,orderSubmitted:false,ticker:ticket.ticker??null,side:eligible?ticket.side:null,shares:eligible?ticket.shares:0,price:eligible?ticket.price:null,feePerShare:eligible?ticket.feePerShare:null,extraCostPerShare:eligible?ticket.extraCostPerShare:null,maximumHypotheticalLossUsd:eligible?ticket.maximumHypotheticalLossUsd:0,quoteTimestamp:ticket.quoteTimestamp??null,forecastTimestamp:ticket.forecastTimestamp??null,blockers:eligible?[]:[...(ticket.blockers||[])],fillabilityVerified:false};
 return {...record,id:hash(record)};
}
export function recordPaperSettlement(decision,{outcome,settledAt,source='Kalshi resolved market result'}={}){
 if(!decision||decision.kind!=='paper_decision'||decision.eligible!==true||decision.orderSubmitted!==false)throw Error('Only eligible paper decisions can settle');
 if(![0,1].includes(outcome)||!Number.isFinite(Date.parse(settledAt))||!Number.isFinite(Date.parse(decision.decisionAt))||Date.parse(settledAt)<Date.parse(decision.decisionAt))throw Error('Invalid settlement');
 const win=decision.side==='YES'?outcome===1:outcome===0;
 const net=decision.shares*((win?1:0)-decision.price-decision.feePerShare-decision.extraCostPerShare);
 const record={kind:'paper_settlement',mode:'PAPER_ONLY',decisionId:decision.id,ticker:decision.ticker,outcome,settledAt,source,hypotheticalNetPnlUsd:Number(net.toFixed(4)),won:win,orderSubmitted:false,actualFillVerified:false,warning:'Paper P&L is not realized P&L and does not prove executable liquidity.'};
 return {...record,id:hash(record)};
}
export function summarizePaperLedger(events){
 const decisions=new Map(),settlements=new Map();let rejected=0;
 for(const e of events||[]){
  if(e?.kind==='paper_decision'&&typeof e.id==='string'&&!decisions.has(e.id))decisions.set(e.id,e);
  else if(e?.kind==='paper_settlement'&&typeof e.decisionId==='string'&&!settlements.has(e.decisionId))settlements.set(e.decisionId,e);
  else rejected++;
 }
 let settled=0,pnl=0,wins=0,unsettled=0;
 for(const d of decisions.values()){
  if(!d.eligible)continue;
  const s=settlements.get(d.id);
  if(!s||s.ticker!==d.ticker||!Number.isFinite(s.hypotheticalNetPnlUsd)){unsettled++;continue}
  settled++;pnl+=s.hypotheticalNetPnlUsd;wins+=Number(s.won===true);
 }
 return {mode:'PAPER_ONLY',decisions:decisions.size,eligibleDecisions:[...decisions.values()].filter(x=>x.eligible).length,settled,unsettled,rejected,winRate:settled?wins/settled:null,hypotheticalNetPnlUsd:Number(pnl.toFixed(4)),actualProfitUsd:null,realOrdersPlaced:0,fillabilityVerified:false};
}
