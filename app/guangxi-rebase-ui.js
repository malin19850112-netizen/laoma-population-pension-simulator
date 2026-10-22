'use strict';
// Guangxi uses the same evidence contract as the other provinces, with no fund
// extrapolation where contribution and benefit inputs are absent.
function gxFull(id,prov=S.province){return id==='Guangxi'||id==='ALL'&&prov==='GX';}
function gxModelSources(){return [REGISTRY.sources.gxcensus.url,REGISTRY.sources.gx2025.url,REGISTRY.sources.gxyearbook04.url].join(' ; ');}
function gxLatestPopulation(c){
 const id=c.id==='ALL'?'Guangxi':c.id,cityRow=GX_DATA.cities.find(x=>x.id===id);
 if(!cityRow)return {...c,id:'Guangxi',name:'广西全区',year:2025,population:49890000,weak:false,ageBands:{'0—14岁':9910000,'16—59岁':28970000,'60岁及以上':10190000,'65岁及以上':7020000},sources:[REGISTRY.sources.gx2025.url],published:GX_DATA.actual2025.published};
 const newer=cityRow.actual2025,a=cityRow.actual2024;
 return {...c,id,name:cityRow.name,year:newer?2025:2024,population:newer?newer.total:a.total,weak:false,ageBands:newer?null:{'0—14岁':a.child,'15—59岁':a.working,'60岁及以上':a.senior,'65岁及以上':a.old},sources:[newer?GX_DATA.sources[newer.source].url:GX_DATA.sources.gxyearbook0212.url],published:''};
}
function gxEvidenceClaims(c){
 const key=pensionKey(),r=GX_DATA.social2025[key],src=REGISTRY.sources['gx-social-2025'].url;
 const claim=(id,title,level,value,reason,year=2025,sources=[src])=>({prov:'GX',scope:c.name,id,title,level,value,reason,sources,year});
 return [claim('payers-actual','当年实际缴费人数','unknown','未取得','年末参保数不是当年实缴人数，不用参保减领取倒算。'),
 claim('recipients-actual','2025年末享受待遇人数','actual',n(r.beneficiaries/1e4,2)+'万人',key==='employee'?'10月社保公告300.72万人；8月公报310.59万人为参保离退休，两个指标不替代。':GX_DATA.pensionVerification.resident.discrepancyNote),
 claim('fiscal-evidence','2025财政补助执行资料','actual',n(GX_DATA.pensionVerification[key].supportExecutionWan/1e4,6)+'亿元',key==='employee'?'财政补助实际投入且已拨入基金财政专户；非纯缴费或个人养老金发放支出。':'补助项目执行数，不是全体待遇支出；未与基金收入表完成对账。',2025,[REGISTRY.sources[GX_DATA.pensionVerification[key].source].url]),
 claim('fund-actual','基金总收支','actual',`收入${n(r.income,2)}、支出${n(r.outflow,2)}亿元`,'总收入包含多类来源，不能冒称缴费收入；总支出不冒称纯待遇支出。'),
 claim('coverage-unknown','缴费覆盖率与实际资金缺口','unknown','不能判断','缺少纯缴费收入、待遇支出及补充资金拆分；总收支差不能证明缴费支撑能力。'),
 claim('fund-future',S.year+'缴费与领取人数、资金缺口','unknown','不能计算','缺实缴登记基数与资金拆分，不借用广东或湖南的参数。四阶段只显示人口情景，不等于养老金人数。',S.year),
 claim('future-best','三种经济情景哪种更接近实际','unknown','无法核验','广西同口径历史实缴、缴费和待遇序列不足，不能据此指定增长假设。',S.year)];
}
function gxAuditFindings(key){
 key=key==='resident'?'resident':'employee';const r=GX_DATA.social2025[key],z=stats('Guangxi',S.year),a=stats('Guangxi',2026),b=stats('Guangxi',2056),src=gxModelSources(),fund=REGISTRY.sources['gx-social-2025'].url;
 const row=(kind,year,title,text,sources=src)=>({prov:'GX',scope:'广西全区',system:PH_NAMES[key],kind,year,title,text,sources});
 return [row('derived',2025,'实际人口减少，自然减少只是其中一部分','2025年末常住人口4989万人，比2024年末少24万人；出生36万、死亡40.5万，自然减少4.5万人。其余约19.5万人是人口平衡残差，包含迁移及统计调整，不能全部解释为净迁出。60岁以上1019万人，占比约20.4%。'),
 row('derived',2025,'基金总收支不能回答缴费能否支撑待遇',`当前${PH_NAMES[key]}基金总收入${n(r.income,2)}亿元、总支出${n(r.outflow,2)}亿元，算术差${n(r.income-r.outflow,2)}亿元；这是总账年度流量差，不是缴费余量或可动用结余。实缴人数、纯缴费及待遇支出拆分未取得，不能确定缴费覆盖率。`,fund),
 row('future',S.year,'人口老化的信号随情景更新',`当前${S.year}模拟人口${n(z.total/1e4)}万人，60岁以上${n(z.senior/1e4)}万人（${n(z.senior/z.total*100)}%），80岁以上${n(z.oldest/1e4)}万人。2026→2056人口${n(a.total/1e4)}→${n(b.total/1e4)}万人；60岁以上${n(a.senior/1e4)}→${n(b.senior/1e4)}万人。假设：${GX_FERTILITY[S.f].label}；${GX_MOVEMENT[S.m].label}。这些不是实测或官方预测，年龄人数不能当作缴费和领取人数。`),
 row('rebuild',2025,'细年龄输入经过重建，不是官方单岁原数','2020普查五岁组内等分、年度演进及2025官方总量和年龄大组约束形成细年龄输入。部分历史出生死亡口径尚未与同年常住公报完全对齐，因此留出误差仅反映当前资料及假设，不能证明未来准确性。'),
 row('unknown','2026—2056','养老金缺口多少、补充来源净额仍不能判断','职工与居民分开：实缴人数、缴费收入、纯待遇支出及完整统筹净额缺失，已核补助执行额不能替代资金全账，不计算资金缺口，不按0处理。广西14市仍为旧研究对照，不能加总替代全区新版。',fund)];
}
function gxResearchRows(){
 const raw=uxPension()?gxPensionExport():gxPopulationExport();
 return [['模块','省份','地区或制度','年份或区间','指标','值','单位','性质与限制','来源'],...raw.slice(1).map(r=>['广西当前研究','GX',r[0]+'／'+r[1],r[2],r[3],r[4],r[5],r[6],r[7]]),...qaRows()];
}
function gxPopulationExport(){
 const all=gxAllPopulationExport(),id=S.route==='map'?'ALL':S.city,full=gxFull(id),c=GX_DATA.cities.find(c=>c.id===id);
 const rows=[all[0],...all.slice(1).filter(r=>full?r[0]==='广西':r[0]===c?.name)];
 if(c){
  if(c.actual2025)for(const [label,v]of [['常住总人口',c.actual2025.total],['出生人口',c.actual2025.births],['死亡人口',c.actual2025.deaths]])rows.push([c.name,'市级',2025,label,v,'人','实际统计；2025常住人口',GX_DATA.sources[c.actual2025.source].url]);
  for(const y of YEARS){const z=stats(id,y);for(let i=0;i<BANDS.length;i++)rows.push([c.name,'市级旧研究对照',y,BANDS[i][0],Math.round(z.bands[i]),'人','未来模拟；旧研究未按最新基线重校，不是官方预测',REGISTRY.sources.paper.url]);}
 }
 for(const r of rows.slice(1)){
  if(YEARS.includes(Number(r[2])))r[6]='未来情景模拟；'+r[6]+'；生育'+S.f+'／迁移'+S.m;
  else if(r[6].includes('须逐年'))r[6]='统计口径待核；'+r[6];
  else r[6]='实际统计；'+r[6];
  if(r[2]===2024&&c)r[7]=GX_DATA.sources.gxyearbook0212.url;
 }
 return rows;
}
function gxPensionExport(){
 const rows=gxBasePensionExport(),system=PENSION.provinces.GX.records[pensionKey()].name,z=stats('Guangxi',2025);
 for(const r of rows.slice(1))if(YEARS.includes(r[2]))r[6]='未来情景模拟；'+r[6]+'；生育'+S.f+'／迁移'+S.m;
 for(const [label,value,nature]of [['60岁以上人口',z.senior,'实际统计；2025官方大年龄组'],['65岁以上人口',z.old,'实际统计；2025官方大年龄组'],['80岁以上人口',z.oldest,'重建估计；2025官方大组约束下细年龄重建，非实际原数']])rows.push(['广西全区',system,2025,label,value,'人',nature,gxModelSources()]);
 for(const y of YEARS)for(const label of ['实际缴费人数','养老金缴费覆盖率','最终资金缺口'])rows.push(['广西全区',system,y,label,'未知',label.includes('人数')?'万人':label.includes('覆盖')?'%':'亿元','缺项／暂不能判断；没有足够实缴及收支拆分，不能预测，不按零',REGISTRY.sources['gx-social-2025'].url]);
 return rows;
}
function gxFundingRows(key=pensionKey()){
 const v=GX_DATA.pensionVerification,p=v[key],url=REGISTRY.sources[p.source].url,annual=REGISTRY.sources['gx-annual-2025'].url;
 const row=(label,value,unit,nature,note,source=url)=>({label,value,unit,nature,note,url:source});
 const rows=[row('实际缴费人数',null,'万人','缺项／暂不能判断','已查公告、公报和补助绩效报告，未取得同口径全年实缴人数；参保数及代缴子集均不替代。'),row('缴费收入',null,'亿元','缺项／暂不能判断','未取得分险种纯缴费收入；不以基金总收入减已知财政补助倒算。'),row('基本养老金待遇支出',null,'亿元','缺项／暂不能判断','基金总支出和补助项目执行额都不是纯养老金待遇支出。'),row(key==='employee'?'财政补助实际投入（已拨入基金专户）':'财政补助项目全年执行数',p.supportExecutionWan,'万元','实际执行统计',key==='employee'?'企业与机关合计；财政补助，不是缴费或个人待遇发放。':'项目执行数，不是全部基金支出，也非纯待遇支出；与基金收入表尚未对账。')];
 if(key==='employee')rows.push(row('其中：企业职工财政补助执行',p.enterpriseExecutionWan,'万元','实际执行统计','属于职工合计补助，不重复相加。'),row('其中：机关事业单位财政补助执行',p.governmentExecutionWan,'万元','实际执行统计','属于职工合计补助，不重复相加。'),row('其中：中央财政补助',p.centralWan,'万元','实际执行统计','中央与地方为另一种拆分，不能与企业/机关拆分重复累加。'),row('其中：地方财政补助',p.localWan,'万元','实际执行统计','不是未来财政承诺。'),row('参保离退休人数（不同于享受待遇）',310.59,'万人','实际统计','8月公报的参保离退休指标；10月公告享受待遇为300.72万人，不能相互替代。',annual));
 else rows.push(row('两份官方领取人数之差（非人口增减）',p.recipientDifferenceWan,'万人','原数相减／差异原因未核',p.discrepancyNote,REGISTRY.sources['gx-social-2025'].url),row('补助项目全年预算数',p.supportBudgetWan,'万元','预算安排／非实际执行','预算1570180.58万元、执行1352953.58万元；不要把预算当到账金额。'),row('领取基础养老金人数（绩效报告版本）',p.performanceRecipientsWan,'万人','官方原数／口径差异待核',p.discrepancyNote),row('累计结余（8月公报版本）',p.annualBalanceYi,'亿元','官方原数／版本差异待核','8月463.41亿元，10月公告463.35亿元；不擅自解释为修订或四舍五入。',annual),row('困难群体代缴人数',p.assistedContributorsWan,'万人','实际统计／特定群体','2025全年代缴困难人员105.09万人；仅为代缴子集，不是全区全年实际缴费人数。',annual));
 return rows;
}
function gxFundingEvidencePage(){
 const rows=gxFundingRows();return `<section class="panel" id="gxFundEvidence"><h2>缴费、待遇支出与财政补助 · 本轮核实</h2><p>统计年度均为2025。实际执行、预算安排及版本差异逐项分开；单位按行列示。已知财政补助不等于养老金缺口，不与基金总收入简单相减倒算缴费。</p><div class="table-scroll"><table><thead><tr><th>指标</th><th>原数与单位</th><th>性质、口径及来源</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${r.label}</th><td>${r.value===null?'未取得':n(r.value,2)+' '+r.unit}</td><td><b>${r.nature}</b><br>${r.note}<br><a href="${r.url}" target="_blank" rel="noopener">官方原文 ↗</a></td></tr>`).join('')}</tbody></table></div><p class="hint">${GX_DATA.pensionVerification.searchBoundary} 核验日期：2026-10-21。年份、人口情景切换不改变这些实际记录。</p></section>`;
}
