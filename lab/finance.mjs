// Pure finance functions. Rates are decimal rates per stated period.
function finite(...values){if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('Enter a finite number in every required field.');}
function rateOK(r){finite(r);if(r<=-1)throw Error('The rate must be greater than −100%.');}
function periodsOK(n){finite(n);if(!Number.isInteger(n)||n<1||n>1000)throw Error('Use a whole number of payments from 1 to 1,000.');}
function taxOK(t){finite(t);if(t<0||t>1)throw Error('The tax rate must be between 0% and 100%.');}
function nonnegative(...v){finite(...v);if(v.some(x=>x<0))throw Error('These inputs must be zero or positive.');}
function positive(...v){finite(...v);if(v.some(x=>x<=0))throw Error('These inputs must be positive.');}
function root(fn,lo,hi){let a=fn(lo),b=fn(hi);if(Number.isNaN(a)||Number.isNaN(b)||Math.sign(a)===Math.sign(b))throw Error('No solution in the supported rate range. Check the cash flows.');if(a===0)return lo;if(b===0)return hi;for(let i=0;i<180;i++){const mid=(lo+hi)/2,f=fn(mid);if(Math.abs(f)<1e-10)return mid;if(Math.sign(a)!==Math.sign(f)){hi=mid;b=f;}else{lo=mid;a=f;}}return(lo+hi)/2;}
function annuityFV(r,n){return Math.abs(r)<1e-12?n:Math.expm1(n*Math.log1p(r))/r;}

