// Deterministic paper execution simulator. Never connects to a broker or submits orders.
// A timestamped quote is a hypothetical entry, not evidence of executable depth or a fill.
import {estimatedTakerFeePerShare} from '../validation.mjs';
export function paperTicket({forecast,market,bankrollUsd=25,maxTicketLossUsd=10,extraCostPerShare=0,now=Date.now()}={}){
 const blockers=[];
 if(!forecast||!market||forecast.ticker!==market.ticker)blockers.push('CONTRACT_MISMATCH');
 if(!market?.targetVerified||!Number.isFinite(Date.parse(market.closeTime))||Date.parse(market.closeTime)<=now)blockers.push('UNVERIFIED_OR_CLOSED_CONTRACT');
 if(!Number.isFinite(forecast?.pYes)||forecast.pYes<0||forecast.pYes>1)blockers.push('INVALID_FORECAST');
 if(!Number.isFinite(market?.yesAsk)||!Number.isFinite(market?.noAsk)||market.yesAsk<=0||market.yesAsk>=1||market.noAsk<=0||market.noAsk>=1)blockers.push('MISSING_QUOTES');
 if(!Number.isFinite(bankrollUsd)||bankrollUsd<=0||!Number.isFinite(maxTicketLossUsd)||maxTicketLossUsd<=0||!Number.isFinite(extraCostPerShare)||extraCostPerShare<0)blockers.push('INVALID_RISK_LIMITS');
 if(blockers.length)return {mode:'PAPER_ONLY',eligible:false,blockers,orderSubmitted:false};
 const yesFee=estimatedTakerFeePerShare(market.yesAsk),noFee=estimatedTakerFeePerShare(market.noAsk);
 const yesEdge=forecast.pYes-market.yesAsk-yesFee-extraCostPerShare;
 const noEdge=1-forecast.pYes-market.noAsk-noFee-extraCostPerShare;
 const side=yesEdge>=noEdge?'YES':'NO',edge=Math.max(yesEdge,noEdge);
 if(edge<=0)return {mode:'PAPER_ONLY',eligible:false,blockers:['NO_POSITIVE_ESTIMATED_EDGE'],orderSubmitted:false};
 const price=side==='YES'?market.yesAsk:market.noAsk,fee=side==='YES'?yesFee:noFee;
 const costPerShare=price+fee+extraCostPerShare;
 const shares=Math.floor(Math.min(bankrollUsd,maxTicketLossUsd)/costPerShare);
 if(shares<1)return {mode:'PAPER_ONLY',eligible:false,blockers:['INSUFFICIENT_BUDGET'],orderSubmitted:false};
 return {mode:'PAPER_ONLY',eligible:true,orderSubmitted:false,ticker:market.ticker,side,shares,price,feePerShare:fee,extraCostPerShare,estimatedNetEdgePerShare:edge,maximumHypotheticalLossUsd:Number((shares*costPerShare).toFixed(4)),hypotheticalWinNetUsd:Number((shares*(1-costPerShare)).toFixed(4)),quoteTimestamp:market.receivedAt||null,forecastTimestamp:forecast.at||null,fillabilityVerified:false,warning:'Simulated decision using observed asks; no real order, confirmed fill, or verified liquidity.'};
}
export function settlePaperTicket(ticket,outcome){
 if(!ticket?.eligible||!['YES','NO'].includes(ticket.side)||![0,1].includes(outcome))throw Error('Invalid paper settlement');
 const win=ticket.side==='YES'?outcome===1:outcome===0;
 return {...ticket,outcome,won:win,hypotheticalNetPnlUsd:Number((ticket.shares*((win?1:0)-ticket.price-ticket.feePerShare-ticket.extraCostPerShare)).toFixed(4)),officialSettlementVerified:false};
}
