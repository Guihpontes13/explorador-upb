/* SPDX-License-Identifier: GPL-3.0-or-later */
(function(root){
'use strict';
const S=typeof module!=='undefined'?require('./science.js'):root.S;
const fields=[['id','Identificador (opcional)'],['sample','Amostra (opcional; pode ser inferida)'],['well','Grupo / poço (opcional; pode ser inferido)'],['depth','Profundidade (m; opcional)'],['comments','Comentários (opcional)'],['sheetStatus','Classificação pronta (opcional)'],['dc','dc já calculado (%)'],['pConc','p de concordância já calculado'],['t68','Idade 206Pb/238U (Ma)'],['e68','Incerteza da idade 206/238 (Ma)'],['t76','Idade 207Pb/206Pb (Ma)'],['e76','Incerteza da idade 207/206 (Ma)'],['best','Idade preferida (Ma)'],['bestError','Incerteza da idade preferida (Ma)'],['x','Razão 207Pb/235U'],['sx','Incerteza da razão 207/235'],['y','Razão 206Pb/238U'],['sy','Incerteza da razão 206/238'],['rho','Rho Wetherill'],['nonZircon','Não zircão (sim / 1 / true)'],['excluded','Não usar (sim / 1 / true)']];
const norm=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const compact=v=>norm(v).replace(/[\s_()\[\]]/g,'');
const text=v=>String(v??'').trim();
const yes=v=>/^(1|sim|true|verdadeiro|yes|x)$/i.test(text(v));
const hasValue=v=>v!==null&&v!==undefined&&v!=='';
const metadata=new Set(['238u/235u','beamsecondsmaximum','beamsecondsmethod','beamsecondssensitivity','defaultfittype','fitendcrop','fitstartcrop','indexchannel','maskchannel','maskcutoff','maskmethod','maskresults','masktrim','referencematerial','uisotopecutoff','uisotopemode','l232','l235','l238']);
function errorKind(v){const s=norm(v).replace(/sigma|σ/g,'s').replace(/[\s_()]/g,'');if(/sys/.test(s))return null;const n=s.match(/([12])s/);if(!n)return null;return{sigma:+n[1],percent:s.includes('%')}}
function guess(data,headerIndex){
 let hi=headerIndex;
 if(!Number.isInteger(hi)){let score=-1;hi=0;data.slice(0,50).forEach((row,i)=>{let n=row.map(compact);const s=(n.some(v=>['identifier','id','identificador'].includes(v))?5:0)+n.filter(v=>/^(r75|r68|206pb\/238u|207pb\/235u|207pb\/206pb|pb207u235|pb206u238|t68|t76|best|age68|age76)$/.test(v)).length;if(s>score){score=s;hi=i}})}
 const h=(data[hi]||[]).map(text),m=Object.fromEntries(fields.map(([k])=>[k,-1])),find=re=>h.findIndex(v=>re.test(compact(v)));
 const patterns={id:/^(identifier|id|identificador)$/,sample:/^(sample|amostra|sampleid|samplename)$/,well:/^(well|grupo|poco|wellid|borehole)$/,depth:/^(depth|depthm|profundidade|profundidadem)$/,sheetStatus:/^(filtrovermeesch2021|filtrovermeesch|classificacao|status|concordanciadiscordancia)$/,comments:/^(comments?|comentarios?|observacoes)$/,dc:/^(dcvermeesch%|dc|dcpct)$/,pConc:/^(pconc)$/,best:/^(bestage|best|idadepreferida)$/,t68:/^(t68|age68)$/,e68:/^(e68|st68)$/,t76:/^(t76|age76)$/,e76:/^(e76|st76)$/,x:/^(r75|x|pb207u235)$/,y:/^(r68|y|pb206u238)$/,sx:/^(sx|sxabs1|sepb207u235)$/,sy:/^(sy|syabs1|sepb206u238)$/,rho:/^(rho|rxy)$/,bestError:/^(besterror)$/,nonZircon:/^(naozircao|nonzircon)$/,excluded:/^(naousar|excluded)$/};
 for(const [key,re] of Object.entries(patterns))m[key]=find(re);
 // The adjacent uncertainty label distinguishes ratios from ages with repeated titles.
 const ratioFields={'207pb/235u':['x','sx'],'206pb/238u':['y','sy']};
 const ageFields={'206pb/238u':['t68','e68'],'207pb/206pb':['t76','e76']};
 for(let i=0;i<h.length;i++){const name=compact(h[i]),err=errorKind(h[i+1]);if(err?.percent&&ratioFields[name]){const[a,b]=ratioFields[name];if(m[a]<0){m[a]=i;m[b]=i+1}}else if(err&&!err.percent&&ageFields[name]){const[a,b]=ageFields[name];if(m[a]<0){m[a]=i;m[b]=i+1}}}
 // A single explicitly labelled isotope column with no adjacent age error is a ratio.
 for(const[name,[key]] of Object.entries(ratioFields)){if(m[key]<0){const a=h.map((v,i)=>compact(v)===name?i:-1).filter(i=>i>=0);if(a.length===1&&!errorKind(h[a[0]+1]))m[key]=a[0]}}
 const ratioUnits=['sx','sy'].map(k=>errorKind(h[m[k]])).filter(Boolean),ageUnits=['e68','e76','bestError'].map(k=>errorKind(h[m[k]])).filter(Boolean);
 const unit=ratioUnits[0],err=unit?(unit.percent?'pct':'abs')+unit.sigma:h.some(v=>/^(sxabs1|sepb207u235)$/.test(compact(v)))?'abs1':'pct1';
 const profile=m.comments>=0&&m.x>=0&&m.y>=0&&m.t68>=0&&m.t76>=0&&h.filter(v=>compact(v)==='206pb/238u').length>1;
 const warnings=[];if(ratioUnits.some(x=>x.sigma!==unit.sigma||x.percent!==unit.percent))warnings.push('As razões usam convenções de erro diferentes; confira o mapeamento.');if(ageUnits.some(x=>x.percent||x.sigma!==ageUnits[0].sigma))warnings.push('As idades usam convenções de erro diferentes; confira o mapeamento.');
 return{hi,map:m,err,ageErr:ageUnits[0]?.sigma||1,profile,warnings};
}
function identifierParts(value){
 const id=text(value),hasFile=/\.fin\d*$/i.test(id);
 // Strip only a numbered spot suffix; do not mistake the spot number for depth.
 const core=id.replace(/\s*[-_]\s*\d+(?:\.[A-Za-z]+\d*)?$/i,match=>hasFile? '':match).trim();
 const m=core.match(/^(?:\d+)?([A-Za-z]{2,12}?)(\d+)(?:[A-Za-z]{0,4})[_-](\d+(?:[.,]\d+)?)$/);
 return{core,hasFile,well:m?m[1].toUpperCase()+Number(m[2]):'',depth:m?S.num(m[3]):NaN};
}
function referenceName(id,comments){
 const core=identifierParts(id).core.replace(/^Z[_ -]?/i,''),c=text(comments);
 const explicit=c.match(/^Z[_ -](91500|plesovice|gj[-_]?1|temora(?:[-_]?\d+)?|penglai|mudtank|r33|sl13)$/i);
 if(explicit)return explicit[1];
 if(/^(91500|plesovice|gj[-_]?1|temora(?:[-_]?\d+)?|penglai|mudtank|r33|sl13)$/i.test(core))return core;
 return '';
}
function excludedComment(value){return /^(nao[ _-]*usar|do[ _-]*not[ _-]*use|exclude[dr]?|excluir|rejeitar)(?:\s*[:;.!-].*)?$/.test(norm(value))}
function parseSheet(p,{stage='unknown',infer=true,excludeReferences=true,respectComments=true}={}){
 const records=[],m=p.map,report={metadata:0,blank:0,unreadable:0,references:0,commentExclusions:0,conflicts:0};
 if(!['t68','t76','best','x','y'].some(k=>m[k]>=0))return{records,report,skipped:true};
 for(let line=p.hi+1;line<p.data.length;line++){
  const v=p.data[line];if(!v.some(hasValue)){report.blank++;continue}
  const rawId=text(v[m.id]),dataFields=['x','y','t68','t76','best'].map(k=>v[m[k]]);
  // Known acquisition settings and rows with only free text are not analyses.
  if(metadata.has(norm(rawId))&&!dataFields.some(hasValue)){report.metadata++;continue}
  if(!dataFields.some(hasValue)&&!(/\.fin\d*$/i.test(rawId))){report.unreadable++;continue}
  const r={};for(const[k]of fields)r[k]=['id','sample','well','comments','sheetStatus'].includes(k)?text(v[m[k]]):['nonZircon','excluded'].includes(k)?yes(v[m[k]]):S.num(v[m[k]]);
  const originalSample=r.sample,parts=identifierParts(r.id),sheetParts=identifierParts(p.name),groupSample=originalSample||(sheetParts.well?p.name:''),candidate=identifierParts(groupSample||r.id),commentParts=identifierParts(r.comments),standard=referenceName(r.id,r.comments);
  r.rawSample=originalSample||parts.core;r.sheetStatus=readStatus(r.sheetStatus);if(r.sheetStatus==='N')r.nonZircon=true;if(r.sheetStatus==='E')r.excluded=true;r.isReference=!!standard;r.identityWarning='';r.depthSource=Number.isFinite(r.depth)?'coluna':'';
  if(infer){
   if(!r.sample)r.sample=groupSample||(parts.hasFile||candidate.well?parts.core:'');
   if(!r.well)r.well=candidate.well;
   if(!Number.isFinite(r.depth)&&Number.isFinite(candidate.depth)){r.depth=candidate.depth;r.depthSource=groupSample?(originalSample?'amostra':'aba'):'identificador'}
   if(candidate.well&&commentParts.well&&(candidate.well!==commentParts.well||candidate.depth!==commentParts.depth)){r.identityWarning='Comentário diverge do identificador/amostra; o comentário não foi usado para agrupar.';report.conflicts++}
  }
  r.id=r.id||`Linha ${line+1}`;r.sample=r.sample||p.name;r.well=r.well||(standard?'Padrões':'Sem grupo');
  r.stage=stage;r.origin=p.file+' / '+p.name;r.line=line+1;
  if(standard){report.references++;if(excludeReferences){r.excluded=true;r.exclusionReason='Padrão de referência (exclusão na importação)'}}
  if(respectComments&&excludedComment(r.comments)){report.commentExclusions++;r.excluded=true;r.exclusionReason='Comentário marcado como não usar'}
  const div=p.err.endsWith('2')?2:1;r.sx=r.sx/div*(p.err.startsWith('pct')?Math.abs(r.x)/100:1);r.sy=r.sy/div*(p.err.startsWith('pct')?Math.abs(r.y)/100:1);for(const k of ['e68','e76','bestError'])r[k]/=p.ageErr;
  records.push(r);
 }
 return{records,report,skipped:false};
}
function readStatus(v){const n=norm(v).replace(/[ _-]+/g,' ');if(['concordante','concordant','c','true','verdadeiro'].includes(n))return'C';if(['discordante','discordant','d','false','falso'].includes(n))return'D';if(['nao zircao','non zircon','n'].includes(n))return'N';if(['nao usar','excluida','excluido','excluded','e'].includes(n))return'E';return'U'}
const I={fields,guess,parseSheet,identifierParts,referenceName,excludedComment,readStatus};if(typeof module!=='undefined')module.exports=I;else root.I=I;
})(typeof window!=='undefined'?window:globalThis);
