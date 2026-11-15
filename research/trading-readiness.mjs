// Read-only trade readiness gate. No orders, credentials, or network calls.
const valid=x=>typeof x==='number'&&Number.isFinite(x);
export function tradingReadiness({market,validation,limits,authorization=false}={}){
 const blockers=[];
 if(!market||market.targetVerified!==true||!market.ticker||!Number.isFinite(Date.parse(market.closeTime))||Date.parse(market.closeTime)<=Date.now())blockers.push('UNVERIFIED_OR_CLOSED_CONTRACT');
 if(!valid(market?.yesAsk)||!valid(market?.noAsk)||market.yesAsk<=0||market.noAsk<=0||market.yesAsk>=1||market.noAsk>=1)blockers.push('NO_EXECUTABLE_QUOTES');
 if(!validation||validation.validated!==true)blockers.push('MODEL_NOT_VALIDATED');
 if(!validation||validation.netEdgeDemonstrated!==true)blockers.push('NET_EDGE_NOT_DEMONSTRATED');
 if(!validation||validation.fillabilityVerified!==true)blockers.push('FILLABILITY_UNVERIFIED');
 if(!limits||!valid(limits.maxTicketLossUsd)||limits.maxTicketLossUsd<=0||!valid(limits.dailyLossLimitUsd)||limits.dailyLossLimitUsd<=0||limits.dailyLossLimitUsd<limits.maxTicketLossUsd)blockers.push('RISK_LIMITS_NOT_CONFIGURED');
 if(authorization!==true)blockers.push('EXECUTION_NOT_AUTHORIZED');
 return {mode:'READ_ONLY',canPlaceRealOrders:false,blockers,requirementsSatisfied:blockers.length===0,warning:'This report never places orders. Even when all prerequisites are satisfied, a separate authenticated, explicitly authorized execution system and kill switch are required.'};
}
