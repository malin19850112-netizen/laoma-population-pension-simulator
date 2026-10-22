'use strict';
// Interpretation only: all figures come from the existing observed data and models.
function auditContexts(){
 if(!['population','care','compare'].includes(S.route)||S.route==='population'&&S.view==='actual')return [];
 if(S.route==='compare'&&!uxPension()&&UX.level!=='province')return [];
 if(S.route==='population'&&S.city!=='ALL')return [];
 const provinces=S.province==='GX'&&uxPension()?['GX']:S.route==='compare'?(uxPension()?['GD','HN']:uxPair().map(r=>r.id==='Guangdong'?'GD':r.id==='Guangxi'?'GX':'HN')):[S.province];
 return [...new Set(provinces)].map(prov=>({prov,id:REGISTRY.provinces[prov].modelId,key:uxPension()?pensionKey():'employee'}));
}
function auditFindings({prov,id,key}){if(prov==='GX')return gxAuditFindings(key);
 const hn=prov==='HN',name=PENSION.provinces[prov].name,data=hn?HN_DATA:GD_DATA,actual=data.actual2025;
 const old60=actual.bands.slice(2).reduce((a,b)=>a+b,0),natural=actual.births-actual.deaths;
 const b=pensionBase(prov,key),cfg=S.route==='compare'&&uxPension()?pensionConfig():pensionConfig(prov,key);
 const d=pensionModel(prov,key,S.year,cfg),a=stats(id,2026),z=stats(id,S.year),end=stats(id,2056),stages=YEARS.map(y=>stats(id,y));
 const peak=stages.reduce((a,b)=>a.senior>b.senior?a:b),populationSources=hn?hnModelSources():gdModelSources(),fundSources=b.sources.map(k=>PENSION.sources[k].url).join(' ; ');
 const coverage=b.fee/b.outflow*100,benefitCoverage=b.fee/b.benefit*100,ratio=b.payers!==null&&b.recipients>0?b.payers/b.recipients:null;
 const fLabel=(hn?HN_FERTILITY:GD_FERTILITY)[S.f].label,mLabel=(hn?HN_MOVEMENT:GD_MOVEMENT)[S.m].label;
 const rows=[],put=(kind,year,title,text,sources)=>rows.push({prov,scope:name+'全省',system:PH_NAMES[key],kind,year,title,text,sources});
 put('derived',2025,hn?'湖南：自然减少与较高老年占比已发生':'广东：总人口增长仍需关注年龄结构',
  `2025实际常住人口${n(actual.total/1e4)}万人，60岁以上${n(old60/1e4)}万人；据实际原数计算占比${n(old60/actual.total*100)}%。出生${n(actual.births/1e4)}万、死亡${n(actual.deaths/1e4)}万，自然增减${signed(natural/1e4)}万。自然增减不含迁移及统计调整。`,populationSources);
 put('derived',2025,`${PH_NAMES[key]}：当前缴费支撑与补充资金`,
  `2025缴费登记${pensionNumber(b.payers)}万、领取登记${pensionNumber(b.recipients)}万，人数比${ratio===null?'未知':n(ratio,2)+'∶1'}。据同年完整执行版计算：缴费覆盖待遇${n(benefitCoverage)}%，覆盖基金总支出${n(coverage)}%。${coverage<100?'仅缴费不足以覆盖基金总支出，需要财政等非缴费来源补充。':'缴费相对当年基金总支出有余量，不能据此保证未来也有余量。'}${key==='resident'?'居民个人账户和财政基础养老金有不同责任，人数比不能解释成“年轻人养老人”；湖南居民实缴缺项不反推。':'这是制度登记比，不是年轻人与老人之比；职工合计不替代企业、机关各自结论。'}金额采用完整执行版，后续人社／决算另列。`,fundSources);
 put('future',S.year,hn?'人口减少时，老年占比和高龄人数仍须分别看':'总人口变化较小时，也可能出现明显老化',
  `当前查看${S.year}：模拟总人口${n(z.total/1e4)}万、60岁以上${n(z.senior/1e4)}万（${n(z.senior/z.total*100)}%）、80岁以上${n(z.oldest/1e4)}万。2026→2056总人口${n(a.total/1e4)}→${n(end.total/1e4)}万，60岁以上${n(a.senior/1e4)}→${n(end.senior/1e4)}万；四阶段中60岁以上人数最高为${peak.year}年。${hn?'老人总量与占比不一定同向，高龄化也不必与老人总量同步。':'现有较大队列进入老年，会改变领取端；总人口优势不能单独证明养老金支付能力。'}假设：${fLabel}；${mLabel}。均非官方预测。`,populationSources);
 put('future',S.year,`${S.year}：覆盖待遇、覆盖总支出分别判断`,
  `当前${PH_NAMES[key]}模拟：缴费${n(d.fee)}、待遇${n(d.benefit)}、基金总支出${n(d.outflow)}亿元／年；缴费${d.benefitCoverage>=100?'能':'不能全额'}覆盖待遇（${n(d.benefitCoverage)}%），${d.coverage>=100?'能':'不能全额'}覆盖基金总支出（${n(d.coverage)}%）。需非缴费补充${n(d.nonFeeNeed)}亿元／年；列示财政${n(d.fiscal)}、投资${n(d.investment)}、其他${n(d.other)}后，待平衡${n(d.afterListed)}亿元／年。${d.benefitCoverage>=100&&d.coverage<100?'两项覆盖出现不同结论，不能把总支出未全覆盖写成待遇已发不出。':''}即使待平衡为0，最终缺口也未知。${S.route==='compare'&&uxPension()?'两省共用当前选中经济参数。':'采用本省当前保存参数。'}人均缴费／待遇年增长${cfg.feeGrowth}%／${cfg.benefitGrowth}%，补充资金年增长${cfg.supportGrowth}%。`,fundSources+' ; '+populationSources);
 put('rebuild',2025,'细年龄是重建输入，不是最新官方细年龄原数',
  `全省使用2025官方总量、年龄大组和性别约束重建细年龄；广东组内单岁采用等分假设。${name}未来结果使用重建输入；匹配官方总量只证明约束闭合，不是独立预测验证。城市仍为旧研究，不能加总替代全省新版。`,populationSources);
 put('unknown','2026—2056','就业、工资、退休资格与跨省登记影响未查清',
  `现版以年龄指数外推缴费及领取登记，缺按性别、缴费年限、资格流入退出和跨省关系的完整数据，未完整模拟渐进延迟退休及2030年起最低缴费年限调整。短期缴费支撑更直接关联现有劳动人口就业、工资与缴费；2025出生人口到2043才满18岁，生育改善不能立即补足近期缴费基础。`,PENSION.sources.retirement.url+' ; '+fundSources);
 put('unknown','2026—2056','最终资金缺口、财政承受力与待遇够不够用仍未知',
  `未来追加财政、全国统筹净额、可用结余和账户责任不完整；三经济情景中的补充资金默认按基年名义额延续，不能视为财政承诺或能力预测。居民缴费还可能受补缴、提档和代缴影响，不能只凭缴费金额比较两省健康程度。基金有结余不能证明个人退休生活保障充分，缺少可比实发待遇分布与生活成本。计算／页面验收不等于未来预测准确性验证。`,fundSources+' ; '+PENSION.sources.pooling.url);
 return rows;
}
function auditReviewPage(){
 const contexts=auditContexts();if(!contexts.length)return '';
 return `<section class="audit-review" id="auditReview" aria-labelledby="audit-title"><div class="section-head"><div><small>本轮审查结论 · 全省范围</small><h2 id="audit-title">已发生什么，未来要警惕什么？</h2></div><span class="badge">实际固定 · 模拟随选择更新</span></div><p class="hint">当前查看${S.year}，生育与非自然净调整的具体假设见模拟结论。2025实际证据不随选项改变；以下结论只适用于全省，不能直接用于城市。职工与居民按当前制度分别解释。</p>${contexts.map(c=>{const rows=auditFindings(c);return `<article class="audit-province" data-audit-province="${c.prov}"><h3>${PENSION.provinces[c.prov].name}全省 · ${PH_NAMES[c.key]}</h3><div class="audit-grid">${[['已发生的实际情况',['derived']],['当前假设下的未来变化',['future']],['重建输入与不能确定',['rebuild','unknown']]].map(([label,kinds])=>`<section class="audit-column"><h4>${label}</h4>${rows.filter(r=>kinds.includes(r.kind)).map(r=>`<div class="audit-item" data-audit-kind="${r.kind}">${dnTag(r.kind)}<strong>${esc(r.title)}</strong><p>${esc(r.text)}</p><details><summary>依据与时点 · ${r.year}</summary><p>${qaSources(r.sources.split(' ; '))}</p></details></div>`).join('')}</section>`).join('')}</div></article>`}).join('')}<p class="audit-scope">各地区、各制度分别判断；人口年龄不是实缴和领取人数。缴费覆盖率、补充资金金额和财政承受力不能互相替代。广西缺实缴及收支拆分，不作资金缺口推算；最终资金缺口继续标“未知”。</p></section>`;
}
function auditReviewRows(){return auditContexts().flatMap(c=>auditFindings(c).map(r=>['审查关键结论',r.prov,r.scope+'／'+r.system,r.year,r.title,r.text,'文字',DN_NAMES[r.kind]+'；实际、模拟和未知分开；'+(r.kind==='future'?'生育'+S.f+'／净调整'+S.m:''),r.sources]));}