export function cashFlowSeries({payment,rate,periods,growth=0,first=1}){
  finite(payment,growth,first);rateOK(rate);periodsOK(periods);rateOK(growth);nonnegative(first);
  const end=first+periods-1;
  const rows=Array.from({length:periods},(_,i)=>{const time=first+i,cash=payment*(1+growth)**i;return{time,cash,pv:cash/(1+rate)**time,fv:cash*(1+rate)**(end-time)};});
  const sum=k=>rows.reduce((a,x)=>a+x[k],0);
  const result={rows,pv:sum('pv'),fv:sum('fv'),total:sum('cash'),end};finite(result.pv,result.fv,result.total);return result;
}
export function perpetuity({payment,rate,growth=0,first=1}){finite(payment,first);rateOK(rate);rateOK(growth);nonnegative(first);if(rate<=growth)throw Error('An infinite growing stream needs a discount rate greater than its growth rate.');return payment/(rate-growth)/(1+rate)**(first-1);}
export function solveTVM({solve,pv=0,fv=0,pmt=0,rate=0,n=1,due=false}){
  const keys={fv:[pv,pmt,rate,n],pv:[fv,pmt,rate,n],pmt:[pv,fv,rate,n],rate:[pv,fv,pmt,n],n:[pv,fv,pmt,rate]};if(!keys[solve])throw Error('Choose a supported variable.');finite(...keys[solve]);
  const grow=(r,N)=>pv*(1+r)**N+pmt*annuityFV(r,N)*(due?1+r:1);
  if(solve==='rate'){positive(n,fv);nonnegative(pv,pmt);if(pv+pmt===0)throw Error('A positive starting balance or deposit is needed.');return root(r=>grow(r,n)-fv,-.99,10);}
  rateOK(rate);
  if(solve==='n'){
    nonnegative(pv,pmt);positive(fv);if(fv<=pv)throw Error('For this savings-period calculation, the target must exceed the starting balance.');
    if(Math.abs(rate)<1e-12){positive(pmt);return(fv-pv)/pmt;}
    const effective=pmt*(due?1+rate:1),ratio=(fv+effective/rate)/(pv+effective/rate);
    const N=Math.log(ratio)/Math.log1p(rate);if(!Number.isFinite(N)||N<0)throw Error('This savings target is not reachable with these inputs.');return N;
  }
  positive(n);const accumulation=(1+rate)**n,af=annuityFV(rate,n)*(due?1+rate:1);
  if(solve==='fv')return grow(rate,n);
  if(solve==='pv')return(fv-pmt*af)/accumulation;
  return(fv-pv*accumulation)/af;
}
export function wacc({rf,beta,erp,debtRate,tax,equity,debt,preferred=0,preferredRate=0}){
  finite(rf,beta,erp,debtRate,preferredRate);taxOK(tax);nonnegative(equity,debt,preferred);const total=equity+debt+preferred;positive(total);
  const equityRate=rf+beta*erp,afterTaxDebt=debtRate*(1-tax);
  const rows=[{label:'Equity',weight:equity/total,cost:equityRate},{label:'Debt',weight:debt/total,cost:afterTaxDebt},{label:'Preferred',weight:preferred/total,cost:preferredRate}];
  return{value:rows.reduce((a,x)=>a+x.weight*x.cost,0),equityRate,afterTaxDebt,rows};
}
export function dcf({fcf,growth,terminalGrowth,rate,n,debt,cash,shares}){
  finite(fcf);rateOK(growth);rateOK(terminalGrowth);rateOK(rate);periodsOK(n);nonnegative(debt,cash);positive(shares);
  if(terminalGrowth>=rate)throw Error('Terminal growth must be below WACC for a finite terminal value.');
  const rows=Array.from({length:n},(_,i)=>{const time=i+1,flow=fcf*(1+growth)**time;return{time,cash:flow,pv:flow/(1+rate)**time};});
  const pvFlows=rows.reduce((a,x)=>a+x.pv,0),terminal=rows.at(-1).cash*(1+terminalGrowth)/(rate-terminalGrowth),pvTerminal=terminal/(1+rate)**n;
  const ev=pvFlows+pvTerminal,equity=ev-debt+cash;return{rows,pvFlows,terminal,pvTerminal,ev,equity,price:equity/shares,terminalShare:ev===0?null:pvTerminal/ev};
}
export function bond({face,coupon,yield:y,years,frequency=2}){
  positive(face,years,frequency);nonnegative(coupon);finite(y);const n=years*frequency;periodsOK(n);rateOK(y/frequency);
  const payment=face*coupon/frequency,r=y/frequency;
  const rows=Array.from({length:n},(_,i)=>{const time=(i+1)/frequency,cash=payment+(i===n-1?face:0);return{time,cash,pv:cash/(1+r)**(i+1)};});
  const price=rows.reduce((a,x)=>a+x.pv,0),duration=rows.reduce((a,x)=>a+x.time*x.pv,0)/price;
  return{rows,price,couponPayment:payment,duration,modifiedDuration:duration/(1+r)};
}
export function bondYield({face,coupon,years,frequency=2,price}){positive(price);return root(y=>bond({face,coupon,years,frequency,yield:y}).price-price,-.9*frequency,10*frequency);}
export function hamada({beta,tax,de,targetDe}){finite(beta);taxOK(tax);nonnegative(de,targetDe);const unlevered=beta/(1+(1-tax)*de);return{unlevered,relevered:unlevered*(1+(1-tax)*targetDe)};}
export function option({spot,strike,premium,type,position}){
  nonnegative(spot,strike,premium);if(!['call','put'].includes(type)||!['long','short'].includes(position))throw Error('Choose a call or put and a long or short position.');
  const direction=position==='long'?1:-1,payoff=direction*Math.max(0,type==='call'?spot-strike:strike-spot),be=type==='call'?strike+premium:strike-premium;return{payoff,profit:payoff-direction*premium,breakEven:be<0?null:be};
}
export function leverage({unlevered,debt,tax,distress=0}){positive(unlevered);nonnegative(debt,distress);taxOK(tax);const shield=tax*debt,cost=distress*debt*debt/unlevered;return{value:unlevered+shield-cost,shield,cost,optimum:distress>0?tax*unlevered/(2*distress):null};}
export function dupont({income,sales,assets,equity}){finite(income);positive(sales,assets,equity);return{margin:income/sales,turnover:sales/assets,multiplier:assets/equity,roe:income/equity};}
export function fcf({ebit,tax,da,capex,deltaNwc}){finite(ebit,da,capex,deltaNwc);taxOK(tax);const nopat=ebit*(1-tax);return{nopat,value:nopat+da-capex-deltaNwc,rows:[{label:'NOPAT',cash:nopat},{label:'D&A',cash:da},{label:'Capex',cash:-capex},{label:'ΔNWC',cash:-deltaNwc}]};}
export function operatingCapital({currentAssets,excessCash,currentLiabilities,shortDebt,priorAssets,priorExcessCash,priorLiabilities,priorShortDebt}){nonnegative(currentAssets,excessCash,currentLiabilities,shortDebt,priorAssets,priorExcessCash,priorLiabilities,priorShortDebt);if(excessCash>currentAssets||shortDebt>currentLiabilities||priorExcessCash>priorAssets||priorShortDebt>priorLiabilities)throw Error('Cash and debt components cannot exceed their corresponding totals.');const current=currentAssets-excessCash-currentLiabilities+shortDebt,prior=priorAssets-priorExcessCash-priorLiabilities+priorShortDebt;return{current,prior,delta:current-prior};}
