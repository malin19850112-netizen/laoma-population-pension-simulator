'use strict';
const PENSION_PRESETS={fixed:{name:'固定单价',feeGrowth:0,benefitGrowth:0},improve:{name:'缴费改善',feeGrowth:3,benefitGrowth:2},pressure:{name:'压力',feeGrowth:1,benefitGrowth:3}};
const PENSION_FACTORS=[['feeGrowth','人均缴费年增长'],['benefitGrowth','人均待遇年增长'],['payerGrowth','缴费覆盖系数年变化'],['recipientGrowth','领取覆盖系数年变化'],['supportGrowth','财政、投资等收入年增长'],['otherOutGrowth','其他基金支出年增长']];
let sensitivityPreset='fixed';
function pensionPreset(id){const p=PENSION_PRESETS[id];if(!p)throw Error('Unknown pension preset');return {...PDEFAULT,feeGrowth:p.feeGrowth,benefitGrowth:p.benefitGrowth};}
function pensionScenarioData(f=S.f,m=S.m){return Object.fromEntries(Object.keys(PENSION_PRESETS).map(id=>[id,pensionComparisonData(pensionPreset(id),f,m)]));}
function pensionOrder(g,h,tolerance=.05){return Math.abs(g-h)<tolerance?'接近':g>h?'广东':'湖南';}
function pensionScenarioVerdict(data,key,i){
 const snapshots=Object.keys(PENSION_PRESETS).map(id=>{const d=data[id][i][key];return {id,g:d.GD,h:d.HN,
  enough:[d.GD.coverage>=100,d.HN.coverage>=100].join('/'),listedEnough:[d.GD.afterListed<=1e-7,d.HN.afterListed<=1e-7].join('/'),lower:pensionOrder(d.HN.coverage,d.GD.coverage),larger:pensionOrder(d.GD.nonFeeNeed,d.HN.nonFeeNeed)};});
 const changes=[];
 if(new Set(snapshots.map(d=>d.enough)).size>1)changes.push('缴费是否足够');
 if(new Set(snapshots.map(d=>d.listedEnough)).size>1)changes.push('列示来源后是否还需筹资');
 if(new Set(snapshots.map(d=>d.lower)).size>1)changes.push('两省缴费覆盖高低顺序');
 if(new Set(snapshots.map(d=>d.larger)).size>1)changes.push('两省需补金额大小顺序');
 return {changes,snapshots,text:changes.length?`结论会变：${changes.join('、')}随设定改变。`:'这三组设定下，缴费是否足够、列示来源后是否仍需筹资、两省覆盖率及需补金额顺序均未改变；金额仍可能明显变化。'};
}
function pensionSignedGap(d){return d.outflow-d.listed;}
function pensionSensitivity(prov,key,y,preset=sensitivityPreset,f=S.f,m=S.m){
 const cfg=pensionPreset(preset),base=pensionModel(prov,key,y,cfg,f,m),gap=pensionSignedGap(base);
 const factors=PENSION_FACTORS.map(([field,name])=>{const changed={...cfg,[field]:cfg[field]+1},d=pensionModel(prov,key,y,changed,f,m);return {field,name,from:cfg[field],to:changed[field],gapChange:pensionSignedGap(d)-gap,afterChange:d.afterListed-base.afterListed,after:d.afterListed,nonFeeChange:d.nonFeeNeed-base.nonFeeNeed};});
 const max=Math.max(...factors.map(d=>Math.abs(d.gapChange))),leaders=max<1e-7?[]:factors.filter(d=>Math.abs(Math.abs(d.gapChange)-max)<1e-6);
 return {prov,key,year:y,preset,base,gap,factors,leaders,max};
}
function pensionPopulationRange(prov,key,y,preset=sensitivityPreset){
 const values=[];for(let f=1;f<=5;f++)for(let m=1;m<=3;m++)values.push({f,m,value:pensionModel(prov,key,y,pensionPreset(preset),String(f),String(m)).afterListed});
 return {min:Math.min(...values.map(d=>d.value)),max:Math.max(...values.map(d=>d.value)),cases:values};
}
function pensionEffectText(v){return Math.abs(v)<1e-7?'不变':`${v<0?'缺额减少／余量增加':'缺额增加／余量减少'}${n(Math.abs(v))}亿元／年`;}
function pensionLeadersText(s){if(!s.leaders.length)return '锚点，无复利影响。';const names=s.leaders.map(d=>d.name).join('、'),sameSign=s.leaders.every(d=>Math.sign(d.gapChange)===Math.sign(s.leaders[0].gapChange));return sameSign?`${names}${s.leaders.length>1?'并列':''}影响最大；单项上调后，${pensionEffectText(s.leaders[0].gapChange)}。`:s.leaders.map(d=>d.name+'：'+pensionEffectText(d.gapChange)).join('；')+'（并列）。';}
function pensionScenarioRows(){
 const data=pensionScenarioData(),rows=[['省份','制度','年份','情景','指标','数值','单位','实际／假设与口径','来源']];
 const add=(prov,key,y,id,label,value,unit,note,source)=>rows.push([prov,key,y,id,label,value,unit,note,source]);
 for(const prov of ['GD','HN'])for(const key of ['employee','resident']){
  const b=pensionBase(prov,key),src=b.sources.map(k=>PENSION.sources[k].url).join(' ; ');
  for(const field of ['payers','recipients','fee','outflow'])add(prov,key,b.year,'实际基年',field,b[field],['payers','recipients'].includes(field)?'万人':'亿元／年',b[field]===null?'实际字段未知；不是0':b.version+'；人数另据所列来源',src);
 }
 for(const [id,stages]of Object.entries(data))for(let i=0;i<stages.length;i++)for(const key of ['employee','resident']){
  const s=stages[i],v=pensionScenarioVerdict(data,key,i),cfg=pensionPreset(id);
  for(const prov of ['GD','HN']){const b=pensionBase(prov,key),d=s[key][prov],src=b.sources.map(k=>PENSION.sources[k].url).join(' ; ')+' ; '+pensionPopulationSource(prov);
   for(const field of ['payers','recipients','ratio','fee','outflow','coverage','nonFeeNeed','fiscal','investment','other','afterListed','finalGap'])add(prov,key,s.year,id,field,d[field],['payers','recipients'].includes(field)?'万人':field==='ratio'?'人／人':field==='coverage'?'%':'亿元／年',`${d[field]===null?'未知；':'压力情景；'}${pensionBasisNote(prov)}；${JSON.stringify(cfg)}；生育${S.f}/迁移${S.m}`,src);
   add(prov,key,s.year,id,'本情景结论',pensionStageProvince(prov,d,key==='resident'),'文字','假设推演；不是实际预测',src);
  }
  add('两省',key,s.year,'三情景','结论是否改变',v.text,'文字','只指列出的三组，不代表真实未来确定',PENSION.sources.paper.url);
 }
 for(const prov of ['GD','HN'])for(const key of ['employee','resident'])for(const y of YEARS){
  const s=pensionSensitivity(prov,key,y),src=pensionPopulationSource(prov);
  for(const d of s.factors){add(prov,key,y,sensitivityPreset,d.name+' +1个百分点：带符号差额变化',d.gapChange,'亿元／年','单项变化，其余不变；支出-列示收入，正缺额负余量；非因果贡献',src);add(prov,key,y,sensitivityPreset,d.name+' +1个百分点：待平衡额变化',d.afterChange,'亿元／年','max(0,缺额)后的变化；可能为0而余量仍变',src);}
  add(prov,key,y,sensitivityPreset,'最大同尺度影响',s.leaders.map(d=>d.name).join('、')||'锚点无复利影响','文字','参照预设；同尺度+1个百分点／年，允许并列，不是现实因果排名',src);
  const r=pensionPopulationRange(prov,key,y);add(prov,key,y,sensitivityPreset,'15个人口组合待平衡额下界',r.min,'亿元／年','研究情景范围；不是置信区间或概率；两省新版2025人口与资金基线；金额定义及残差设定不同',src);add(prov,key,y,sensitivityPreset,'15个人口组合待平衡额上界',r.max,'亿元／年','研究情景范围；不是置信区间或概率',src);
 }
 return rows;
}
function pensionScenarioTable(key,data){
 return `<section class="scenario-system"><h3>${key==='employee'?'职工养老 · 企业＋机关合计':'居民养老 · 个人账户与财政基础养老金分开理解'}</h3><div class="pension-table-wrap"><table class="scenario-matrix"><thead><tr><th>年份／省份</th>${Object.values(PENSION_PRESETS).map(p=>`<th>${p.name}<small>缴费${p.feeGrowth}%／待遇${p.benefitGrowth}%</small></th>`).join('')}</tr></thead><tbody>${YEARS.map((y,i)=>`<tr class="scenario-period"><th colspan="4">${i?YEARS[i-1]+'—'+y:y+' · 两省逐年估算'} <span data-scenario-verdict="${key}-${y}">${pensionScenarioVerdict(data,key,i).text}</span></th></tr>${['GD','HN'].map(prov=>`<tr data-scenario-result="${key}-${prov}-${y}" class="${S.year===y?'selected':''}"><th><button data-year="${y}">${y}</button> ${PENSION.provinces[prov].name}</th>${Object.keys(PENSION_PRESETS).map(id=>{const d=data[id][i][key][prov];return `<td data-scenario="${id}"><strong>${n(d.coverage)}%</strong><small>缴费覆盖</small><p>需非缴费补充 <b>${n(d.nonFeeNeed)}</b></p><p>列示来源后待平衡 <b>${n(d.afterListed)}</b></p><em>${d.coverage>=100?'缴费可覆盖':'仅靠缴费不足'} · ${d.afterListed>0?'仍需筹资':'列示来源可覆盖'}</em></td>`;}).join('')}</tr>`).join('')}`).join('')}</tbody></table></div><details><summary>展开三种情景各阶段的两省判断</summary>${YEARS.map((y,i)=>`<article class="scenario-verdict-detail"><h4>${y}</h4>${Object.keys(PENSION_PRESETS).map(id=>`<p><b>${PENSION_PRESETS[id].name}：</b>${pensionCoverageVerdict(data[id][i][key].GD,data[id][i][key].HN)}</p>`).join('')}</article>`).join('')}</details></section>`;
}
function pensionSensitivityPanel(){
 const preset=PENSION_PRESETS[sensitivityPreset];
 return `<section class="pension-sensitivity"><div class="section-head"><h3>哪些假设最影响测算差额？</h3><label>敏感性参照<select id="sensitivityPreset">${Object.entries(PENSION_PRESETS).map(([id,p])=>`<option value="${id}" ${id===sensitivityPreset?'selected':''}>${p.name}</option>`).join('')}</select></label></div><p>参照${preset.name}；每次仅把一项年增长提高<b>1个百分点</b>，其他项不变。比较“基金支出−列示收入”的变化，正数为缺额、负数为余量。这样不会把本来已有结余的变化误当成“没有影响”。金额均为相应年份的一年。</p><div class="sensitivity-summary">${['employee','resident'].map(key=>`<article><h4>${key==='employee'?'职工合计':'居民' } · 2056</h4>${['GD','HN'].map(prov=>{const s=pensionSensitivity(prov,key,2056);return `<p><b>${PENSION.provinces[prov].name}：</b>${pensionLeadersText(s)}</p>`;}).join('')}</article>`).join('')}</div>
 <details class="sensitivity-details"><summary>展开每十年：六项假设各自影响多少、是否并列</summary>${['employee','resident'].flatMap(key=>['GD','HN'].map(prov=>{const ss=YEARS.map(y=>pensionSensitivity(prov,key,y));return `<h4>${PENSION.provinces[prov].name} · ${key==='employee'?'职工合计':'居民'}</h4><div class="pension-table-wrap"><table class="sensitivity-table" data-sensitivity="${key}-${prov}"><thead><tr><th>单项年增长＋1个百分点</th>${YEARS.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody>${PENSION_FACTORS.map(([field,name],i)=>`<tr><th>${name}<small>${ss[0].factors[i].from}% → ${ss[0].factors[i].to}%</small></th>${ss.map(s=>`<td>${signed(s.factors[i].gapChange)}<small>${s.factors[i].afterChange===0?'待平衡额不变':`待平衡额变化${signed(s.factors[i].afterChange)}`}</small></td>`).join('')}</tr>`).join('')}<tr class="sensitivity-leaders"><th>同尺度影响最大</th>${ss.map(s=>`<td>${s.leaders.map(d=>d.name).join('、')||'锚点，无复利影响'}</td>`).join('')}</tr></tbody></table></div>`;})).join('')}<p class="hint">单位亿元／年；负号＝缺额减少或余量增加，正号＝缺额增加或余量减少。并列来自模型乘法关系，不意味着工资、就业等现实作用相同；不能把这些单项作用直接相加。“财政、投资等收入”是一组联动参数，不等于单独增加财政补助。广东、湖南2026均从2025基年累计一年，增长假设在两省均已有作用。</p></details>
 <details class="population-sensitivity"><summary>人口假设影响单独看：15组生育／迁移情景范围</summary><p>固定当前敏感性参照的经济预设，遍历所选地区5种生育×3种净调整/迁移设定；两省分别以本地2025生育与非自然余额构造敏感性，金额与人口基年需各自核对，不能当统一参数概率分布；下表是列示来源后待平衡额的最小—最大值。不是置信区间、发生概率，也不能与“每年＋1个百分点”混在一起排名。</p><div class="pension-table-wrap"><table><thead><tr><th>省份／制度</th>${YEARS.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody>${['employee','resident'].flatMap(key=>['GD','HN'].map(prov=>`<tr><th>${PENSION.provinces[prov].name} · ${key==='employee'?'职工':'居民'}</th>${YEARS.map(y=>{const r=pensionPopulationRange(prov,key,y);return `<td>${n(r.min)}—${n(r.max)}</td>`;}).join('')}</tr>`)).join('')}</tbody></table></div><p class="hint">年度亿元；缺登记性别/缴费年限及跨省匹配；人口性别边际已约束，但不等于完成退休精算，不把代理退休年龄切换当成延迟退休改革效果。人口模型自身偏差、补缴持续性和未来资金承诺仍未消除。</p></details></section>`;
}
function pensionScenariosPage(...args){return dnMark(dnRaw_pensionScenariosPage(...args),"future","三预设、敏感性和人口组合均为未来情景模拟；历史选参证据单列，不代表哪条必然发生。",{tables:true,block:true});}
function dnRaw_pensionScenariosPage(){const data=pensionScenarioData();
 return `<section class="panel pension-scenario-lab" aria-labelledby="scenarioLabTitle"><div class="section-head"><h2 id="scenarioLabTitle">三种情景一起看：结论会不会变？</h2><button id="exportPensionScenarios">导出三情景与敏感性</button></div><p>广东、湖南全省；职工合计与居民分别比较。三列始终保留，<b>不需要来回切换才能对照</b>。所有金额都是期末当年亿元／年，不是十年累计或官方预测。覆盖率提高不一定意味着需补金额下降：待遇总额可能同时增长，而本区补助路径保持不变。</p><div class="scenario-presets">${Object.entries(PENSION_PRESETS).map(([id,p])=>`<article data-preset-card="${id}"><h3>${p.name}</h3><small>实验设定；历史偏差见上方核对</small><p>人均缴费年增长 <b>${p.feeGrowth}%</b><br>人均待遇年增长 <b>${p.benefitGrowth}%</b></p></article>`).join('')}</div><div class="note"><b>对照条件：</b>三组均使用当前人口选项${S.f}/${S.m}的人口路径；湖南为新版生育／非自然残差，广东同为新版，含义与版本见各省说明；缴费／领取人数相同。覆盖系数和财政等收入、其他基金支出年增长均0，缴费年龄代理职工20—59／居民16—59、领取60岁以上；额外补充未知。<b>本区独立于下方自定义保存参数</b>，三组设置不会因切换省份或个人参数而偷偷变化。</div><p class="hint">实际基年仍是两省2025完整财政执行版（人数另据标明的人社及统计来源）；广东2025/湖南2025同年资金与重建年龄基线推演。0/0、3/2、1/3是已确认的实验设定，不是官方增长预测或概率。需非缴费补充并非最终财政赤字；“列示来源可覆盖”不等于已有未来承诺。</p>${pensionScenarioTable('employee',data)}${pensionScenarioTable('resident',data)}${pensionSensitivityPanel()}<div class="note warning">这里只检验列出的三组经济设定，结论一致不代表真实未来确定。居民缴费进入个人账户，基础养老金由财政承担，资金流量覆盖不能证明账户可挪用。湖南居民实缴人数仍未知，基年缴费的补缴持续性未明；机关缴费也可能来自财政。最终统筹与补助承诺未取得，最终资金缺口仍未知。</div></section>`;
}
document.addEventListener('change',e=>{if(e.target.id==='sensitivityPreset'){sensitivityPreset=e.target.value;render();document.querySelector('.pension-sensitivity')?.scrollIntoView({block:'start'});}});
document.addEventListener('click',e=>{if(e.target.closest('#exportPensionScenarios'))csvDownload(pensionScenarioRows(),`广东湖南_养老金三情景与敏感性_生育${S.f}迁移${S.m}.csv`);});
