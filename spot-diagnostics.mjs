// Rolling process-local spot diagnostics. Not durable across Railway restarts.
const observations=[];
export function addSpotObservation(price,at=Date.now()){
 const t=typeof at==='number'?at:Date.parse(at),now=Date.now();
 if(!Number.isFinite(price)||price<=0||!Number.isFinite(t)||t>now+5000||now-t>30000)return false;
 if(observations.length&&t<=observations.at(-1).at)return false;
 observations.push({price,at:t});while(observations.length>240||observations.length&&now-observations[0].at>3600000)observations.shift();return true;
}
export function spotDiagnostics(now=Date.now()){
 const fresh=observations.filter(p=>now-p.at<=300000&&p.at<=now+5000);
 const latest=fresh.at(-1),ageSeconds=latest?Math.max(0,Math.round((now-latest.at)/1000)):null;
 const base={source:'Coinbase BTC/USD reference spot',scope:'process-local rolling samples; resets on restart',sampleCount:fresh.length,ageSeconds,validated:false};
 if(!latest||ageSeconds>30)return {...base,status:'STALE',momentum:null,volatility:null};
 const spanSeconds=Math.round((latest.at-fresh[0].at)/1000);
 if(fresh.length<5||spanSeconds<60)return {...base,status:'COLLECTING',spanSeconds,requiredSeconds:60,requiredSamples:5,momentum:null,volatility:null};
 const returns=fresh.slice(1).map((p,i)=>Math.log(p.price/fresh[i].price));const mean=returns.reduce((a,b)=>a+b,0)/returns.length;
 const variance=returns.reduce((a,b)=>a+(b-mean)**2,0)/returns.length;
 return {...base,status:'LIVE',spanSeconds,momentumPct:(latest.price/fresh[0].price-1)*100,volatilityPerSamplePct:Math.sqrt(variance)*100};
}
