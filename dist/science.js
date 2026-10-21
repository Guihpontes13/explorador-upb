(function(root){
const intervals=[['0–1000 Ma',0,1000],['1000–2000 Ma',1000,2000],['2000–3000 Ma',2000,3000],['3000–4000 Ma',3000,4000],['4000–5000 Ma',4000,5000]];
function num(v){if(v===null||v===undefined||v===''||typeof v==='boolean')return NaN;if(typeof v==='number')return Number.isFinite(v)?v:NaN;let s=String(v).trim().replace(/\s/g,'');if(!s||s.startsWith('#'))return NaN;if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else s=s.replace(',','.');return Number(s)}
function classify(dc,lo=-3.5,hi=4.6){return !Number.isFinite(dc)?'U':dc>lo&&dc<hi?'C':'D'}
function age(r,mode='hybrid',cutoff=1200,ref='76'){let switch76=ref==='68'?r.t68>cutoff:r.t76>=cutoff;let k=mode==='best'?'best':mode==='68'?'t68':mode==='76'?'t76':switch76?'t76':'t68';if(mode==='hybrid'&&!Number.isFinite(r['t'+ref]))return{value:NaN,error:NaN,key:'sem referência'};return {value:r[k],error:k==='t76'?r.e76:k==='t68'?r.e68:r.bestError,key:k}}
function kde(ages,bandwidth=20,min=0,max=5000){let step=Math.min(2,bandwidth/5),count=Math.ceil((max-min)/step);if(count>20000){count=20000;step=(max-min)/count}let x=Array.from({length:count+1},(_,i)=>min+i*step),y=new Array(x.length).fill(0);for(let age of ages){let lo=Math.max(0,Math.ceil((age-8*bandwidth-min)/step)),hi=Math.min(count,Math.floor((age+8*bandwidth-min)/step));for(let i=lo;i<=hi;i++)y[i]+=Math.exp(-.5*((x[i]-age)/bandwidth)**2)}let scale=ages.length*bandwidth*Math.sqrt(2*Math.PI);if(scale)y=y.map(v=>v/scale);return{x,y,step}}

function curve(t){return {x:Math.expm1(0.00098485*t),y:Math.expm1(0.000155125*t)}}
function ellipse(r){if(!(r.x>0&&r.y>0&&r.sx>0&&r.sy>0&&Number.isFinite(r.rho)&&Math.abs(r.rho)<1))return null;let x=[],y=[],q=Math.sqrt(5.991464547);for(let i=0;i<=48;i++){let a=2*Math.PI*i/48;x.push(r.x+q*r.sx*Math.cos(a));y.push(r.y+q*r.sy*(r.rho*Math.cos(a)+Math.sqrt(1-r.rho*r.rho)*Math.sin(a)))}return{x,y}}
function peaks(d,n=2){return d.x.map((x,i)=>({x,y:d.y[i],i})).filter(p=>p.i>0&&p.i<d.y.length-1&&p.y>d.y[p.i-1]&&p.y>=d.y[p.i+1]).sort((a,b)=>b.y-a.y).reduce((o,p)=>o.length<n&&o.every(q=>Math.abs(q.x-p.x)>=40)?[...o,p]:o,[])}
// Published age centres, not measured spots or certified calibration ratios.
const standards=[
 {name:'Plešovice',id:'PLESOVICE',t68:337.13,t76:337.13,model76:true,note:'t207/206 igualado a t206/238 apenas como hipótese concordante da simulação.',sources:[{label:'Sláma et al. (2008)',url:'https://doi.org/10.1016/j.chemgeo.2007.11.005'}]},
 {name:'GJ-1',id:'GJ1',t68:600.4,t76:608.6,model76:false,note:'Valores de Jackson et al. (2004) conforme reportados por Bühn et al. (2009); escolha explícita para este exemplo.',sources:[{label:'Bühn et al. (2009)',url:'https://doi.org/10.1590/S0001-37652009000100011'},{label:'Jackson et al. (2004)',url:'https://doi.org/10.1016/j.chemgeo.2004.06.017'}]},
 {name:'91500',id:'91500',t68:1062.4,t76:1065.4,model76:false,note:'Valores de Wiedenbeck et al. (1995) conforme discutidos por Schoene et al. (2006).',sources:[{label:'Schoene et al. (2006), seção 3.7',url:'https://doi.org/10.1016/j.gca.2005.09.007'},{label:'Wiedenbeck et al. (1995)',url:'https://doi.org/10.1111/j.1751-908X.1995.tb00147.x'}]}
];
const demoConfig={perStandard:80,sigmaX:.015,sigmaY:.01,rho:.6,seed:91500};
function standardRatios(s){const y=curve(s.t68).y,pb=curve(s.t76);return {x:y*pb.x/pb.y,y}}
function demo(){
 let state=demoConfig.seed;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return(state+.5)/4294967296};
 const out=[],{perStandard,sigmaX,sigmaY,rho}=demoConfig;
 for(const s of standards){const centre=standardRatios(s),sx=centre.x*sigmaX,sy=centre.y*sigmaY;
  for(let i=0;i<perStandard;i++){
   const radius=Math.sqrt(-2*Math.log(random())),angle=2*Math.PI*random(),z1=radius*Math.cos(angle),z2=radius*Math.sin(angle);
   out.push({id:`SIM-${s.id}-${String(i+1).padStart(3,'0')}`,sample:`${s.name} · simulado`,well:'Padrões simulados',depth:NaN,x:centre.x+sx*z1,y:centre.y+sy*(rho*z1+Math.sqrt(1-rho*rho)*z2),sx,sy,rho,t68:NaN,t76:NaN,e68:NaN,e76:NaN,dc:NaN,stage:'raw',nonZircon:false,excluded:false,isReference:true,simulation:true,referenceMaterial:s.name,referenceT68:s.t68,referenceT76:s.t76,comments:'DADO SINTÉTICO. Razões, dispersão e incertezas simuladas; sem finalidade de calibração.',origin:`Simulação de ${s.name}; centros t206/238=${s.t68} Ma e t207/206=${s.t76} Ma${s.model76?' (t207/206 assumido no modelo)':''}`});
  }
 }
 return out;
}

// Shared, equal-width bins for the selected ages; every age belongs to one bin.
function populationBins(ages){
 let min=Infinity,max=-Infinity;
 for(const age of ages)if(Number.isFinite(age)&&age>0){min=Math.min(min,age);max=Math.max(max,age)}
 if(!Number.isFinite(min))return{bounds:[],step:NaN};
 const raw=max>min?(max-min)/16:Math.max(max*.02,1),power=10**Math.floor(Math.log10(raw));
 const step=([1,2,2.5,5,10].find(n=>n*power>=raw)||10)*power;
 const first=Math.floor(min/step),last=Math.floor(max/step)+1;
 const edges=Array.from({length:last-first+1},(_,i)=>Number(((first+i)*step).toPrecision(14)));
 if(edges[0]>min)edges.unshift(Number(((first-1)*step).toPrecision(14)));
 if(edges.at(-1)<=max)edges.push(Number(((last+1)*step).toPrecision(14)));
 return{bounds:edges.slice(0,-1).map((lo,i)=>[lo,edges[i+1]]),step};
}

// Only the viewport changes: the Wetherill curve itself keeps its physical definition.
function concordiaView(rows,withEllipses=true,range=[0,5000]){
 const valid=rows.filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)&&r.x>0&&r.y>0);
 if(!valid.length){const [minAge,maxAge]=range;return {minAge,maxAge,ticks:Array.from({length:6},(_,i)=>minAge+(maxAge-minAge)*i/5),xRange:null,yRange:null}}
 let tmin=Infinity,tmax=-Infinity,xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 for(const r of valid){
  const tx=Math.log1p(r.x)/.00098485,ty=Math.log1p(r.y)/.000155125;
  tmin=Math.min(tmin,tx,ty);tmax=Math.max(tmax,tx,ty);
  xmin=Math.min(xmin,r.x);xmax=Math.max(xmax,r.x);ymin=Math.min(ymin,r.y);ymax=Math.max(ymax,r.y);
  const e=withEllipses?ellipse(r):null;
  if(e){xmin=Math.min(xmin,...e.x);xmax=Math.max(xmax,...e.x);ymin=Math.min(ymin,...e.y);ymax=Math.max(ymax,...e.y)}
 }
 const pad=Math.max((tmax-tmin)*.08,tmax*.015,1);
 const minAge=Math.max(0,tmin-pad),maxAge=tmax+pad;
 const a=curve(minAge),b=curve(maxAge);
 xmin=Math.min(xmin,a.x);xmax=Math.max(xmax,b.x);ymin=Math.min(ymin,a.y);ymax=Math.max(ymax,b.y);
 const px=Math.max((xmax-xmin)*.12,1e-8),py=Math.max((ymax-ymin)*.12,1e-8);
 const raw=(maxAge-minAge)/5,pow=10**Math.floor(Math.log10(raw));
 const step=([1,2,5,10].find(n=>n*pow>=raw)||10)*pow,ticks=[];
 for(let t=Math.ceil(minAge/step)*step;t<=maxAge+step*1e-8;t+=step)ticks.push(Number(t.toPrecision(10)));
 return {minAge,maxAge,ticks,xRange:[xmin-px,xmax+px],yRange:[ymin-py,ymax+py]};
}
const S={populationBins,concordiaView,intervals,num,classify,age,kde,curve,ellipse,peaks,demo,standards,demoConfig,standardRatios};if(typeof module!=='undefined')module.exports=S;else root.S=S;
})(typeof window!=='undefined'?window:globalThis);
