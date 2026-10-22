'use strict';
// Evidence labels describe support and limits; they are not confidence probabilities.
const QA_LEVELS={actual:{label:'实际数据支持',css:'qa-actual'},assumption:{label:'依赖假设',css:'qa-assumption'},unknown:{label:'暂不能判断',css:'qa-unknown'}};
const QA_METHODS={ilo:'https://webapps.ilo.org/static/english/reports/flagship/world_social_protection_report_2024-26/Annex.html',prost:'https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099061024110523426'};
function qaNumber(v,unit='',digits=1){return rxFinite(v)?rxNum(v,digits)+unit:'未知';}
function qaBadge(level){const v=QA_LEVELS[level];return `<span class="qa-badge ${v.css}">${v.label}</span>`;}
function dnClaimKind(c){if(c.level==='unknown')return 'unknown';if(c.level==='assumption')return 'future';if(c.id==='coverage-actual')return 'derived';if(c.id==='history-validation')return 'backtest';return 'actual';}
function qaSources(urls){return [...new Set((urls||[]).filter(Boolean))].map((u,i)=>rxLink(u,'依据'+(i+1))).join('；')||'尚无足够证据';}
function qaHistorySources(r){return [...new Set([r.flowSource,r.countSource,r.recipientSource].filter(Boolean).map(k=>PENSION_HISTORY.sources[k]?.url).filter(Boolean))];}
function qaEffectiveConfig(prov,key){return S.route==='compare'&&uxPension()?pensionConfig():pensionConfig(prov,key);}
function qaContexts(){
 if(S.route==='population'&&S.view==='actual')return [{prov:S.province,id:S.province==='GD'?'PRD':province().modelId,name:province().name+'·'+province().scope+'合计'}];
 if(S.route==='compare'&&uxPension()&&S.province==='GX')return [{prov:'GX',id:'Guangxi',name:'广西全区'}];
 if(S.route==='compare')return uxPension()?['GD','HN'].map(prov=>({prov,id:REGISTRY.provinces[prov].modelId,name:PENSION.provinces[prov].name+'全省'})):uxPair().map(v=>({id:v.id,prov:v.id==='Guangdong'?'GD':v.id==='Hunan'?'HN':v.id==='Guangxi'?'GX':city(v.id).province,name:v.name}));
 if(S.route==='map'){const pair=Object.entries(REGISTRY.provinces).find(([k,p])=>p.code===S.mapCode);return pair?[{prov:pair[0],id:pair[1].modelId,name:pair[1].name+'全省'}]:[];}
 return [{prov:S.province,id:uxPension()?province().modelId:S.city,name:uxPension()?province().name+'全省':regionName()}];
}
function qaLatestPopulation(c){if(c.prov==='GX')return gxLatestPopulation(c);
 if(S.route==='population'&&S.view==='actual')c={...c,id:S.province==='GD'?'PRD':'ALL',name:province().name+'·'+province().scope+'合计'};
 const id=c.id==='ALL'?REGISTRY.provinces[c.prov].modelId:c.id,a=rxActual(id),o=RESEARCH_ACTUAL.records[id],gxCity=REGISTRY.cities.find(x=>x.id===id&&x.province==='GX'),value=o?.population??a?.b??gxCity?.actual2024??null;
 return {...c,id,name:id==='Hunan'?'湖南全省':id==='Guangdong'?'广东全省':id==='Guangxi'?'广西全区':c.name,year:o?.year??(gxCity?2024:2025),population:value,weak:!!a?.weak,ageBands:o?.ageBands??(c.prov==='GX'?gxCity?.actual2024Age??(c.id==='Guangxi'?{'0—14岁':9910000,'15岁（差额推算）':820000,'16—59岁':28970000,'60—64岁':3170000,'65岁及以上':7020000}:null):null),sources:[...new Set([o?.source,a?.source2025,...(a?.sources2025||[])].filter(Boolean))],published:o?.published||'',ageBands:o?.ageBands||null};
}
function qaLatestPanel(){
 const cs=qaContexts().map(qaLatestPopulation);if(!cs.length)return '';
 return `<section id="qaLatestPopulation" class="qa-latest"><div class="section-head"><h2>先看实际人口，再看情景</h2><span class="badge">最新已接入统计 · 年份固定</span></div><div class="qa-latest-grid">${cs.map(c=>`<article data-population-scope="${esc(c.id)}"><small>${esc(c.name)} · ${c.year}年末常住人口</small><strong>${c.population===null?'未取得':n(c.population/1e4)}<em>${c.population===null?'':'万人'}</em></strong><p>${qaBadge(c.population===null||c.weak?'unknown':'actual')} ${c.weak?'来源仍待原站复核，不标为已确认实际。':'官方公布值或同年城市公布数合计；不随生育、迁移或目标年份改变。'}${c.published?' 发布：'+esc(c.published)+'。':''}</p>${c.ageBands?`<div class="qa-latest-ages">${Object.entries(c.ageBands).map(([k,v])=>`<span>${k}<b>${n(v/1e4)}万人</b></span>`).join('')}</div><p>以上为${c.year}年末官方大年龄段；广东、湖南和广西公报年龄边界不同，15岁差额值单独标注，65+包含于60+。下方九段为重建，不是这些原数。</p>`:''}<p>${qaSources(c.sources)}</p>${c.id==='Hunan'?'<p>14市州公布数合计6492.08万人，全省公布6492万人；保留公布精度，不把合计尾差当新增人口。</p>':''}</article>`).join('')}</div><p class="qa-important"><b>2025实际 ≠ 2026估算。</b> ${hnBoundary()}切换参数只改变情景，不改变上方实际统计。</p></section>`;
}
function qaLatestRows(){
 const rows=[];for(const c of qaContexts().map(qaLatestPopulation)){
  const note=(c.population===null||c.weak?'暂不能判断':'实际数据支持')+'；'+c.year+'年末常住人口；不随情景变化；不是2026统计或旧模型校准完成；'+(c.published?'发布'+c.published:'');
  rows.push(['最新实际人口',c.prov,c.name,c.year,'常住人口',c.population===null?'未知':c.population,'人',note,c.sources.join(' ; ')]);
  for(const [label,v] of Object.entries(c.ageBands||{}))rows.push(['最新实际年龄结构',c.prov,c.name,c.year,label,v,'人',note+'；65+包含于60+，不可相加；仅大年龄段',c.sources.join(' ; ')]);
 }return rows;
}
function qaScenarioCoincidence(id){if(gxFull(id))return `<p class="qa-scenario-note">广西新版：${GX_FERTILITY[S.f].label}；${GX_MOVEMENT[S.m].label}。2025实际不变；2026起均为条件模拟，非官方预测。</p>`;if(gdFull(id))return `<p class="qa-scenario-note">广东新版：${esc(GD_FERTILITY[S.f].label)}；${esc(GD_MOVEMENT[S.m].label)}。全省2025实际不变；九市旧研究非同一范围和方法。</p>`;if(hnFull(id))return `<p class="qa-scenario-note">湖南新版：${esc(HN_FERTILITY[S.f].label)}；${esc(HN_MOVEMENT[S.m].label)}。2025实际数不变，2026起逐年推进；当前未来值不是实际统计。</p>`;
 const total=sum(ages(id,S.year)),same=Object.keys(FERTILITY).filter(f=>f!==S.f&&sum(ages(id,S.year,f,S.m))===total);
 return `<p class="qa-scenario-note">当前生育：${esc(FERTILITY[S.f])}；迁移：${esc(MIGRATION[S.m])}。${same.length?`本年总量与${same.map(f=>FERTILITY[f]).join('、')}相同，原研究文件在该年如此，不人为制造差异。`:'本年总量按当前研究序列读取。'} 生育假设作用于未来出生，不能据此修改已公布的实际人口。</p>`;
}
function qaClaims(){
 const out=[],money=uxPension(),actualView=S.route==='population'&&S.view==='actual',year=actualView?2020:S.year;
 const put=(c,id,title,level,value,reason,sources=[],claimYear=year)=>out.push({prov:c.prov,scope:c.name,id,title,level,value,reason,sources,year:claimYear});
 for(const c of qaContexts()){
  if(c.prov==='GX'&&money){out.push(...gxEvidenceClaims(c));continue;}
  if(!money){
   const a=rxActual(freshFull(c.id,c.prov)?REGISTRY.provinces[c.prov].modelId:c.id),d=stats(c.id,S.year),cal=rxCalibration(freshFull(c.id,c.prov)?REGISTRY.provinces[c.prov].modelId:c.id),src=a?.source2020;
   put(c,'population-actual','2020普查总人口',Number.isFinite(a?.a)?'actual':'unknown',rxNum(a?.a===undefined?null:a.a/1e4)+'万人','仅支持普查时点、已公布范围与精度；不能证明未来年龄结构。',[src],2020);
   if(actualView){put(c,'detailed-age-actual','九个细年龄段的普查原数','unknown','本视图未接入完整九段原数','当前展示已公布的大年龄比例，不能把未来九年龄段情景当2020普查事实。',[src],2020);continue;}
   put(c,'population-validation',(freshFull(c.id,c.prov)?'2025人口基线约束（非验证）':'2025人口总量核验'),cal?.b===null||cal?.weak?'unknown':'actual',cal?.b===null?'未取得':rxNum(cal?.b/1e4)+'万人',cal?.weak?'包含转载待原站核实，不标为已核实实际。':(freshFull(c.id,c.prov)?'全省新版使用2025官方边际校准；此处只是实际输入，不能作为独立验证。':'只核查2025总量；旧2020锚定没有使用2025，原研究非严格样本外。'),[cal?.source2025,...(cal?.sources2025||[])],2025);
   put(c,'population-future',S.year+'人口与年龄结构','assumption',rxNum(d.total/1e4)+'万人；60+ '+rxNum(d.senior/d.total*100)+'%',(freshFull(c.id,c.prov)?'2025实际边际约束的细年龄重建＋逐年队列；生育与残差设定，不是官方预测。':'旧2010基期研究对照，未完成最新校准。')+'生育'+S.f+'／迁移'+S.m,[freshFull(c.id,c.prov)?(c.prov==='GX'?REGISTRY.sources.gx2025.url:c.prov==='GD'?GD_DATA.sources.actual2025:HN_DATA.sources.actual2025):REGISTRY.sources.paper.url]);
   put(c,'population-cause','年龄增减的现实原因','unknown','未完成因果识别','可以计算情景内各年龄段增减；不能据此量化现实迁移、生育、死亡各自造成多少变化。',[REGISTRY.sources.paper.url]);
  }else{
   const key=pensionKey(),r=pbRow(c.prov,key,pbYear),v=pbNumbers(r),b=pensionBase(c.prov,key),d=pensionModel(c.prov,key,S.year,qaEffectiveConfig(c.prov,key)),src=qaHistorySources(r),h=reviewedHistory(c.prov,key);
   const observed=qaObserved(c.prov,key,pbYear);put(c,'employment-actual',pbYear+'就业对照（本轮序列）',observed.employment===null?'unknown':'actual',qaNumber(observed.employment,'万人'),c.prov==='HN'?'2025年鉴表4-1；自2020按劳动力抽样调查统一测算，跨口径不作直接因果解释。':'广东此对应序列本轮未接入，不以湖南替代。',c.prov==='HN'?[POPULATION_REGISTRATION.landing,POPULATION_REGISTRATION.employmentImage]:[],pbYear);
   put(c,'payers-actual',pbYear+'缴费人数',rxFinite(r.payers)?'actual':'unknown',qaNumber(r.payers,'万人'),pbCountLabel(c.prov,key)+'；年末人数非全年缴费人年；不是按年龄划定的年轻人数。'+(r.note||''),src,pbYear);
   put(c,'recipients-actual',pbYear+'领取／离退休人数',rxFinite(r.recipients)?'actual':'unknown',qaNumber(r.recipients,'万人'),'依原制度登记范围；居民领待不等同职工退休。'+(r.note||''),src,pbYear);
   put(c,'coverage-actual',pbYear+'缴费对待遇的金额覆盖',v.coverage===null?'unknown':'actual',v.coverage===null?'缺数，不能计算':rxNum(v.coverage)+'%','由同年所接入金额计算；不含全部基金收支，不能当最终盈亏。居民个人账户和财政责任不能据此互相调剂。',src,pbYear);
   put(c,'history-validation','历史验证能支持什么',h.holdout?'actual':'unknown',h.shortText,'有数据支持的是当前历史版本与规则下的误差描述，不是未来准确率；补缴、政策与版本未完全净化。',phRecords(c.prov,key).flatMap(qaHistorySources),2025);
   for(const [field,label] of [['payers','缴费人数路径'],['recipients','领取人数路径']])put(c,field+'-future',S.year+label,d[field]===null?'unknown':'assumption',qaNumber(d[field],'万人'),`${pensionBasisNote(c.prov)}，再乘年龄及覆盖假设；${S.route==='compare'?'与主图共用当前选中经济参数':'采用本省当前保存参数'}；缺的登记基数不反推。`,b.sources.map(k=>PENSION.sources[k].url));
   put(c,'fund-future',S.year+'缴费能否支撑支出','assumption','待遇覆盖'+rxNum(d.benefitCoverage)+'%；基金支出覆盖'+rxNum(d.coverage)+'%',`依赖人口、覆盖和人均金额假设；${pensionBasisNote(c.prov)}。${S.route==='compare'?'与主图共用当前选中经济参数。':'采用本省当前保存参数。'}两种覆盖分别计算，列示后待平衡${rxNum(d.afterListed)}亿元／年不是最终赤字。`,b.sources.map(k=>PENSION.sources[k].url));
   put(c,'fund-final','未来最终缺口与耗尽年份','unknown','未知','追加财政、企业部分统筹净额、可用结余及账户负债未完整；即使列示后待平衡为0，也不能断言最终缺口为0。',b.sources.map(k=>PENSION.sources[k].url));
   put(c,'future-best','未来哪种情景最可能','unknown','不指定','历史规则的较近设定不等于未来概率。主图自定义参数与三预设参照分开；范围不是置信区间。',[]);
  }
 }
 if(!out.length)out.push({prov:'未接入',scope:'当前地图地区',id:'not-covered',title:'本地区人口与养老金',level:'unknown',value:'尚未接入',reason:'地图灰色地区不能借用广东或湖南的数据判断，也不按0处理。',sources:[],year});
 return out;
}
function qaPanel(){
 if(!['map','population','care','compare','lab'].includes(S.route))return '';
 const cs=qaClaims(),open=false;
 return `<section class="qa-panel" id="qaEvidence" aria-label="结论的证据与边界"><div class="qa-heading"><div><small>先看证据，再读结论</small><h2>这些结论，能确定到哪一步？</h2></div><div class="qa-legend">${Object.keys(QA_LEVELS).map(k=>qaBadge(k)+' '+cs.filter(c=>c.level===k).length+'项').join('　')}</div></div><p class="qa-caption">这是证据性质分类，不是准确率或主观可信分。“实际数据支持”只适用于对应时点和范围；未来计算仍依赖假设。</p><details ${open?'open':''}><summary>展开逐项结论：查看对应年份、数值、依据与不能确定的原因</summary><div class="qa-groups">${Object.entries(QA_LEVELS).map(([k,v])=>`<article class="${v.css}"><h3>${qaBadge(k)}</h3>${cs.filter(c=>c.level===k).map(c=>`<details class="qa-claim" data-qa-claim="${c.prov}/${c.id}" data-qa-level="${k}"><summary><small>${esc(c.scope)} · ${c.year}</small><b>${dnTag(dnClaimKind(c))} ${esc(c.title)}</b><span>${esc(c.value)}</span></summary><p>${esc(c.reason)}</p><p>${qaSources(c.sources)}</p></details>`).join('')||'<p>当前对象没有归入这一类的结论。</p>'}</article>`).join('')}</div></details></section>`;
}
function qaConversion(prov,key,year,cfg=pensionConfig(prov,key),f=S.f,m=S.m){
 const b=pbRow(prov,key,2025),oldBase=pensionBase(prov,key),id=PENSION.provinces[prov].model,base=ages(id,b.year,f,m),target=ages(id,year,f,m),lo=key==='resident'?16:20,end=Number(cfg.payerEnd)+1,start=Number(cfg.recipientStart),t=Math.max(0,year-2025);
 const pa=base?sum(base,lo,end)/1e4:null,ra=base?sum(base,start)/1e4:null,py=target?sum(target,lo,end)/1e4:null,ry=target?sum(target,start)/1e4:null;
 const factor=(n,d)=>rxFinite(n)&&d>0?n/d:null,pc=factor(b.payers,pa),rc=factor(b.recipients,ra),payerMultiplier=(1+cfg.payerGrowth/100)**t,recipientMultiplier=(1+cfg.recipientGrowth/100)**t;
 const payers=pc===null||py===null?null:pc*py*payerMultiplier,recipients=rc===null||ry===null?null:rc*ry*recipientMultiplier,original=YEARS.includes(year)?pensionModel(prov,key,year,cfg,f,m):null;
 const shiftedPayers=b.payers===null||original===null?null:b.payers*original.C,shiftedRecipients=b.recipients===null||original===null?null:b.recipients*original.R;
 return {prov,key,year,baseYear:b.year,originalBaseYear:oldBase.year,lo,end:end-1,start,basePayers:b.payers,baseRecipients:b.recipients,basePayerAge:pa,baseRecipientAge:ra,payerAge:py,recipientAge:ry,payerCoefficient:pc,recipientCoefficient:rc,payerMultiplier,recipientMultiplier,payers,recipients,ratio:payers!==null&&recipients>0?payers/recipients:null,originalPayers:original?.payers??null,originalRecipients:original?.recipients??null,shiftedPayers,shiftedRecipients,payerDifference:payers===null||shiftedPayers===null?null:payers-shiftedPayers,recipientDifference:recipients===null||shiftedRecipients===null?null:recipients-shiftedRecipients};
}
function qaObserved(prov,key,year){
 const row=prov==='HN'?POPULATION_REGISTRATION.rows.find(r=>r.year===year):null;
 return {prov,key,year,employment:row?.employment??null,participation:row?.[key]??null,retirees:row?.retirees??null};
}
function qaObservedPage(){
 const key=pensionKey(),o=qaObserved(S.province,key,pbYear),hn=S.province==='HN',data=POPULATION_REGISTRATION;
 return `<section id="qaObserved"><div class="section-head"><h3>新增实际对照：就业、参保与实缴分开看</h3><span class="badge">${hn?'湖南2016—2024 · 年鉴公布版本':'广东对应就业/参保序列未接入'}</span></div><div class="rx-facts"><div>${qaBadge(o.employment===null?'unknown':'actual')}<span>${pbYear}全省年末从业人数</span><b>${qaNumber(o.employment,'万人')}</b></div><div>${qaBadge(o.participation===null?'unknown':'actual')}<span>${pbYear}年鉴对应参保栏${key==='employee'?'（同表两栏相加）':''}</span><b>${qaNumber(o.participation,'万人')}</b></div></div><p>${hn?'已接入9年就业与参保对照原数；2025资料不在这版年鉴范围内，不以2024数沿用。':'本轮只补湖南此序列；广东对应就业/参保对照尚未接入，不代表广东没有发布。原有实缴与领取数据保留。'} 就业、参保和实缴是不同指标，不能相互替代，也不由它们反推缺失的退休人数。${key==='resident'?'居民参保栏包含领取待遇人员等，不能当作在职或实际缴费分母。':'企业、机关取年鉴对应参保栏原数；合计为同表相加，不是另一个独立样本。'} <b>同年登记范围与就业调查范围未完成完全匹配，真实就业→参保→实缴转化率仍不能确定。</b></p>${hn?`<details><summary>展开九年原数、版本差异及原表</summary><div class="rx-table"><table><thead><tr><th>年份</th><th>年末从业人数</th><th>年鉴对应参保栏</th><th>原台账实缴</th><th>原台账领取／离退休</th><th>来源 · 单位万人</th></tr></thead><tbody>${data.rows.map(z=>{const r=pbRow('HN',key,z.year);return `<tr><th>${z.year}</th><td>${qaNumber(z.employment)}</td><td>${qaNumber(z[key])}</td><td>${qaNumber(r.payers)}</td><td>${qaNumber(r.recipients)}</td><td>${rxLink(data.landing,'2025年鉴')}；${pbSources(r)}</td></tr>`;}).join('')}</tbody></table></div><p><b>2020就业口径变化：</b>年鉴表4-1注明，自2020年起全省从业人数由国家统计局根据劳动力抽样调查统一测算；跨2019/2020的变化不能直接归因于失业、疫情、迁移或缴费减少。表4-9早期养老总参保范围有变化，不把纳入居民造成的总量变化当真实扩面。</p><p><b>离退休人数版本对照：</b>2016初步公报385.8／年鉴388.00；2017为422.8／417.86；2018为454.5／454.42万人。本轮按年鉴版本补原缺年，差异成因未核，不强行调平，不分配到企业或机关。2022旧台账保留公报540.6，年鉴540.57另作对照。后期年鉴不是当年可获取的实时版本，年末人数也非全年平均领取人数或新退休流入。</p><p>${rxLink(data.localEmployment,'查看表4-1原图')}；${rxLink(data.localInsurance,'查看表4-9原图')}；${rxLink(data.landing,'统计局发布入口')}</p></details>`:''}</section>`;
}
function qaObservedRows(){
 if(!uxPension())return [];
 const data=POPULATION_REGISTRATION,rows=[],key=pensionKey();
 for(const c of qaContexts().filter(c=>c.prov==='HN'))for(const z of data.rows){
  const r=pbRow('HN',key,z.year);
  for(const [field,value,source]of [['年末从业人数',z.employment,data.employmentImage],['年鉴对应参保栏',z[key],data.insuranceImage],['原台账实缴人数',r.payers,qaHistorySources(r).join(' ; ')],['原台账领取或离退休',r.recipients,qaHistorySources(r).join(' ; ')]])rows.push(['就业参保实际对照','HN',PH_NAMES[key],z.year,field,value===null?'未知':value,'万人',(value===null?'暂不能判断':'实际数据支持')+'；就业/参保非实缴；2020就业调查口径变化；参保两栏合计非独立样本；不计算真实转化率；不替换资金路径；'+(r.note||''),data.landing+' ; '+source]);
 }
 if(qaContexts().some(c=>c.prov==='HN'))for(const d of data.differences)rows.push(['原数版本对照','HN','职工合计参保离退休',d.year,'年鉴与初步公报',JSON.stringify(d),'原数与说明','版本差异原因未核；不强行调平；2022原台账不覆盖',data.landing]);
 return rows;
}
function qaPeoplePage(){return S.province==='GD'?gdPeoplePage():hnPeoplePage();}

