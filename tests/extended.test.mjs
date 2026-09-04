import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as F from '../lab/finance.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const app=readFileSync(new URL('../lab/app.mjs',import.meta.url),'utf8');
const calculators=readFileSync(new URL('../lab/calculators.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../lab/index.html',import.meta.url),'utf8');
test('bond duration of a zero coupon is its maturity and modified duration adjusts yield',()=>{
 const b=F.bond({face:1000,coupon:0,yield:.1,years:2,frequency:1});close(b.duration,2);close(b.modifiedDuration,2/1.1);
});
test('a put premium above strike has no attainable break-even',()=>{assert.equal(F.option({spot:0,strike:50,premium:60,type:'put',position:'long'}).breakEven,null);});
test('balance sheet working capital excludes financing and excess cash',()=>{
 assert.equal(typeof F.operatingCapital,'function');const a=F.operatingCapital({currentAssets:3000,excessCash:400,currentLiabilities:1800,shortDebt:200,priorAssets:2700,priorExcessCash:350,priorLiabilities:1700,priorShortDebt:180});close(a.current,1000);close(a.prior,830);close(a.delta,170);
});
test('TVM present-value branch reverses savings future value',()=>{close(F.solveTVM({solve:'pv',fv:1420,pmt:100,rate:.1,n:2}),1000);});
test('M&M tax zero produces no shield and finite no-distress value',()=>{const a=F.leverage({unlevered:100,debt:50,tax:0,distress:0});close(a.value,100);close(a.shield,0);});
test('mobile navigation is controllable, inert while closed, and route changes move focus',()=>{
 assert.match(html,/id="sidebar"/);assert.match(html,/aria-controls="sidebar"/);
 assert.match(app,/\.inert=/);assert.match(app,/#main'\)\.focus/);
});
test('every calculator, including savings, is discoverable in the tool rail',()=>{assert.match(app,/savings:'Savings'/);assert.match(html,/nav-badge">10/);});
test('relationship-plot legends carry their own series colors',()=>{assert.match(calculators,/--legend-color:/);});
test('wide finance tables use scroll containers and scoped headings',()=>{
 assert.match(calculators,/table-scroll[^`]*data-table/);assert.match(calculators,/scope="col"/);assert.match(calculators,/scope="row"/);
});
