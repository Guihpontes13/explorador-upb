const assert=require('node:assert/strict'),S=require('./dist/science'),G=require('./dist/filters');
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b} ± ${tol}`);
const fixtures=require('./tests/isoplotr-reference.json');
for(const {input,original,scalar} of fixtures.cases){const m=G.metrics(input);for(const key of ['t','a','sk'])near(m[key],original[key],.0002);if(original.t76>.001)near(m.r,original.r,.001);for(const key of ['tc','c'])near(m[key],scalar[key],.0001);near(m.p,scalar.p,1e-6);near(m.t68,original.t68,1e-8);
 for(const method of ['t','r','a','c','sk','p']){const d=G.definitions[method],expected=method==='p'?original.p>.05:original[method]>d.limits[0]&&original[method]<d.limits[1];assert.equal(G.classify({...input,stage:'raw'},method,...d.limits).status,expected?'C':'D')}
}
console.log('15 independent R fixtures: formulas, likelihood and classifications passed');
const r={...S.curve(2000),sx:.1,sy:.005,rho:.4,stage:'raw',dc:4.6,pConc:.2};
assert.equal(G.classify(r,'imported',-3.5,4.6).status,'D');
assert.equal(G.classify({...r,dc:-3.5},'imported',-3.5,4.6).status,'D');
assert.equal(G.classify(r,'imported',-3.5,4.6,'isoplotr').status,'C');
assert.equal(G.classify({...r,dc:NaN,pConc:NaN},'imported',-3.5,4.6).status,'U');
assert.equal(G.classify({...r,stage:'corrected'},'c',-3.5,4.6).status,'U');
assert.equal(G.classify({...r,nonZircon:true},'none',0,1).status,'N');
assert.equal(G.classify({...r,excluded:true},'none',0,1).status,'E');
assert.equal(G.classify({...r,rho:NaN},'c',-3.5,4.6).status,'U');
assert.equal(S.age({t68:1200,t76:1250},'hybrid',1200,'68').value,1200);
assert.equal(S.age({t68:1201,t76:1250},'hybrid',1200,'68').value,1250);
assert.equal(S.age({t68:1201,t76:1250},'hybrid',1300,'68').value,1201);
assert.equal(S.age({t68:1100,t76:1200},'hybrid',1200,'76').value,1200);
assert.ok(Number.isNaN(S.age({t68:1100,t76:NaN},'hybrid',1200,'76').value));
assert.ok(Number.isNaN(S.num('')));assert.equal(S.num('1.234,56'),1234.56);
const k=S.kde([4400],20,0,5000);near(k.y.reduce((a,b)=>a+b,0)*k.step,1,1e-10);assert.equal(S.peaks(k)[0].x,4400);
const partial=S.kde([4400],20,0,4300);assert.ok(partial.y.reduce((a,b)=>a+b,0)*partial.step<.00001);
assert.ok(S.kde([50000],1,0,100000).x.length<=20001);
const young=S.concordiaView([{...S.curve(600),sx:.01,sy:.003,rho:.4}]);assert.ok(young.maxAge<1000);
const old=S.concordiaView([{...S.curve(4400),sx:.01,sy:.003,rho:.4}]);assert.ok(old.maxAge>4400);
assert.equal(S.concordiaView([],true,[0,6000]).maxAge,6000);assert.equal(S.ellipse({...r,rho:NaN}),null);
console.log('Missing data, flags, 1200 Ma switch, strict bounds, KDE and adaptive concordia passed');