function qaRows(){
 const rows=qaClaims().map(c=>['结论证据分层',c.prov,c.scope,c.year,c.title,c.value,'文字',QA_LEVELS[c.level].label+'；'+c.reason,c.sources.join(' ; ')]);
 if(uxPension())for(const c of qaContexts().filter(c=>c.prov!=='GX')){
  const key=pensionKey(),b=pbRow(c.prov,key,2025),oldBase=pensionBase(c.prov,key),src=qaHistorySources(b).concat(oldBase.sources.map(k=>PENSION.sources[k].url),pensionPopulationSource(c.prov)).join(' ; ');
  for(const y of YEARS){const d=qaConversion(c.prov,key,y,qaEffectiveConfig(c.prov,key));for(const [field,unit]of [['basePayers','万人'],['baseRecipients','万人'],['basePayerAge','万人'],['baseRecipientAge','万人'],['payerAge','万人'],['recipientAge','万人'],['payerCoefficient','倍'],['recipientCoefficient','倍'],['payerMultiplier','倍'],['recipientMultiplier','倍'],['originalPayers','万人'],['originalRecipients','万人'],['shiftedPayers','万人'],['shiftedRecipients','万人'],['payers','万人'],['recipients','万人'],['payerDifference','万人'],['recipientDifference','万人'],['ratio','人／人']]){
   const actual=field==='basePayers'||field==='baseRecipients',val=d[field],level=val===null?'unknown':actual?'actual':'assumption';
   rows.push(['人数转换对照',c.prov,PH_NAMES[key],actual?b.year:y,field,val===null?'未知':val,unit,QA_LEVELS[level].label+`；登记基年${b.year}；资金原路径人数基年${oldBase.year}；差值为2025同年对齐减2025登记套用资金基期指数对照；生育${S.f}/迁移${S.m}；${S.route==='compare'?'与主图共用当前选中经济参数':'采用本省当前保存参数'}；混合口径系数非参保率；本2025登记对齐对照的覆盖从2025累积；资金主图广东2025/湖南2025同年起算，二者分别标明；${b.note||'缺数不补'}`,src]);
  }}
 }
 return [...rows,...qaObservedRows(),...qaLatestRows(),...hnExportRows(),...gdExportRows(),...auditReviewRows()];
}
function qaAttachExport(rows){
 if(!rows?.length||!['map','population','care','compare','lab'].includes(S.route)||S.route==='population'&&S.view==='actual')return rows;
 const cols=['证据模块','证据省份','证据范围','证据年份','结论项目','结论或对照值','证据单位','可信性质与边界','证据来源'],n=rows[0].length,pad=r=>Array.from({length:n},(_,i)=>r[i]??'');
 const extra=qaRows().map(r=>{const a=Array(n).fill('');if(S.route==='population'&&S.view==='actual'&&r[3]===2020)a[3]=2020;return [...a,...r];});
 return [[...rows[0],...cols],...rows.slice(1).map(r=>[...pad(r),...Array(cols.length).fill('')]),...extra];
}
