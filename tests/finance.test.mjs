import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const F = existsSync(new URL('../lab/finance.mjs', import.meta.url)) ? await import('../lab/finance.mjs') : {};
const call = (name, ...args) => { assert.equal(typeof F[name], 'function', `${name} must exist`); return F[name](...args); };
const close = (a,b,tolerance=1e-7) => assert.ok(Math.abs(a-b)<tolerance, `${a} differs from ${b}`);

test('discounts a growing annuity with its first payment at year one',()=>{
  const a=call('cashFlowSeries',{payment:450000,rate:.1096,growth:.0287,periods:10,first:1});
  close(a.pv,2953345.6629314595); assert.equal(a.rows[0].time,1); assert.equal(a.rows[9].time,10);
});
test('deferred annuity counts 16 payments at years 3 through 18',()=>{
  const a=call('cashFlowSeries',{payment:7000,rate:.111,periods:16,first:3});
  close(a.pv,41608.81741268268); assert.equal(a.rows.length,16); assert.equal(a.rows[15].time,18);
});
test('annuity due discounts no portion of its first payment',()=>{
  const a=call('cashFlowSeries',{payment:100,rate:.1,periods:2,first:0});
  close(a.pv,190.9090909090909); close(a.rows[0].pv,100);
});
test('zero discount rate returns the nominal total',()=>{
  const a=call('cashFlowSeries',{payment:100,rate:0,periods:3,first:1}); close(a.pv,300); close(a.fv,300);
});
test('equal growth and discount rates are finite',()=>{
  close(call('cashFlowSeries',{payment:100,rate:.05,growth:.05,periods:10,first:1}).pv,952.3809523809523);
});
test('future value includes seven deposits and only six periods of interest on first',()=>{
  close(call('cashFlowSeries',{payment:20000,rate:.098,periods:7,first:1}).fv,188581.65706868336);
});
test('cash flow signs are preserved and invalid periods are rejected',()=>{
  assert.ok(call('cashFlowSeries',{payment:-100,rate:.1,periods:2}).pv<0);
  assert.throws(()=>call('cashFlowSeries',{payment:100,rate:.1,periods:1.5}));
  assert.throws(()=>call('cashFlowSeries',{payment:100,rate:-1,periods:2}));
});
test('perpetuity rejects nonconvergent growth and handles beginning payments',()=>{
  close(call('perpetuity',{payment:100,rate:.1,growth:.02,first:1}),1250);
  close(call('perpetuity',{payment:100,rate:.1,growth:.02,first:0}),1375);
  assert.throws(()=>call('perpetuity',{payment:100,rate:.02,growth:.03}));
});
test('general TVM solves future value and zero-rate payment and periods',()=>{
  close(call('solveTVM',{solve:'fv',pv:1000,pmt:100,rate:0,n:10,fv:0}),2000);
  close(call('solveTVM',{solve:'pmt',pv:1000,fv:2000,rate:0,n:10,pmt:0}),100);
  close(call('solveTVM',{solve:'n',pv:1000,fv:2000,rate:0,pmt:100,n:0}),10);
  close(call('solveTVM',{solve:'rate',pv:7000,fv:21000,pmt:0,n:5,rate:0}),.2457309396155174);
});
test('TVM rate solver finds negative returns and rejects no solution',()=>{
  close(call('solveTVM',{solve:'rate',pv:1000,fv:900,pmt:0,n:1,rate:0}),-.1);
  assert.throws(()=>call('solveTVM',{solve:'rate',pv:0,fv:100,pmt:0,n:5,rate:0}));
});
test('WACC uses market weights and the debt tax shield, including preferred',()=>{
  const a=call('wacc',{rf:.04,beta:1.2,erp:.05,debtRate:.06,tax:.25,equity:600,debt:300,preferred:100,preferredRate:.07});
  close(a.equityRate,.10); close(a.value,.0805);
  assert.throws(()=>call('wacc',{rf:.04,beta:1,erp:.05,debtRate:.06,tax:.25,equity:0,debt:0,preferred:0,preferredRate:0}));
});
test('DCF values terminal cash flow at year n and preserves negative equity',()=>{
  const a=call('dcf',{fcf:100,growth:0,terminalGrowth:0,rate:.1,n:1,debt:1500,cash:0,shares:10});
  close(a.ev,1000); close(a.equity,-500); close(a.price,-50); close(a.terminalShare,10/11);
  assert.throws(()=>call('dcf',{fcf:100,growth:0,terminalGrowth:.1,rate:.1,n:5,debt:0,cash:0,shares:10}));
});
test('bond price equals par when coupon equals yield including semiannual',()=>{
  close(call('bond',{face:1000,coupon:.06,yield:.06,years:5,frequency:2}).price,1000);
  close(call('bond',{face:1000,coupon:.05,yield:0,years:2,frequency:1}).price,1100);
});
test('bond YTM inverts discounted coupon cash flows',()=>{
  close(call('bondYield',{face:1000,coupon:0,years:1,frequency:1,price:950}),.05263157894736836);
});
test('Hamada can unlever and relever the same beta',()=>{
  const a=call('hamada',{beta:1.5,tax:.25,de:1,targetDe:1}); close(a.unlevered,1.5/1.75); close(a.relevered,1.5);
});
test('options distinguish payoff from profit for long and short positions',()=>{
  const a=call('option',{spot:120,strike:100,premium:7,type:'call',position:'long'});close(a.payoff,20);close(a.profit,13);close(a.breakEven,107);
  close(call('option',{spot:80,strike:100,premium:7,type:'put',position:'short'}).profit,-13);
});
test('MM tax shield and explicit distress model are separately calculated',()=>{
  const a=call('leverage',{unlevered:1000,debt:200,tax:.25,distress:0}); close(a.value,1050); close(a.shield,50);
});
test('DuPont three-factor ROE equals net income divided by equity',()=>{
  const a=call('dupont',{income:20,sales:200,assets:100,equity:50}); close(a.roe,.4); close(a.margin,.1); close(a.turnover,2); close(a.multiplier,2);
});
test('FCF handles increases and releases in operating working capital',()=>{
  close(call('fcf',{ebit:100,tax:.25,da:10,capex:20,deltaNwc:5}).value,60);
  close(call('fcf',{ebit:100,tax:.25,da:10,capex:20,deltaNwc:-5}).value,70);
});
