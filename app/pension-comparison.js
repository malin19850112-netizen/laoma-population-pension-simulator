'use strict';
// Reuse the audited V25 model; do not introduce another forecast or score.
function pensionComparisonData(cfg=pensionConfig(),f=S.f,m=S.m){
 return YEARS.map((year,i)=>({year,start:i?YEARS[i-1]:null,
  employee:Object.fromEntries(['GD','HN'].map(prov=>[prov,pensionModel(prov,'employee',year,cfg,f,m)])),
  resident:Object.fromEntries(['GD','HN'].map(prov=>[prov,pensionModel(prov,'resident',year,cfg,f,m)]))}));
}
function pensionCoverageVerdict(g,h){
 const label=g.coverage>=100&&h.coverage>=100?'两省缴费均能覆盖基金支出':g.coverage<100&&h.coverage<100?'两省仅靠缴费都不够':g.coverage>=100?'广东缴费可覆盖，湖南不足':'湖南缴费可覆盖，广东不足';
 const delta=g.coverage-h.coverage;
 return label+'；'+(Math.abs(delta)<.05?'两省覆盖率接近':`${delta>0?'湖南':'广东'}覆盖率更低${n(Math.abs(delta))}个百分点`)+'。';
}
function pensionGapSentence(d){return d.nonFeeNeed>0?`需非缴费来源补充${n(d.nonFeeNeed)}亿元／年`:`缴费相对支出尚余${n(d.feeMargin)}亿元／年`;}
function pensionAfterSentence(d){return d.afterListed>0?`仍有${n(d.afterListed)}亿元／年待平衡`:`列示来源已覆盖，余量${n(d.listedMargin)}亿元／年`;}
function pensionStageProvince(prov,d,resident=false){
 const name=PENSION.provinces[prov].name;
 const people=d.ratio===null?'实缴人数缺项，人数比未知':`每位领取者对应${n(d.ratio,2)}位缴费者`;
 return `${name}：${people}，缴费覆盖基金支出${n(d.coverage)}%；${pensionGapSentence(d)}。设定财政补助${n(d.fiscal)}亿元，加利息／投资及其他收入${n(d.investment+d.other)}亿元后，${pensionAfterSentence(d)}。${resident?'':''}`;
}
function pensionThirtyYearConclusion(stages){
 const a=stages[0],z=stages[3],g=z.employee.GD,h=z.employee.HN;
 const gdDrop=a.employee.GD.coverage-g.coverage,hnDrop=a.employee.HN.coverage-h.coverage;
 const trend=Math.max(gdDrop,hnDrop)<=0?'两省覆盖率均未下降':Math.abs(gdDrop-hnDrop)<.05?'两省降幅接近':`${gdDrop>hnDrop?'广东':'湖南'}的覆盖率降幅更大`;
 const volume=Math.abs(g.nonFeeNeed-h.nonFeeNeed)<.05?'两省需非缴费补充金额接近':`${g.nonFeeNeed>h.nonFeeNeed?'广东':'湖南'}需要的非缴费补充金额更大`;
 return {coverage:`2056年职工：${pensionCoverageVerdict(g,h)}广东${n(g.coverage)}%，湖南${n(h.coverage)}%。`,
  trend:`2026—2056年职工覆盖率：广东变化${signed(g.coverage-a.employee.GD.coverage)}个百分点，湖南${signed(h.coverage-a.employee.HN.coverage)}个百分点；${trend}。`,
  amount:`2056年职工需非缴费补充：广东${n(g.nonFeeNeed)}、湖南${n(h.nonFeeNeed)}亿元／年；${volume}。这只是省级资金规模比较，未除以财政收入，不能解释为财政承受力。`,
  resident:`2056年居民：${pensionCoverageVerdict(z.resident.GD,z.resident.HN)}广东${n(z.resident.GD.coverage)}%，湖南${n(z.resident.HN.coverage)}%。居民制度的基础养老金依靠财政、个人账户另有用途，不能照搬职工抚养比解释。`};
}
function pensionComparisonExport(){
 const cfg=pensionConfig(),stages=pensionComparisonData(cfg),out=[['比较范围','制度','阶段起点','阶段终点','省份','指标','数值','单位','性质／口径','来源']];
 const add=(key,start,y,prov,metric,v,unit,note,source)=>out.push(['广东／湖南全省',key,start,y,prov,metric,v,unit,note,source]);
 const assumption=`共用当前${province().name}/${pensionBase().name}经济参数；${JSON.stringify(cfg)}；生育${S.f}/迁移${S.m}`;
 for(const prov of ['GD','HN'])for(const key of ['employee','resident']){
  const b=pensionBase(prov,key),source=b.sources.map(k=>PENSION.sources[k].url).join(' ; ');
  for(const [field,label,u]of [['payers','实际基年缴费人数','万人'],['recipients','实际基年领取人数','万人'],['fee','实际基年缴费收入','亿元／年'],['outflow','实际基年基金支出','亿元／年']])add(key,'历史',b.year,prov,label,b[field],u,b[field]===null?'实际字段未取得；不是0':b.version+'；人数另据所列人社/统计来源',source);
 }
 for(const s of stages)for(const key of ['employee','resident'])for(const prov of ['GD','HN']){
  const d=s[key][prov],b=pensionBase(prov,key),source=b.sources.map(k=>PENSION.sources[k].url).join(' ; ')+' ; '+pensionPopulationSource(prov);
  for(const [field,label,u]of [['payers','情景缴费人数','万人'],['recipients','情景领取人数','万人'],['ratio','缴费领取人数比','人／人'],['coverage','缴费覆盖基金支出','%'],['nonFeeNeed','需非缴费来源补充','亿元／年'],['fiscal','设定财政补助','亿元／年'],['investment','设定投资利息','亿元／年'],['other','未细分收入差额路径','亿元／年'],['afterListed','列示来源后待平衡额','亿元／年'],['afterExtra','计入额外假设后待平衡额','亿元／年'],['finalGap','最终资金缺口','亿元／年']])add(key,s.start??'锚点',s.year,prov,label,d[field],u,`${d[field]===null?'未知／未设置；':'情景；'}${assumption}；${pensionBasisNote(prov)}`,source);
  add(key,s.start??'锚点',s.year,prov,'自动关键结论',pensionStageProvince(prov,d,key==='resident'),'文字','条件推演，不是官方预测；'+assumption,source);
 }
 for(const [key,text]of Object.entries(pensionThirtyYearConclusion(stages)))add('两制度',2026,2056,'两省',key,text,'文字','条件结论；'+assumption,PENSION.sources.paper.url);
 return out;
}
function pensionCompare(...args){return dnMark(dnRaw_pensionCompare(...args),"future","两省四阶段均为未来情景模拟；实际资金基年和未来路径不同，最终缺口未知。",{tables:true,block:true});}
function dnRaw_pensionCompare(){
 const stages=pensionComparisonData(),end=stages[3],verdict=pensionThirtyYearConclusion(stages),cfg=pensionConfig();
 return `<section class="panel pension-comparison" aria-labelledby="pensionComparisonTitle"><div class="section-head"><h2 id="pensionComparisonTitle">广东还是湖南，养老金压力更大？</h2><span class="badge warn">当前假设下的条件结论</span></div>
 <p class="comparison-intro">不能只给一个省排第一：缴费支撑比例、30年恶化幅度、需补的绝对金额，是三个不同问题。下方逐阶段直接解释，职工与居民各自比较。</p>
 <details class="comparison-evidence"><summary>实际证据：广东2025、湖南2025基年，展开看原数及来源</summary><div class="two">${['GD','HN'].map(prov=>`<article><h3>${PENSION.provinces[prov].name} · 已取得的历史执行数据</h3>${['employee','resident'].map(key=>{const b=pensionBase(prov,key);return `<p>${b.year}年${key==='employee'?'职工合计':'居民'}：缴费收入${n(b.fee,2)}亿元，基金支出${n(b.outflow,2)}亿元，按这份执行数据计算缴费覆盖${n(b.fee/b.outflow*100)}%。</p>`;}).join('')}${pensionSource(prov==='GD'?'gd-budget25':'hn-budget25')}</article>`).join('')}</div><p>两省资金基年均为2025；人社独立披露与财政执行版的年份/口径仍分别核对；未跨版本替换明细。湖南2025后续人社披露中，企业基金总收入1647.59亿元、支出1710.98亿元；总收入含非缴费收入，该63.39亿元差额不是“缴费收入缺口”。${pensionSource('hn-disclosure25')}</p></details>
 <div class="note"><b>统一比较假设：</b>采用当前${province().name}／${esc(pensionBase().name)}页面的同一组经济参数，同时作用于两省和两制度。人均缴费年增长${cfg.feeGrowth}%、人均待遇${cfg.benefitGrowth}%、财政等收入${cfg.supportGrowth}%；人口选项编号${S.f}/${S.m}，湖南采用新版生育及非自然残差假设，广东采用新版生育及非自然残差；具体参数见各省说明。两省均从2025同年基线推演；实缴／领取覆盖系数年变化${cfg.payerGrowth}%／${cfg.recipientGrowth}%，其他基金支出年增长${cfg.otherOutGrowth}%，缴费年龄代理上限${cfg.payerEnd}岁、领取代理${cfg.recipientStart}岁以上。之后为压力实验，不是2026实际或官方预测。${cfg.extra===null?'额外补充未设置。':`另设额外补充${n(cfg.extra)}亿元／年，见下方资金表和导出；本比较先按原列示收入路径判断。`}</div>
 <div class="comparison-overview">${[['自身缴费支撑',verdict.coverage],['未来30年走势',verdict.trend],['需要筹集的资金量',verdict.amount],['居民制度单独看',verdict.resident]].map(([title,text])=>`<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
 <div class="section-head"><h3>每十年的关键结论 · 不用自己读表判断</h3><button id="exportPensionComparison">导出两省逐阶段结论</button></div>
 <div class="comparison-stages">${stages.map((s,i)=>`<article class="comparison-stage ${S.year===s.year?'current':''}" data-comparison-year="${s.year}"><button class="comparison-stage-heading" data-year="${s.year}" aria-pressed="${S.year===s.year}"><b>${s.start?s.start+'—'+s.year:s.year+' · 起点'}</b><span class="badge warn">${i?'期末年度情景':'两省逐年估算'}</span></button><h3>职工：${pensionCoverageVerdict(s.employee.GD,s.employee.HN)}</h3><p data-comparison-line="employee-GD">${pensionStageProvince('GD',s.employee.GD)}</p><p data-comparison-line="employee-HN">${pensionStageProvince('HN',s.employee.HN)}</p>${i?`<p class="comparison-change">这十年缴费覆盖率变化：广东${signed(s.employee.GD.coverage-stages[i-1].employee.GD.coverage)}、湖南${signed(s.employee.HN.coverage-stages[i-1].employee.HN.coverage)}个百分点。${s.employee.GD.nonFeeNeed>s.employee.HN.nonFeeNeed?'广东':s.employee.HN.nonFeeNeed>s.employee.GD.nonFeeNeed?'湖南':'两省'}期末需补金额${Math.abs(s.employee.GD.nonFeeNeed-s.employee.HN.nonFeeNeed)<.05?'相近':'更大'}；金额规模不等于压力比例。</p>`:'<p class="comparison-change">这不是2026已发生结果：两省均从2025同年人数/资金/重建年龄推进一年。待遇及资金统计定义仍有差异，比较仅为条件实验。</p>'}<h3>居民：${pensionCoverageVerdict(s.resident.GD,s.resident.HN)}</h3><p data-comparison-line="resident-GD">${pensionStageProvince('GD',s.resident.GD,true)}</p><p data-comparison-line="resident-HN">${pensionStageProvince('HN',s.resident.HN,true)}</p><p class="hint">以上金额均为${s.year}当年、亿元／年；不是这十年累计赤字。${i?'前一期到本期是两个截面的变化，不据此确定哪一年转为不足。':''}</p></article>`).join('')}</div>
 <div class="note warning"><b>怎么理解“靠什么补”：</b>先看明确列示的财政、投资及其他收入；仍待平衡的部分需要未来追加财政、统筹调剂或动用结余等安排，尚无确定金额和承诺，最终缺口未知。机关单位缴费本身也可能来自财政。居民个人账户资金不能直接当作支付他人基础养老金的财政资金；湖南居民实缴人数和补缴持续性缺项，不把高缴费覆盖解读为制度更安全。</div>
 <details><summary>展开核查表：四阶段覆盖率与2056资金需要</summary><div class="pension-table-wrap"><table><thead><tr><th>省份／制度</th>${YEARS.map(y=>`<th>${y}缴费覆盖</th>`).join('')}<th>2056需非缴费补充<br>亿元／年</th></tr></thead><tbody>${['GD','HN'].flatMap(prov=>['employee','resident'].map(key=>`<tr><th>${PENSION.provinces[prov].name} · ${key==='employee'?'职工合计':'居民'}</th>${stages.map(s=>`<td>${n(s[key][prov].coverage)}%</td>`).join('')}<td>${n(end[key][prov].nonFeeNeed)}</td></tr>`)).join('')}</tbody></table></div></details></section>`;
}
document.addEventListener('click',e=>{if(e.target.closest('#exportPensionComparison'))csvDownload(pensionComparisonExport(),`广东湖南_四阶段养老金关键结论_生育${S.f}迁移${S.m}.csv`);});
