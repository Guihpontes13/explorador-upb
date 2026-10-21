const assert=require('node:assert/strict'),S=require('../dist/science');
function coversOnce(ages){
 const view=S.populationBins(ages);
 for(const age of ages)assert.equal(view.bounds.filter(([lo,hi])=>age>=lo&&age<hi).length,1,`Age ${age} must be counted exactly once`);
 assert.ok(view.bounds.length<=18,'Keep the comparison readable');
 return view;
}
const young=coversOnce([590,600,610,620]),wide=coversOnce([60,600,1400,2100,3200,4500,5200]);
assert.ok(young.step<wide.step&&young.step<10);
assert.ok(young.bounds[0][0]>=580&&young.bounds.at(-1)[1]<650);
assert.ok(wide.bounds.at(-1)[1]>5200);
coversOnce([1000,1500,2000,2500,3000]);
coversOnce([0.01,0.015,0.02]);
coversOnce([10000,45000,50000]);
assert.equal(coversOnce([2100,2100]).bounds.length,1);
assert.equal(S.populationBins([NaN,Infinity,-1,0]).bounds.length,0);
const ages=[2000,2010,2020,2080,2120],view=coversOnce(ages);
const samples=[ages.slice(0,3),ages.slice(3)];
for(const sample of samples){const percentages=view.bounds.map(([lo,hi])=>100*sample.filter(t=>t>=lo&&t<hi).length/sample.length);assert.ok(Math.abs(percentages.reduce((a,b)=>a+b,0)-100)<1e-9)}
console.log('Adaptive populations: shared bounds, unique counts, boundary ages, narrow ranges, empty data and ages above 4000 Ma passed');
