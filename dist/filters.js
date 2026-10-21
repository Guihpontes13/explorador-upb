/* SPDX-License-Identifier: GPL-3.0-or-later
 * Numerical definitions adapted from Pieter Vermeesch, IsoplotR 7.0.1,
 * R/discfilter.R, R/commonPb.R, R/concordia.R, commit dadd830f8e4d1e90220de55dbb2e80f35e7235f0.
 * Independent JavaScript implementation for equilibrium Wetherill data.
 */
(function(root){
const L8=.000155125,L5=.00098485,U=137.818;
const definitions={
 c:{name:'Distância à concórdia (dc)',unit:'%',limits:[-3.5,4.6],help:'Distância logarítmica com sinal até a composição de máxima verossimilhança na concórdia. Limites iniciais personalizados; o padrão do IsoplotR 7.0.1 é −2 / +5,8.'},
 r:{name:'Discordância relativa (dr)',unit:'%',limits:[-5,15],help:'100 × (1 − t206/238 ÷ t207/206). Limites iniciais do IsoplotR: −5 / +15.'},
 t:{name:'Diferença de idades (dt)',unit:'Ma',limits:[-48,140],help:'t207/206 − t206/238, em Ma. “Absoluta” significa em unidades de idade; o sinal é preservado.'},
 a:{name:'Distância perpendicular (da)',unit:'%',limits:[-1.6,4.7],help:'Distância logarítmica perpendicular, com a geometria corrigida e a expressão implementada no IsoplotR 7.0.1.'},
 sk:{name:'Stacey–Kramers (dsk)',unit:'%',limits:[-.36,.96],help:'Fração de Pb comum estimada pelo modelo de dois estágios. Implementação para razões 207/235 e 206/238 com erros e Rho (equivalente à entrada sem 204Pb).'},
 p:{name:'Teste estatístico de concordância',unit:'p',limits:[.05,1],help:'Retém análises com p de concordância > α. Usa a distância de Mahalanobis à concórdia e χ² com 1 grau de liberdade.'},
 sheet:{name:'Classificação pronta na planilha',unit:'',limits:[-3.5,4.6],help:'Preserva os rótulos de concordância/discordância da planilha. Não recalcula o filtro; limites e α não se aplicam neste modo.'},
 imported:{name:'dc já calculado na planilha',unit:'%',limits:[-3.5,4.6],help:'Usa o dc importado. Confira sua definição e etapa de correção. Não substitui valores ausentes por % de concordância.'},
 none:{name:'Sem filtro de discordância',unit:'',limits:[-3.5,4.6],help:'Retém todas as análises elegíveis. Isso não demonstra concordância isotópica.'}
};
const curve=t=>({x:Math.expm1(L5*t),y:Math.expm1(L8*t)});
function pb76(t){if(Math.abs(t)<1e-8)return L5/(L8*U);const c=curve(t);return c.x/c.y/U}
function minimize(f,a,b){const g=(Math.sqrt(5)-1)/2;let c=b-g*(b-a),d=a+g*(b-a),fc=f(c),fd=f(d);for(let i=0;i<100&&b-a>1e-9;i++){if(fc<fd){b=d;d=c;fd=fc;c=b-g*(b-a);fc=f(c)}else{a=c;c=d;fc=fd;d=a+g*(b-a);fd=f(d)}}return(fc<fd?c:d)}
function age76(r){if(!(r>0))return NaN;if(r<=pb76(.0001))return .0001;let lo=.0001,hi=10000;for(let i=0;i<90;i++){let mid=(lo+hi)/2;if(pb76(mid)<r)lo=mid;else hi=mid}return (lo+hi)/2}
function erfc(x){const z=Math.abs(x),t=1/(1+z/2);let ans=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(.37409196+t*(.09678418+t*(-.18628806+t*(.27886807+t*(-1.13520398+t*(1.48851587+t*(-.82215223+t*.17087277)))))))));return x>=0?ans:2-ans}
function covarianceValid(r){return r.sx>0&&r.sy>0&&Number.isFinite(r.sx)&&Number.isFinite(r.sy)&&Number.isFinite(r.rho)&&Math.abs(r.rho)<1}
function concordiaFit(r){if(!covarianceValid(r)||!(r.x>0&&r.y>0))return {tc:NaN,p:NaN};const f=t=>{let c=curve(t),dx=(r.x-c.x)/r.sx,dy=(r.y-c.y)/r.sy;return (dx*dx+dy*dy-2*r.rho*dx*dy)/(1-r.rho*r.rho)};let edges=[0,Math.min(10000,Math.log1p(r.x)/L5),Math.min(10000,Math.log1p(r.y)/L8),10000].sort((a,b)=>a-b),tc=0,q=f(0);for(let i=1;i<edges.length;i++){let t=minimize(f,edges[i-1],edges[i]),v=f(t);if(v<q){tc=t;q=v}}return{tc,p:Math.min(1,erfc(Math.sqrt(Math.max(0,q)/2))),q}}
function sk76(t){let young=t<3700,ti=young?3700:4570,mu=young?9.74:7.19;return ((young?12.998:10.294)+mu*(Math.exp(L5*ti)-Math.exp(L5*t))/U)/((young?11.152:9.307)+mu*(Math.exp(L8*ti)-Math.exp(L8*t)))}
function staceyKramers(r,t76){if(!covarianceValid(r)||!(t76>0))return NaN;let X=1/r.y,Y=r.x/r.y/U,ex=r.sx/r.x,ey=r.sy/r.y;
let vx=X*X*ey*ey,vy=Y*Y*(ex*ex+ey*ey-2*r.rho*ex*ey),cv=X*Y*(ey*ey-r.rho*ex*ey);
const misfit=t=>{let c=curve(t),a=sk76(t),b=c.x/U-a*c.y,v=vy+b*b*vx-2*b*cv;return v>0?(Y-a-b*X)**2/v:Infinity};
let ti=minimize(misfit,1e-8,t76);let cc=curve(ti),b=cc.x/U-sk76(ti)*cc.y,a=Y-b*X,t68=Math.log1p(r.y)/L8;
// Project the measured point along the fitted SK slope, as commonPb.R does.
const f=t=>{const q=curve(t);return q.x/U-a*q.y-b};
let lo,hi;if(b<0&&t76>t68){lo=0;hi=t68}else if(b<0){lo=0;hi=NaN;for(let i=0;i<100;i++){let t=5000*i/99;if(f(t)<0){hi=t;break}}}else{lo=Math.min(t68,t76);hi=Math.max(t68,t76)}
let tc=t68;if(Number.isFinite(hi)&&f(lo)*f(hi)<=0){for(let i=0;i<90;i++){let mid=(lo+hi)/2;if(f(lo)*f(mid)<=0)hi=mid;else lo=mid}tc=(lo+hi)/2}
// If no projection bracket exists, retain t68, matching the reference fallback.
return 100*(1-X*curve(tc).y)}
function metrics(r){const nan={t:NaN,r:NaN,a:NaN,c:NaN,sk:NaN,p:NaN,tc:NaN};if(!(Number.isFinite(r.x)&&Number.isFinite(r.y)&&r.x>0&&r.y>0))return nan;
const t68=Math.log1p(r.y)/L8,t76=age76(r.x/r.y/U),X=1/r.y,Y=r.x/r.y/U,fit=concordiaFit(r);
const DX=(Math.log(X)+Math.log(curve(t76).y))/Math.sqrt(2),DY=(Math.log(Y)-Math.log(pb76(t68)))/Math.sqrt(2/3);
const a=Math.abs(DX)+Math.abs(DY)<1e-12?0:100*DX*Math.sin(Math.atan(DY/DX));
let c=NaN;if(fit.tc>0){let cc=curve(fit.tc),cX=1/cc.y,cY=cc.x/cc.y/U,dx=(Math.log(X)-Math.log(cX))/Math.sqrt(2),dy=(Math.log(Y*Y/X)-Math.log(cY*cY/cX))/Math.sqrt(6);c=100*Math.sign(t76-t68)*Math.hypot(dx,dy)}
return{t:t76-t68,r:100*(1-t68/t76),a,c,sk:staceyKramers(r,t76),p:fit.p,tc:fit.tc,t68,t76};}
function classify(r,method,lo,hi,rule='limits',alpha=.05){
if(r.nonZircon)return{status:'N',value:NaN,reason:'Marcada explicitamente como não zircão'};
if(r.excluded)return{status:'E',value:NaN,reason:r.exclusionReason||'Excluída explicitamente na planilha'};
if(method==='sheet')return{status:['C','D','N','E'].includes(r.sheetStatus)?r.sheetStatus:'U',value:r.dc,reason:'Classificação importada da planilha'};
if(method==='none')return{status:'C',value:NaN,reason:'Retida sem filtro de discordância'};
if(method!=='imported'&&r.stage!=='raw')return{status:'U',value:NaN,reason:'Confirme que as razões são anteriores à correção de Pb comum'};
let m=r.metrics||metrics(r),v=method==='imported'?r.dc:m[method],p=method==='imported'?r.pConc:m.p;
if(method==='p')return{status:Number.isFinite(p)?p>alpha?'C':'D':'U',value:p,reason:Number.isFinite(p)?`p ${p>alpha?'>':'≤'} α`:'Incertezas/Rho insuficientes para o teste'};
const inside=Number.isFinite(v)&&v>lo&&v<hi;
if(rule==='isoplotr'&&p>alpha)return{status:'C',value:v,reason:'p de concordância > α'};
if(inside)return{status:'C',value:v,reason:'Dentro dos limites estritos'};
if(!Number.isFinite(v)||(rule==='isoplotr'&&!Number.isFinite(p)))return{status:'U',value:v,reason:'Dados insuficientes para decidir com a regra selecionada'};
return{status:'D',value:v,reason:'Fora dos limites'+(rule==='isoplotr'?' e p ≤ α':'')};}
function deriveAges(r){let m=metrics(r);r.metrics=m;if(!Number.isFinite(r.t68)){r.t68=m.t68;r.e68=r.sy>0?r.sy/(L8*(1+r.y)):NaN}if(!Number.isFinite(r.t76)){r.t76=m.t76;let Y=r.x/r.y/U,err=covarianceValid(r)?Y*Math.sqrt((r.sx/r.x)**2+(r.sy/r.y)**2-2*r.rho*r.sx*r.sy/r.x/r.y):NaN;let dt=.01;r.e76=err/((pb76(m.t76+dt)-pb76(m.t76-dt))/(2*dt))}return r}
const G={definitions,curve,metrics,classify,deriveAges,age76,concordiaFit,covarianceValid,constants:{L5,L8,U}};if(typeof module!=='undefined')module.exports=G;else root.G=G;
})(typeof window!=='undefined'?window:globalThis);
