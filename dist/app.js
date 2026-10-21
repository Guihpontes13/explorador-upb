/* SPDX-License-Identifier: GPL-3.0-or-later */
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palette=['#2b806a','#bf8347','#687bb0','#af627e','#71914a','#6ba5a5','#a69136','#6c64a0'];
const categories={C:['Concordantes','#298065'],D:['Discordantes','#c55b4d'],U:['Não avaliadas','#b28b3b'],N:['Não zircão','#8a7f98'],E:['Excluídas','#8b8d89']};
const sampleKey=r=>JSON.stringify([r.well,r.sample,Number.isFinite(r.depth)?r.depth:null]);
let rows=S.demo().map(G.deriveAges),selected=new Set(rows.map(sampleKey)),tab='kde',source='Exemplo sintético · Plešovice, GJ-1 e 91500 · '+rows.length+' análises',synthetic=true,pending=[],lastRows=[],lastKde=[],lastParams=null,renderId=0,intervals=S.intervals.map(x=>[...x]);
const fields=I.fields;
const fmt=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:d}):'—';
function message(s){$('message').textContent=s}
function nameOf(key){const [well,sample,depth]=JSON.parse(key),same=rows.filter(r=>r.sample===sample),multipleWells=new Set(same.map(r=>r.well)).size>1;return (multipleWells?`${well} · `:'')+sample+(Number.isFinite(depth)?` · ${fmt(depth,2)} m`:'')}
function compareSamples(a,b){
 const [wellA,sampleA,depthA]=JSON.parse(a),[wellB,sampleB,depthB]=JSON.parse(b),knownA=Number.isFinite(depthA),knownB=Number.isFinite(depthB);
 if(knownA!==knownB)return knownA?-1:1;
 return (knownA?depthA-depthB:0)||String(wellA).localeCompare(String(wellB),'pt-BR',{numeric:true})||String(sampleA).localeCompare(String(sampleB),'pt-BR',{numeric:true});
}
function color(key){return palette[[...new Set(rows.map(sampleKey))].indexOf(key)%palette.length]}
function setup(){const wells=[...new Set(rows.map(r=>r.well))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));$('well').innerHTML='<option value="">Todos os grupos</option>'+wells.map(w=>`<option>${esc(w)}</option>`).join('');$('depth').value='';$('activeStage').value=rows[0]?.stage||'unknown';depths();$('source').textContent=source;$('dataBadge').textContent=synthetic?'PADRÕES SIMULADOS':'DADOS IMPORTADOS';$('demoNotice').hidden=!synthetic;samples();render()}
function inLocation(r){return (!$('well').value||r.well===$('well').value)&&(!$('depth').value||($('depth').value==='missing'?!Number.isFinite(r.depth):r.depth===Number($('depth').value)))}
function depths(){const current=$('depth').value,rs=rows.filter(r=>!$('well').value||r.well===$('well').value),vals=[...new Set(rs.map(r=>r.depth).filter(Number.isFinite))].sort((a,b)=>a-b);$('depth').innerHTML='<option value="">Todas as profundidades</option>'+vals.map(d=>`<option value="${d}">${fmt(d,2)} m</option>`).join('')+(rs.some(r=>!Number.isFinite(r.depth))?'<option value="missing">Sem profundidade</option>':'');if([...$('depth').options].some(o=>o.value===current))$('depth').value=current}
function samples(){const keys=[...new Set(rows.filter(inLocation).map(sampleKey))].sort(compareSamples);$('samples').innerHTML=keys.map(k=>`<label><input type="checkbox" value="${esc(k)}" ${selected.has(k)?'checked':''}><span style="color:${color(k)}">●</span>${esc(nameOf(k))}</label>`).join('');$('samples').querySelectorAll('input').forEach(el=>el.onchange=()=>{el.checked?selected.add(el.value):selected.delete(el.value);render()})}
function parameters(){return{method:$('filterMethod').value,rule:$('filterRule').value,low:S.num($('low').value),high:S.num($('high').value),alpha:S.num($('alpha').value),bandwidth:S.num($('bandwidth').value),ageMode:$('ageMode').value,cutoff:S.num($('ageCut').value),cutRef:$('cutRef').value,min:S.num($('kdeMin').value),max:S.num($('kdeMax').value),auto:$('autoKde').checked,kdeView:$('kdeView').value,concordiaView:$('concordiaView').value}}
function filterLabel(p){const d=G.definitions[p.method];return ['none','sheet'].includes(p.method)?d.name:p.method==='p'?`p > ${p.alpha}`:`${d.name}: ${fmt(p.low,3)} < valor < ${fmt(p.high,3)} ${d.unit}${p.rule==='isoplotr'?` OU p > ${p.alpha}`:''}`}
function processed(p){return rows.filter(r=>inLocation(r)&&selected.has(sampleKey(r))).map(r=>{const a=S.age(r,p.ageMode,p.cutoff,p.cutRef),classification=G.classify(r,p.method,p.low,p.high,p.rule,p.alpha);const valid=Number.isFinite(a.value)&&a.value>0&&(!$('positiveError').checked||Number.isFinite(a.error)&&a.error>0);const eligible=!['N','E'].includes(classification.status);return{...r,...classification,age:a.value,error:a.error,ageKey:a.key,valid,kde:eligible&&valid&&($('status').value==='all'||classification.status===$('status').value)}})}
function rangeFor(kd,p){if(!p.auto)return[p.min,p.max];let max=kd.reduce((v,r)=>Math.max(v,r.age),0);if(!max)max=rows.reduce((v,r)=>Math.max(v,Number.isFinite(r.t68)?r.t68:0,Number.isFinite(r.t76)?r.t76:0),100);const pad=Math.max(5*p.bandwidth,50),step=10**Math.floor(Math.log10(Math.max(max,1)))/2;return[0,Math.ceil((max+pad)/step)*step]}
function syncFilter(){const d=G.definitions[$('filterMethod').value],special=['p','none','sheet'].includes($('filterMethod').value);$('filterHelp').textContent=d.help;$('low').value=d.limits[0];$('high').value=d.limits[1];$('limitFields').hidden=special;$('filterRule').disabled=special;$('alpha').disabled=['none','sheet'].includes($('filterMethod').value);render()}
function syncKdeControls(keys,p){
 const previous=$('kdeSample').value;
 $('kdeSample').innerHTML=keys.length?keys.map(k=>`<option value="${esc(k)}">${esc(nameOf(k))}</option>`).join(''):'<option value="">Nenhuma amostra selecionada</option>';
 if(keys.includes(previous))$('kdeSample').value=previous;
 $('kdeSample').disabled=!keys.length;
 $('kdeControls').hidden=tab!=='kde';$('kdeSampleField').hidden=p.kdeView!=='individual';
 $('kdeViewHelp').textContent=p.kdeView==='stacked'?'Um gráfico por amostra, com escalas comuns de idade e densidade. Ordem da mais rasa para a mais profunda; sem profundidade ao final. Exporte cada gráfico pelos seus botões.':p.kdeView==='individual'?'Escolha uma das amostras selecionadas. Contagens e tabela acompanham a amostra exibida; as escalas são comuns à seleção para facilitar a comparação.':'Curvas das amostras selecionadas no mesmo gráfico, com normalização por amostra.';
 return $('kdeSample').value;
}
const plotOptions={responsive:true,displaylogo:false,modeBarButtonsToRemove:['toImage','select2d','lasso2d'],scrollZoom:false};
function syncConcordiaControls(keys,p){
 const previous=$('concordiaSample').value;
 $('concordiaSample').innerHTML=keys.length?keys.map(k=>`<option value="${esc(k)}">${esc(nameOf(k))}</option>`).join(''):'<option value="">Nenhuma amostra selecionada</option>';
 if(keys.includes(previous))$('concordiaSample').value=previous;
 $('concordiaSample').disabled=!keys.length;
 $('concordiaViewControls').hidden=tab!=='concordia';$('concordiaSampleField').hidden=p.concordiaView!=='individual';
 const scale=$('autoConcordia').checked?'O enquadramento se adapta aos pontos visíveis e às incertezas de cada amostra; as escalas podem diferir.':'A curva usa a faixa de idade definida nos parâmetros do KDE.';
 $('concordiaViewHelp').textContent=p.concordiaView==='stacked'?'Um gráfico por amostra, da mais rasa para a mais profunda; sem profundidade ao final. Exporte cada gráfico pelos seus botões. '+scale:p.concordiaView==='individual'?'Escolha uma das amostras selecionadas. Contagens, tabela e CSV acompanham a amostra exibida. '+scale:'Análises das amostras selecionadas no mesmo gráfico. As cores indicam a classificação pelo filtro de discordância.';
 return $('concordiaSample').value;
}
function concordiaPlot(rs,base,p){
 const valid=rs.filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)&&r.x>0&&r.y>0),shown=valid.filter(r=>$('show'+r.status).checked);let ellipseCount=0;
 const view=S.concordiaView($('autoConcordia').checked?shown:[], $('ellipses').checked, p.range);
 const c=Array.from({length:401},(_,i)=>S.curve(view.minAge+(view.maxAge-view.minAge)*i/400));
 const traces=[{x:c.map(q=>q.x),y:c.map(q=>q.y),type:'scatter',mode:'lines',name:`Concórdia ${fmt(view.minAge)}–${fmt(view.maxAge)} Ma`,line:{color:'#304d43',width:1.5},hoverinfo:'skip'},
  {x:view.ticks.map(t=>S.curve(t).x),y:view.ticks.map(t=>S.curve(t).y),text:view.ticks.map(t=>`${fmt(t,2)} Ma`),type:'scatter',mode:'markers+text',textposition:'top center',textfont:{size:9},marker:{size:4,color:'#304d43'},showlegend:false,hoverinfo:'skip'}];
 for(const [s,[label,col]] of Object.entries(categories)){if(!$('show'+s).checked)continue;const a=shown.filter(r=>r.status===s);
  if($('ellipses').checked){let xx=[],yy=[];for(const r of a){const e=S.ellipse(r);if(e){ellipseCount++;xx.push(...e.x,null);yy.push(...e.y,null)}}if(xx.length)traces.push({x:xx,y:yy,type:'scatter',mode:'lines',line:{color:col,width:.8},opacity:.5,showlegend:false,hoverinfo:'skip'})}
  traces.push({x:a.map(r=>r.x),y:a.map(r=>r.y),type:'scatter',mode:'markers',name:`${s==='C'&&p.method==='none'?'Retidas sem filtro':label} · n=${a.length}`,marker:{size:6,color:col,opacity:.85,symbol:s==='N'?'x':s==='E'?'cross':'circle'},text:a.map(r=>`${esc(r.id)}<br>${esc(r.sample)}<br>${esc(G.definitions[p.method].name)}: ${fmt(r.value,4)} ${G.definitions[p.method].unit}<br>${esc(r.reason)}<br>p: ${Number.isFinite(r.metrics.p)?r.metrics.p.toPrecision(3):'—'}`),hovertemplate:'%{text}<br>207/235: %{x:.5f}<br>206/238: %{y:.5f}<extra></extra>'})
 }
 const layout={...base,xaxis:{...base.xaxis,title:{text:'²⁰⁷Pb / ²³⁵U'},range:view.xRange||undefined,autorange:!view.xRange},yaxis:{...base.yaxis,title:{text:'²⁰⁶Pb / ²³⁸U'},range:view.yRange||undefined,autorange:!view.yRange},annotations:shown.length?[]:[{xref:'paper',yref:'paper',x:.5,y:.5,text:'Nenhuma análise visível com razões válidas.',showarrow:false}]};
 return {traces,layout,valid,shown,ellipseCount,view};
}
const concordiaPanels=new Map();
function clearConcordiaPanels(){for(const panel of concordiaPanels.values()){Plotly.purge(panel.plot);panel.card.remove()}concordiaPanels.clear()}
function drawConcordiaPanels(keys,rs,base,p){
 const keep=new Set(keys),revision=renderId;
 for(const [key,panel]of concordiaPanels)if(!keep.has(key)){Plotly.purge(panel.plot);panel.card.remove();concordiaPanels.delete(key)}
 return Promise.all(keys.map((key,index)=>{
  let panel=concordiaPanels.get(key);
  if(!panel){
   const card=document.createElement('section');card.className='kde-panel concordia-panel';
   card.innerHTML='<div class="kde-panel-heading"><div><h4></h4><p></p></div><div class="exports"><button type="button" data-format="svg">SVG</button><button type="button" data-format="png">PNG</button></div></div><div class="concordia-plot"></div>';
   panel={card,plot:card.querySelector('.concordia-plot')};concordiaPanels.set(key,panel);
  }
  $('concordiaPanels').appendChild(panel.card);
  const a=rs.filter(r=>sampleKey(r)===key),name=nameOf(key),plot=concordiaPlot(a,base,p);
  const caption=`${a.length} análises · ${plot.valid.length} com razões válidas · ${plot.shown.length} pontos visíveis · ${plot.ellipseCount} elipses (95%)`;
  panel.card.querySelector('h4').textContent=name;panel.card.querySelector('p').textContent=caption;
  panel.plot.setAttribute('role','img');panel.plot.setAttribute('aria-label',`Concórdia Wetherill de ${name}, ${plot.shown.length} pontos visíveis`);
  const metadata={title:`Concórdia Wetherill · ${name}`,caption,details:filterLabel(p)+` · razões originais · curva ${fmt(plot.view.minAge,2)}–${fmt(plot.view.maxAge,2)} Ma`,filename:`upb_concordia_amostra_${index+1}`};
  const buttons=[...panel.card.querySelectorAll('[data-format]')];
  buttons.forEach(button=>{button.disabled=true;button.setAttribute('aria-label',`Exportar concórdia de ${name} em ${button.dataset.format.toUpperCase()}`);button.onclick=()=>exportChart(panel.plot,button.dataset.format,metadata)});
  return Plotly.react(panel.plot,plot.traces,plot.layout,plotOptions).then(()=>{if(revision===renderId)buttons.forEach(button=>button.disabled=!plot.shown.length)});
 }));
}
const kdePanels=new Map();
function clearKdePanels(){for(const panel of kdePanels.values()){Plotly.purge(panel.plot);panel.card.remove()}kdePanels.clear()}
function drawKdePanels(keys,kd,distributions,base,p){
 const keep=new Set(keys),revision=renderId;
 for(const [key,panel]of kdePanels)if(!keep.has(key)){Plotly.purge(panel.plot);panel.card.remove();kdePanels.delete(key)}
 return Promise.all(keys.map((key,index)=>{
  let panel=kdePanels.get(key);
  if(!panel){
   const card=document.createElement('section');card.className='kde-panel';
   card.innerHTML='<div class="kde-panel-heading"><div><h4></h4><p></p></div><div class="exports"><button type="button" data-format="svg">SVG</button><button type="button" data-format="png">PNG</button></div></div><div class="kde-plot"></div>';
   panel={card,plot:card.querySelector('.kde-plot')};kdePanels.set(key,panel);
  }
  $('kdePanels').appendChild(panel.card);
  const a=kd.filter(r=>sampleKey(r)===key),d=distributions.get(key),name=nameOf(key);
  panel.card.querySelector('h4').textContent=name;
  panel.card.querySelector('p').textContent=`n = ${a.length} · bandwidth = ${fmt(p.bandwidth,3)} Ma · passo = ${fmt(d.step,4)} Ma`;
  panel.plot.setAttribute('role','img');panel.plot.setAttribute('aria-label',`KDE de ${name}, ${a.length} análises`);
  const traces=a.length?[{x:d.x,y:d.y,name:`${name} · n=${a.length}`,type:'scatter',mode:'lines',line:{color:color(key),width:2},hovertemplate:'%{x:.1f} Ma<br>Densidade: %{y:.5f}<extra>%{fullData.name}</extra>'}]:[];
  const layout={...base,xaxis:{...base.xaxis,range:[...base.xaxis.range]},yaxis:{...base.yaxis,range:[...base.yaxis.range]},showlegend:false,margin:{l:65,r:20,t:15,b:50},annotations:a.length?[]:[{xref:'paper',yref:'paper',x:.5,y:.5,text:'Nenhuma análise atende aos filtros nesta amostra.',showarrow:false}]};
  const ageText=p.ageMode==='hybrid'?`Idade híbrida · corte ${fmt(p.cutoff)} Ma (t${p.cutRef==='68'?'206/238':'207/206'})`:p.ageMode==='best'?'Best age da planilha':p.ageMode==='68'?'Idade 206Pb/238U':'Idade 207Pb/206Pb';
  const metadata={title:`Distribuição de idades · KDE · ${name}`,caption:`n = ${a.length} · bandwidth = ${fmt(p.bandwidth,3)} Ma · passo = ${fmt(d.step,4)} Ma · normalizado por amostra`,details:filterLabel(p)+' · '+ageText,filename:`upb_kde_amostra_${index+1}`};
  const buttons=[...panel.card.querySelectorAll('[data-format]')];
  buttons.forEach(button=>{button.disabled=true;button.setAttribute('aria-label',`Exportar ${name} em ${button.dataset.format.toUpperCase()}`);button.onclick=()=>exportChart(panel.plot,button.dataset.format,metadata)});
  return Plotly.react(panel.plot,traces,layout,plotOptions).then(()=>{if(revision===renderId)buttons.forEach(button=>button.disabled=!a.length)});
 }));
}
async function render(){
 const rid=++renderId,p=parameters();
 if(!['p','none','sheet'].includes(p.method)&&(!Number.isFinite(p.low)||!Number.isFinite(p.high)||p.low>=p.high)){message('Informe limites válidos: inferior menor que superior.');return}
 if(!(p.bandwidth>0&&Number.isFinite(p.bandwidth))||!(Number.isFinite(p.cutoff)&&p.cutoff>=0)||!(p.alpha>0&&p.alpha<1)||(!p.auto&&!(Number.isFinite(p.min)&&Number.isFinite(p.max)&&p.min>=0&&p.max>p.min))){message('Confira bandwidth, corte de idade, α e faixa do gráfico.');return}
 message('');const fullRows=processed(p),allKeys=[...new Set(fullRows.map(sampleKey))].sort(compareSamples),fullKde=fullRows.filter(r=>r.kde),kdeKey=syncKdeControls(allKeys,p),concordiaKey=syncConcordiaControls(allKeys,p);
 const individual=(tab==='kde'&&p.kdeView==='individual')||(tab==='concordia'&&p.concordiaView==='individual'),individualKey=tab==='concordia'?concordiaKey:kdeKey;
 const kdeStacked=tab==='kde'&&p.kdeView==='stacked'&&allKeys.length>0,concordiaStacked=tab==='concordia'&&p.concordiaView==='stacked'&&allKeys.length>0,stacked=kdeStacked||concordiaStacked;
 const rs=individual?fullRows.filter(r=>sampleKey(r)===individualKey):fullRows,kd=rs.filter(r=>r.kde),keys=individual?allKeys.filter(k=>k===individualKey):allKeys,range=rangeFor(fullKde,p);p.range=range;lastRows=rs;lastKde=kd;lastParams=p;
 $('dataNotice').textContent=!['sheet','imported','none'].includes(p.method)&&rs.some(r=>r.stage!=='raw'&&!r.excluded&&!r.nonZircon)?'O filtro calculado precisa de razões anteriores à correção de Pb comum. Confirme a etapa no painel à esquerda; ou use a classificação/dc já calculados na planilha.':p.method==='sheet'?'Classificação preservada da planilha. Os limites de discordância não são recalculados neste modo.':'';
 $('kdeMin').disabled=$('kdeMax').disabled=p.auto;if(p.auto){$('kdeMin').value=range[0];$('kdeMax').value=range[1]}
 $('ageCut').disabled=$('cutRef').disabled=p.ageMode!=='hybrid';
 $('ageHelp').textContent=p.ageMode==='hybrid'?`Se t${p.cutRef==='68'?'206/238':'207/206'} ${p.cutRef==='68'?'>':'≥'} ${fmt(p.cutoff)} Ma: usar t207/206; caso contrário: t206/238. Valores ausentes não são substituídos pela outra idade.`:p.ageMode==='best'?'Idade preferida informada na planilha.':'Idades informadas ou derivadas das razões quando ausentes. Todas em Ma.';
 $('selectionTitle').textContent=keys.length===1?nameOf(keys[0]):`${keys.length} amostras em comparação`;
 const counts=Object.keys(categories).map(c=>[rs.filter(r=>r.status===c).length,c==='C'&&p.method==='none'?'Retidas sem filtro':categories[c][0],c==='C'?'green':c==='D'?'red':'']);
 $('stats').innerHTML=[[rs.length,'Selecionadas',''],...counts,[kd.length,'Usadas no KDE','green']].map(([n,l,c])=>`<div class="stat"><b class="${c}">${fmt(n)}</b><span>${l}</span></div>`).join('');
 $('concordiaControls').hidden=tab!=='concordia';
 $('populationControls').hidden=tab!=='pop';$('chart').style.height='';
 $('chart').hidden=stacked;$('kdePanels').hidden=!kdeStacked;$('concordiaPanels').hidden=!concordiaStacked;$('chartExports').hidden=stacked;
 if(!kdeStacked)clearKdePanels();if(!concordiaStacked)clearConcordiaPanels();
 let displayedIntervals=intervals;
 let base={paper_bgcolor:'#fff',plot_bgcolor:'#fff',font:{family:'Arial',size:11,color:'#52655c'},margin:{l:65,r:20,t:25,b:85},legend:{orientation:'h',y:-.24,x:0,font:{size:10}},hovermode:'closest',xaxis:{gridcolor:'#eef1eb',zeroline:false},yaxis:{gridcolor:'#eef1eb',zeroline:false},showlegend:true},traces=[],note='',effectiveStep=NaN;
 const distributions=new Map(allKeys.map(key=>[key,S.kde(fullKde.filter(r=>sampleKey(r)===key).map(r=>r.age),p.bandwidth,...range)]));
 if(tab==='kde'){
  $('chartTitle').textContent=stacked?'KDE por amostra · gráficos separados':individual?'KDE individual'+(keys.length?' · '+nameOf(keys[0]):''):'Distribuição de idades · KDE';
  for(const key of keys){const ages=kd.filter(r=>sampleKey(r)===key);if(!ages.length)continue;const d=distributions.get(key);effectiveStep=d.step;traces.push({x:d.x,y:d.y,name:`${nameOf(key)} · n=${ages.length}`,type:'scatter',mode:'lines',line:{color:color(key),width:2},hovertemplate:'%{x:.1f} Ma<br>Densidade: %{y:.5f}<extra>%{fullData.name}</extra>'})}
  $('chartSubtitle').textContent=`Gaussiano · bandwidth (h) = ${fmt(p.bandwidth,3)} Ma · passo = ${fmt(effectiveStep,4)} Ma · normalizado por amostra`;
  let ymax=0;for(const d of distributions.values())for(const y of d.y)ymax=Math.max(ymax,y);
  base.xaxis={...base.xaxis,title:{text:'Idade (Ma)'},range};base.yaxis={...base.yaxis,title:{text:'Densidade (Ma⁻¹)'},range:[0,ymax?ymax*1.08:1],tickformat:'.4f'};
  if($('bands').checked)base.shapes=intervals.map(([,a,b],i)=>({type:'rect',xref:'x',yref:'paper',x0:a,x1:b,y0:0,y1:1,fillcolor:palette[i%palette.length],opacity:.075,line:{width:0},layer:'below'}));
  note=`${rs.filter(r=>!r.valid).length} sem idade/erro elegível. ${rs.filter(r=>r.valid&&!r.kde).length} com idade válida fora da seleção. ${kd.filter(r=>r.age<range[0]||r.age>range[1]).length} idades usadas fora da janela visual. Escalas iniciais de idade e densidade comuns às amostras selecionadas. Arraste para ampliar; duplo clique restaura. ${stacked?'O zoom é independente em cada gráfico.':'Clique na legenda para ocultar curvas.'}`;
 }else if(tab==='concordia'){
  $('chartTitle').textContent=concordiaStacked?'Concórdia Wetherill por amostra · gráficos separados':individual?'Concórdia Wetherill individual'+(keys.length?' · '+nameOf(keys[0]):''):'Concórdia Wetherill';
  const plot=concordiaPlot(rs,base,p);traces=plot.traces;base=plot.layout;
  $('chartSubtitle').textContent=filterLabel(p)+` · razões originais · ${plot.shown.length} pontos visíveis · ${plot.ellipseCount} elipses (95%)`;
  note=`${plot.valid.length} com razões válidas; ${rs.length-plot.valid.length} sem razões representáveis. ${plot.shown.length} pontos visíveis; ${plot.ellipseCount} elipses. Sem erros/Rho válidos, apenas o ponto é mostrado. ${$('autoConcordia').checked?(concordiaStacked?'Cada gráfico acompanha os pontos e as incertezas da respectiva amostra; as escalas podem diferir.':'A faixa acompanha os pontos e suas incertezas.'):'Visão geral usa a faixa definida nos parâmetros do KDE.'} Cores representam o critério selecionado, não a identificação mineralógica. O filtro de seleção do KDE não oculta pontos aqui.${concordiaStacked?' O zoom é independente em cada gráfico.':''}`;
 }else{
  const adaptive=$('autoPop').checked,view=S.populationBins(kd.map(r=>r.age));
  const digits=adaptive&&Number.isFinite(view.step)?Math.max(0,1-Math.floor(Math.log10(view.step))):2;
  if(adaptive)displayedIntervals=view.bounds.map(([lo,hi])=>[`${fmt(lo,digits)}–${fmt(hi,digits)} Ma`,lo,hi]);
  $('chartTitle').textContent='Populações geocronológicas';
  $('chartSubtitle').textContent=(adaptive?(displayedIntervals.length?`Intervalos de ${fmt(view.step,digits)} Ma · faixa ${fmt(displayedIntervals[0][1],digits)}–${fmt(displayedIntervals.at(-1)[2],digits)} Ma`:'Sem idades elegíveis para definir intervalos'):'Faixas personalizadas')+` · percentual por amostra · bandwidth do KDE: ${fmt(p.bandwidth,3)} Ma`;
  const counts=keys.map(key=>{const a=kd.filter(r=>sampleKey(r)===key);return displayedIntervals.map(([,lo,hi])=>[a.filter(r=>r.age>=lo&&r.age<hi).length,a.length])});
  const z=counts.map(row=>row.map(([n,total])=>total?100*n/total:null));
  const labels=displayedIntervals.map(([n,a,b])=>adaptive?`[${fmt(a,digits)}; ${fmt(b,digits)})`:`${esc(n)}<br>[${fmt(a,2)}; ${fmt(b,2)})`);
  if(displayedIntervals.length)traces=[{type:'heatmap',x:labels,y:keys.map(k=>esc(nameOf(k))),z,customdata:counts,colorscale:[[0,'#f4f5ed'],[.35,'#b8d2bb'],[1,'#245c4b']],zmin:0,zmax:100,colorbar:{title:{text:'%'}},hoverongaps:false,hovertemplate:'%{y}<br>%{x} Ma<br>%{customdata[0]} / %{customdata[1]} análises · %{z:.1f}%<extra></extra>'}];
  base.margin={l:110,r:45,t:20,b:135};base.xaxis={...base.xaxis,type:'category',categoryorder:'array',categoryarray:labels,title:{text:'Intervalo de idade (Ma)'},tickangle:-45,tickfont:{size:12},automargin:true};base.yaxis={...base.yaxis,type:'category',categoryorder:'array',categoryarray:keys.map(k=>esc(nameOf(k))),autorange:'reversed',tickfont:{size:12},automargin:true};
  if(innerWidth<700&&traces.length){traces[0].x=keys.map(k=>esc(nameOf(k)));traces[0].y=labels;traces[0].z=displayedIntervals.map((v,i)=>keys.map((n,j)=>z[j][i]));traces[0].customdata=displayedIntervals.map((v,i)=>keys.map((n,j)=>counts[j][i]));traces[0].colorbar={thickness:8,len:.85,title:{text:'%'}};base.margin={l:110,r:10,t:10,b:85};base.xaxis.title={text:'Amostra'};base.xaxis.categoryarray=traces[0].x;base.yaxis.title={text:'Intervalo de idade (Ma)'};base.yaxis.categoryarray=labels;traces[0].hovertemplate='%{x}<br>%{y} Ma<br>%{customdata[0]} / %{customdata[1]} análises · %{z:.1f}%<extra></extra>'}
  $('chart').style.height=Math.max(innerWidth<700?365:440,(innerWidth<700?displayedIntervals.length:keys.length)*28+155)+'px';
  note=(adaptive?'Intervalos calculados pelas idades elegíveis da seleção e compartilhados por todas as amostras. A seleção de amostras, idades ou filtros atualiza a escala. A janela visual do KDE não exclui idades desta contagem. ':'Faixas definidas pelo usuário. Faixas sobrepostas contam uma análise mais de uma vez; faixas incompletas podem somar menos de 100%. ')+'Denominador: n usado no KDE de cada amostra. Limite inferior inclusivo e superior exclusivo. Este mapa mostra contagens sem suavização; o bandwidth se aplica apenas ao KDE.';
  if(keys.some(k=>Number.isFinite(JSON.parse(k)[2])))note+=` Amostras da mais rasa para a mais profunda, ${innerWidth<700?'da esquerda para a direita':'de cima para baixo'}. Sem profundidade: ao final.`;
 }
 if(!rs.length||!traces.length)base.annotations=[{xref:'paper',yref:'paper',x:.5,y:.5,text:!rs.length?'Selecione ao menos uma amostra.':'Nenhuma análise atende aos filtros.',showarrow:false}];
 $('chartNote').textContent=note;
 if(tab==='kde'&&$('bands').checked){const legend=document.createElement('div');legend.className='band-legend';legend.innerHTML=intervals.map(([n,a,b],i)=>`<span><i style="background:${palette[i%palette.length]}"></i>${esc(n)} · [${a}, ${b}) Ma</span>`).join('');$('chartNote').appendChild(legend)}
 $('activeParams').textContent=`Atual: ${filterLabel(p)}. KDE h = ${p.bandwidth} Ma; janela ${fmt(range[0])}–${fmt(range[1])} Ma. Idade ${p.ageMode==='hybrid'?`híbrida, corte ${p.cutoff} Ma, referência t${p.cutRef}`:$('ageMode').selectedOptions[0].text}.`;
 if(kdeStacked)await drawKdePanels(keys,kd,distributions,base,p);else if(concordiaStacked)await drawConcordiaPanels(keys,rs,base,p);else await Plotly.react('chart',traces,base,plotOptions);if(rid!==renderId)return;
 summary(rs,kd,keys,distributions,displayedIntervals);
}
function summary(rs,kd,keys,distributions,displayedIntervals){
 $('tableTitle').textContent=tab==='pop'?'Contagens por intervalo':((tab==='kde'&&$('kdeView').value==='individual')||(tab==='concordia'&&$('concordiaView').value==='individual'))?'Resumo da amostra exibida':'Resumo por amostra';
 if(tab==='pop'){$('table').innerHTML=displayedIntervals.length?'<table><thead><tr><th>Intervalo (Ma)</th>'+keys.map(k=>`<th>${esc(nameOf(k))}</th>`).join('')+'</tr></thead><tbody>'+displayedIntervals.map(([n,lo,hi])=>`<tr><td>${esc(n)}${$('autoPop').checked?'':` · [${lo}, ${hi})`}</td>`+keys.map(key=>{const a=kd.filter(r=>sampleKey(r)===key),k=a.filter(r=>r.age>=lo&&r.age<hi).length;return `<td>${k} / ${a.length} (${a.length?fmt(k/a.length*100,1):'—'}%)</td>`}).join('')+'</tr>').join('')+'</tbody></table>':'<p>Nenhuma análise atende aos filtros para definir os intervalos.</p>';return}
 $('table').innerHTML='<table><thead><tr><th>Amostra</th><th>Poço</th><th>Prof. (m)</th><th>Total</th><th>Concord./retidas</th><th>Discord.</th><th>Não aval.</th><th>Não zircão</th><th>Excluídas</th><th>KDE n</th><th>2 picos na janela (Ma)</th></tr></thead><tbody>'+keys.map(key=>{const a=rs.filter(r=>sampleKey(r)===key),k=kd.filter(r=>sampleKey(r)===key),peaks=k.length?S.peaks(distributions.get(key)).map(p=>fmt(p.x,1)).join(' · '):'—';return `<tr><td><span style="color:${color(key)}">●</span> ${esc(nameOf(key))}</td><td>${esc(a[0]?.well)}</td><td>${fmt(a[0]?.depth,2)}</td><td>${a.length}</td>`+Object.keys(categories).map(c=>`<td>${a.filter(r=>r.status===c).length}</td>`).join('')+`<td>${k.length}</td><td>${peaks||'—'}</td></tr>`}).join('')+'</tbody></table>';
}
function guess(data,hi){return I.guess(data,hi)}
function importOptions(){return{stage:$('dataStage').value,infer:$('inferIdentity').checked,excludeReferences:$('excludeReferences').checked,respectComments:$('respectComments').checked}}
function parsePending(derive=true){const out=[],skipped=[],seen=new Set(),report={metadata:0,blank:0,unreadable:0,references:0,commentExclusions:0,conflicts:0};let duplicates=0;for(const p of pending){const parsed=I.parseSheet(p,importOptions());if(parsed.skipped){skipped.push(p.name);continue}for(const[k,v]of Object.entries(parsed.report))report[k]+=v;for(const r of parsed.records){const key=sampleKey(r)+'|'+r.id;if(seen.has(key))duplicates++;seen.add(key);if(derive){G.deriveAges(r);if(!Number.isFinite(r.bestError)&&Number.isFinite(r.best)){if(Math.abs(r.best-r.t68)<.1)r.bestError=r.e68;else if(Math.abs(r.best-r.t76)<.1)r.bestError=r.e76}}out.push(r)}}return{out,skipped,duplicates,report}}
function previewImport(){const{out,report,skipped}=parsePending(false),groups=new Map();for(const r of out){const key=sampleKey(r),entry=groups.get(key)||{sample:r.sample,well:r.well,depth:r.depth,n:0,excluded:0,conflicts:0};entry.n++;entry.excluded+=r.excluded?1:0;entry.conflicts+=r.identityWarning?1:0;groups.set(key,entry)}const p=pending[+$('sheetChoice').value];const mapped=fields.filter(([k])=>p.map[k]>=0).length;
 $('importPreview').innerHTML=`<p><b>${out.length} análises reconhecidas · ${groups.size} grupos de amostra</b><br>${report.references} padrões; ${report.commentExclusions} marcações “não usar”; ${report.metadata} linhas de configuração ignoradas.${skipped.length?` ${skipped.length} abas sem colunas de análise.`:''}</p><p class="small">Aba atual: ${mapped} colunas associadas. Razões: ${esc($('ratioErrors').selectedOptions[0].text)}. Idades: ${p.ageErr}σ absoluto.</p>${report.conflicts?`<p class="import-warning">${report.conflicts} comentários divergem da identidade da amostra. O agrupamento usa a coluna de amostra, a aba identificável ou o identificador, nessa ordem; comentários não definem o poço.</p>`:''}${p.warnings.map(s=>`<p class="import-warning">${esc(s)}</p>`).join('')}<div class="table-scroll"><table><thead><tr><th>Amostra</th><th>Poço</th><th>Prof. (m)</th><th>Análises</th><th>Excluídas</th><th>Avisos</th></tr></thead><tbody>${[...groups.values()].sort((a,b)=>compareSamples(sampleKey(a),sampleKey(b))).map(g=>`<tr><td>${esc(g.sample)}</td><td>${esc(g.well)}</td><td>${fmt(g.depth,2)}</td><td>${g.n}</td><td>${g.excluded}</td><td>${g.conflicts||'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function mapUI(){const p=pending[+$('sheetChoice').value];$('headerRow').value=p.hi+1;$('ratioErrors').value=p.err;$('ageErrors').value=p.ageErr;const h=p.data[p.hi]||[];$('mapFields').innerHTML=fields.map(([k,l])=>`<label class="field">${l}<select data-field="${k}"><option value="-1">Não disponível</option>${h.map((v,i)=>`<option value="${i}" ${p.map[k]===i?'selected':''}>${i+1} · ${esc(v||'(sem título)')}</option>`).join('')}</select></label>`).join('');$('mapFields').querySelectorAll('select').forEach(el=>el.onchange=()=>{p.map[el.dataset.field]=+el.value;previewImport()});previewImport()}
$('file').onchange=async e=>{try{pending=[];message('Lendo arquivos…');for(const file of e.target.files){if(file.size>30*1024*1024)throw Error('Limite de 30 MB por arquivo.');const w=XLSX.read(await file.arrayBuffer(),{type:'array'});for(const name of w.SheetNames){const data=XLSX.utils.sheet_to_json(w.Sheets[name],{header:1,defval:null,raw:true});if(data.length)pending.push({name,file:file.name,data,...guess(data)})}}if(!pending.length)throw Error('Nenhuma aba encontrada.');$('dataStage').value='unknown';for(const id of ['inferIdentity','excludeReferences','respectComments','useSheetFilter'])$(id).checked=true;$('sheetChoice').innerHTML=pending.map((p,i)=>`<option value="${i}">${esc(p.file)} / ${esc(p.name)}</option>`).join('');$('importInfo').textContent=`${pending.length} abas encontradas. A prévia abaixo mostra como as análises serão agrupadas. A importação substitui os dados atuais.`;mapUI();$('mapping').showModal();message('')}catch(err){message('Não foi possível importar: '+err.message)}e.target.value=''};
$('sheetChoice').onchange=mapUI;
$('headerRow').onchange=()=>{const p=pending[+$('sheetChoice').value];Object.assign(p,guess(p.data,Math.max(0,+$('headerRow').value-1)));mapUI()};
$('ratioErrors').onchange=()=>{pending[+$('sheetChoice').value].err=$('ratioErrors').value;previewImport()};$('ageErrors').onchange=()=>{pending[+$('sheetChoice').value].ageErr=+$('ageErrors').value;previewImport()};
for(const id of ['inferIdentity','excludeReferences','respectComments'])$(id).onchange=previewImport;
$('cancelImport').onclick=()=>$('mapping').close();
$('applyImport').onclick=()=>{try{const{out,skipped,duplicates,report}=parsePending();if(!out.length){$('importInfo').textContent='Nenhuma análise importável. Confira cabeçalho e colunas de idade ou razões.';return}rows=out;synthetic=false;selected=new Set(rows.filter(r=>!r.isReference||!$('excludeReferences').checked).map(sampleKey));source=[...new Set(pending.map(p=>p.file))].join(' · ')+` · ${rows.length} análises`;if($('useSheetFilter').checked){if(rows.some(r=>['C','D'].includes(r.sheetStatus)))$('filterMethod').value='sheet';else if(rows.some(r=>Number.isFinite(r.dc)))$('filterMethod').value='imported';else if(['sheet','imported'].includes($('filterMethod').value))$('filterMethod').value='c'}
 const def=G.definitions[$('filterMethod').value];$('filterHelp').textContent=def.help;$('limitFields').hidden=['p','none','sheet'].includes($('filterMethod').value);$('filterRule').disabled=['p','none','sheet'].includes($('filterMethod').value);$('alpha').disabled=['none','sheet'].includes($('filterMethod').value);$('mapping').close();setup();message(`Importação concluída: ${report.metadata} linhas de configuração ignoradas; ${report.references} padrões reconhecidos; ${report.commentExclusions} marcações “não usar”.${report.conflicts?' '+report.conflicts+' comentários divergentes: agrupamento definido pela amostra/aba/identificador.':''}${skipped.length?' Abas sem dados: '+skipped.join(', ')+'.':''}${duplicates?' '+duplicates+' identificadores repetidos no mesmo grupo/amostra; confira antes de interpretar.':''}`)}catch(e){$('importInfo').textContent='Erro ao importar: '+e.message}};
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function csvCell(v){if(typeof v==='number'&&!Number.isFinite(v))v='';if(typeof v==='string'&&/^[\s]*[=+@\-]/.test(v))v="'"+v;return '"'+String(v??'').replace(/"/g,'""')+'"'}
$('csv').onclick=()=>{if(!lastParams)return;const p=lastParams,keys=['id','sample','well','depth','depthSource','rawSample','comments','identityWarning','isReference','sheetStatus','age','error','ageKey','dc','status','reason','value','valid','kde','stage','nonZircon','excluded','x','y','sx','sy','rho','origin','line','simulation','referenceMaterial','referenceT68','referenceT76'],metrics=['t','r','a','c','sk','p','tc'],head=[...keys,...metrics.map(k=>'calculado_'+k),'filtro','regra','limite_min','limite_max','alpha','bandwidth_Ma','janela_min_Ma','janela_max_Ma','modo_idade','corte_Ma','referencia_corte','exemplo_sintetico'];const txt=[head.map(csvCell).join(';'),...lastRows.map(r=>[...keys.map(k=>r[k]),...metrics.map(k=>r.metrics[k]),p.method,p.rule,p.low,p.high,p.alpha,p.bandwidth,...p.range,p.ageMode,p.cutoff,p.cutRef,synthetic].map(csvCell).join(';'))].join('\r\n');download(new Blob(['\ufeff'+txt],{type:'text/csv;charset=utf-8'}),'upb_analises.csv')};
$('template').onclick=()=>{const head=['id','sample','grupo','r75','sx_abs1','r68','sy_abs1','rho','nao_zircao','nao_usar','comments'];const data=S.demo().filter((r,i)=>i%S.demoConfig.perStandard<3).map(r=>[r.id,r.sample,r.well,r.x,r.sx,r.y,r.sy,r.rho,0,0,r.comments]);download(new Blob(['\ufeff'+[head,...data].map(row=>row.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'modelo_upb_sintetico.csv');message('Modelo sintético: 3 pontos por padrão; erros 1σ absolutos. Ao importar, declare a etapa antes de Pb comum e desmarque “Excluir padrões de referência reconhecidos”. Não são medidas nem valores para calibração.')};
async function exportChart(gd,format,metadata){let div;try{
 const p=lastParams,caption=filterLabel(p)+` · KDE bandwidth=${p.bandwidth} Ma · corte híbrido ${p.cutoff} Ma (t${p.cutRef})`;
 const subtitle=metadata?esc(metadata.caption)+'<br>'+esc(metadata.details):tab==='concordia'?esc($('chartSubtitle').textContent):tab==='pop'?esc($('chartSubtitle').textContent)+'<br>'+esc(filterLabel(p)):esc(caption);
 const title=metadata?.title||$('chartTitle').textContent,filename=(metadata?.filename||'upb_'+tab)+(synthetic?'_exemplo':'');
 const layout={...gd.layout,title:{text:(synthetic?'EXEMPLO SINTÉTICO · ':'')+esc(title)+'<br><sup>'+subtitle+'</sup>',font:{size:17}},margin:{...gd.layout.margin,t:100}};
 div=document.createElement('div');div.style='position:fixed;left:-99999px;width:1400px;height:900px';document.body.appendChild(div);
 await Plotly.newPlot(div,gd.data,layout);await Plotly.downloadImage(div,{format,filename,width:1400,height:900,scale:2});
 }catch(e){message('Erro na exportação: '+e.message)}finally{if(div){Plotly.purge(div);div.remove()}}
}
for(const format of ['svg','png'])$(format).onclick=()=>exportChart($('chart'),format);
$('well').onchange=()=>{depths();samples();render()};$('depth').onchange=()=>{samples();render()};$('activeStage').onchange=()=>{for(const r of rows)r.stage=$('activeStage').value;render()};$('all').onclick=()=>{const inputs=[...$('samples').querySelectorAll('input')],all=inputs.every(i=>i.checked);inputs.forEach(i=>all?selected.delete(i.value):selected.add(i.value));samples();render()};
$('filterMethod').innerHTML=Object.entries(G.definitions).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');$('filterMethod').onchange=syncFilter;
for(const id of ['ageMode','ageCut','cutRef','status','low','high','filterRule','alpha','bandwidth','autoKde','kdeMin','kdeMax','positiveError','bands','showC','showD','showU','showN','showE','ellipses','autoConcordia','autoPop','kdeView','kdeSample','concordiaView','concordiaSample'])$(id).onchange=render;
$('intervalInput').value=intervals.map(r=>r.join(';')).join('\n');$('applyIntervals').onclick=()=>{try{const next=$('intervalInput').value.trim().split(/\r?\n/).filter(Boolean).map(line=>{const a=line.split(';').map(s=>s.trim());if(a.length!==3||!a[0]||!Number.isFinite(S.num(a[1]))||!(S.num(a[2])>S.num(a[1])))throw Error('Use nome;mínimo;máximo em cada linha, com mínimo < máximo.');return[a[0],S.num(a[1]),S.num(a[2])]});if(!next.length)throw Error('Defina pelo menos uma faixa.');intervals=next;$('autoPop').checked=false;render()}catch(e){message(e.message)}};
$('reset').onclick=()=>{$('kdeView').value='overlay';$('kdeSample').value='';$('concordiaView').value='overlay';$('concordiaSample').value='';$('well').value='';$('depth').value='';depths();$('filterMethod').value='c';$('filterRule').value='limits';$('alpha').value=.05;$('bandwidth').value=20;$('ageCut').value=1200;$('cutRef').value='68';$('ageMode').value='hybrid';$('status').value='C';for(const id of ['positiveError','bands','autoKde','showC','showD','showU','showN','showE','ellipses','autoConcordia','autoPop'])$(id).checked=true;selected=new Set(rows.map(sampleKey));samples();syncFilter()};
$('demo').onclick=()=>{if(['sheet','imported'].includes($('filterMethod').value)){$('filterMethod').value='c';syncFilter()}rows=S.demo().map(G.deriveAges);synthetic=true;source='Exemplo sintético · Plešovice, GJ-1 e 91500 · '+rows.length+' análises';selected=new Set(rows.map(sampleKey));setup()};
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',x===b?'true':'false')});render()};
$('standardTable').innerHTML='<table><thead><tr><th>Padrão</th><th>t206/238 (Ma)</th><th>t207/206 (Ma)</th><th>Base dos valores</th></tr></thead><tbody>'+S.standards.map(s=>`<tr><td>${esc(s.name)}</td><td>${fmt(s.t68,2)}</td><td>${fmt(s.t76,2)}${s.model76?' *':''}</td><td>${s.sources.map(a=>`<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.label)}</a>`).join(' · ')}<br>${esc(s.note)}</td></tr>`).join('')+'</tbody></table>';
$('simulationParams').textContent=`${S.demoConfig.perStandard} análises simuladas por padrão (${S.demoConfig.perStandard*S.standards.length} no total). Dispersão normal bivariada nas razões; 1σ relativo = ${fmt(S.demoConfig.sigmaX*100,2)}% em 207Pb/235U e ${fmt(S.demoConfig.sigmaY*100,2)}% em 206Pb/238U; Rho = ${fmt(S.demoConfig.rho,2)}. Semente fixa ${S.demoConfig.seed}: o mesmo conjunto é gerado a cada abertura. Esses erros e a correlação são escolhas didáticas, não incertezas publicadas dos padrões. Não são acrescentados pontos discordantes nem análises não zircão artificialmente; a classificação resulta dos dados simulados e do filtro ativo.`;
$('filterHelp').textContent=G.definitions.c.help;setup();
let resizeTimer;const chartObserver=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!$('chart').hidden&&$('chart').data)Plotly.Plots.resize('chart');for(const [id,panels]of [['kdePanels',kdePanels],['concordiaPanels',concordiaPanels]])if(!$(id).hidden)for(const panel of panels.values())if(panel.plot.data)Plotly.Plots.resize(panel.plot)},120)});chartObserver.observe($('chart'));chartObserver.observe($('kdePanels'));chartObserver.observe($('concordiaPanels'));
let mobileLayout=innerWidth<700;window.addEventListener('resize',()=>{if(mobileLayout!==(innerWidth<700)){mobileLayout=innerWidth<700;render()}});
