'use strict';
const RX_RECHECKS=[
 {province:'HN',system:'resident',year:2025,status:'未披露实际缴费人数',note:'原公告列参保3212.38万人和60岁以上领待1133.74万人，没有列居民实际缴费人数；两者相减不是实缴。保留现有金额核对，人数支撑比与人数预测验证继续缺项。',source:'https://rst.hunan.gov.cn/rst/xxgk/zfxxgknb/202605/t20260507_33971156.html',section:'三、2025年度城乡居民社会养老保险，参保情况'},
 {province:'HN',system:'government',year:2024,status:'省本级数不能补全省',note:'原公告机关缴费19.57万人明确为省本级；同页机关基金总收支为全省。不能用省本级人数配全省金额，也不能与企业全省实缴相加补职工全省实缴。',source:'https://rst.hunan.gov.cn/rst/xxgk/zfxxgknb/202507/t20250703_33728940.html',section:'二、2024年度机关事业单位，参保与基金收支'},
 {province:'HN',system:'enterprise',year:2016,status:'省本级数排除',note:'原披露中缴费56.57万人、享受待遇39.6万人是省本级；不填入全省连续训练表。该段不是湖南全省企业缴费/领取人数。',source:'https://rst.hunan.gov.cn/rst/xxgk/zfxxgknb/201708/t20170810_4387914.html',section:'一、2016年度省本级企业养老，参保及待遇'},
 {province:'HN',system:'enterprise',year:2025,status:'全省原数再次核对',note:'2025全省企业缴费人数719.49万人、机关缴费人数173.91万人与现有台账一致。未将参保人数替代实缴；未将人社基金总收支与财政执行序列拼接。',source:'https://rst.hunan.gov.cn/rst/xxgk/zfxxgknb/202605/t20260507_33971156.html',section:'一、二，2025企业/机关参保情况'},
 {"province": "HN", "system": "resident", "year": 2023, "status": "已核对财政结算附件：只有补助金额，不能补实缴总人数", "note": "2026-10-20核查湘财预〔2024〕165号附件1：县市区/单位、金额（万元）、备注；市县合计为-4403.6万元，是补助结算差额，不是缴费人数或当年保费。表内未取得全省实缴总人数，不按补助单价倒推。原Excel及转录保存在APP evidence/v38，2016—2025缺项未改。", "source": "https://czt.hunan.gov.cn/czt/c102901/202408/t20240816_33712345.html", "section": "附件1，工作表1 A2/A4/C4/C6；Excel原件", "local": null},
 {"province": "HN", "system": "resident", "year": 2025, "status": "经办机构部门决算不是养老保险基金决算", "note": "2026-10-20核查省城乡居保中心2025部门决算：披露机构运行、培训等经费，正文未给全省居民实际缴费人数。不能把部门支出、培训人数当养老金支出或参保缴费人数；继续保留实际人数缺项。", "source": "https://rst.hunan.gov.cn/rst/xxgk/czxx/ysgk/202608/t20260825_34050151.html", "section": "部门决算正文第三部分及绩效说明"},
 {"province": "HN", "system": "resident", "year": 2020, "status": "税务访谈有新增数，没有可用总数", "note": "2021年2月税务访谈称2020较2019城乡居民养老新增参保缴费87万人。这是增量，基期总实缴数及同口径连续序列未取得，不能当2020总人数，也不能向2025外推。原实缴字段仍缺。", "source": "https://searchs.hunan.gov.cn/hnszf/hdjl/zxft/lbqddhn/202102/t20210204_14398427.html", "section": "城乡居民两险参保缴费访谈段"},
 {"province": "HN", "system": "resident", "year": 2024, "status": "多档缴费、代缴和补缴机制明确，具体金额贡献仍未拆分", "note": "省级政策自2024年起调整普通缴费档次，规定困难群体代缴、一次性补缴及不同补贴标准。能确认这些机制存在，不能据此量化2025收入增加有多少来自补缴或提档；不能用缴费总收入除以最低档300元还原人数，也不能保证基年收入长期重复。", "source": "https://rst.hunan.gov.cn/rst/xxgk/zcfg/zxzc/202312/t20231229_32614856.html", "section": "湘人社规〔2023〕22号，一（一）—（五）及执行时间"}
];
function rxReadiness(prov,key){
 const rows=Array.from({length:10},(_,i)=>pbRow(prov,key,2016+i)),latest=rows[9],v=pbNumbers(latest),h=rxHoldout(prov,key,'fixed'),fields=['payers','recipients','fee','benefit'];
 return {prov,key,rows,latest,fields,counts:Object.fromEntries(fields.map(k=>[k,rows.filter(r=>rxFinite(r[k])).length])),peopleKnown:v.ratio!==null,amountKnown:v.coverage!==null,trainReady:!!h.fits.fee&&!!h.fits.benefit,missingTraining:fields.map(k=>({field:k,years:rows.slice(0,4).filter(r=>!rxFinite(r[k])||r[k]<=0).map(r=>r.year)})).filter(r=>r.years.length)};
}
function rxReadinessPage(){
 const key=pensionKey(),labels={payers:'缴费人数',recipients:'领取人数',fee:'缴费收入',benefit:'待遇支出'};
 return `<section class="rx-section" id="rxReadiness"><div class="section-head"><div><small>2016—2025 · ${PH_NAMES[key]} · 原数据与缺项</small><h2>哪些判断有数据，哪些暂时不能下结论？</h2><p class="hint">2026-10-20续查：本轮新增可用的湖南居民全省全年实缴人数为0个年份，2016—2025仍未取得；财政结算、经办部门决算及税务增量的排除理由可展开查看。“未取得”不代表断言从未公布。</p></div><button data-rx-export="true">导出证据覆盖与排除原因</button></div><div class="rx-pair">${['GD','HN'].map(prov=>{const r=rxReadiness(prov,key);return `<article class="rx-holdout" data-readiness="${prov}"><h3>${PENSION.provinces[prov].name}</h3><p class="rx-lead">2025实际资金覆盖：${r.amountKnown?'可核对缴费收入与待遇支出':'金额缺项，暂不可算'}；实际人数对照：${r.peopleKnown?'有数可算，仍需注意人数定义':'缺项，暂不可算'}。</p><p>固定2016—2019训练、2020—2025留出：${r.trainReady?'训练字段齐备；验证误差另列，不代表未来已获保证':'未满足连续同口径训练门槛，不指定整体最优情景'}。</p><div class="rx-facts">${r.fields.map(k=>`<div><span>${labels[k]}已接入数值年份</span><b>${r.counts[k]}／10</b></div>`).join('')}</div>${r.missingTraining.length?`<p><b>训练缺项：</b>${r.missingTraining.map(v=>labels[v.field]+'：'+v.years.join('、')).join('；')}。这些年不插值、不用参保数反推。</p>`:''}<details><summary>展开逐年四项覆盖和原数来源</summary><div class="rx-table"><table><thead><tr><th>年份</th>${r.fields.map(k=>`<th>${labels[k]}<small>${['payers','recipients'].includes(k)?'万人':'亿元'}</small></th>`).join('')}<th>来源</th></tr></thead><tbody>${r.rows.map(v=>`<tr><th>${v.year}</th>${r.fields.map(k=>`<td style="background:${rxFinite(v[k])?'#edf4fa':'#fff3e4'}">${rxFinite(v[k])?rxNum(v[k],2):'未取得'}</td>`).join('')}<td>${pbSources(v)}</td></tr>`).join('')}</tbody></table></div></details></article>`;}).join('')}</div><p class="hint">已接入不等于十年完全同质；职工合计含企业与机关同表相加，非额外独立样本。广东居民为16—59岁参保缴费口径；人数为年末快照，不能当全年缴费人年。金额可算不代表已知道全部资金安排，未来最终缺口仍未知。</p><details><summary>本轮核查：为什么有数字却没有填进缺项？</summary>${RX_RECHECKS.map(v=>`<article class="source-entry"><h3>${v.year} · ${PENSION.provinces[v.province].name} · ${PH_NAMES[v.system]}：${esc(v.status)}</h3><p>${esc(v.note)}</p>${rxLink(v.source,v.section)}${v.local?`；<a href="${esc(v.local)}" download>下载已核对的财政原表（仅金额）</a>`:''}</article>`).join('')}</details></section>`;
}
function rxReadinessRows(){
 const rows=[];for(const prov of ['GD','HN']){const d=rxReadiness(prov,pensionKey());for(const r of d.rows)for(const k of d.fields)rows.push(['历史证据覆盖',prov,PH_NAMES[pensionKey()],r.year,k,rxFinite(r[k])?r[k]:'未取得',['payers','recipients'].includes(k)?'万人':'亿元',r.note||'缺项不填0',[r.flowSource,r.countSource,r.recipientSource].filter(Boolean).map(k=>PENSION_HISTORY.sources[k]?.url).filter(Boolean).join(' ; ')]);}
 for(const v of RX_RECHECKS)rows.push(['本轮原文核查',v.province,PH_NAMES[v.system],v.year,v.status,'不补造人数','说明',v.note,v.source+'；'+v.section]);return rows;
}
// Additive experiments: audited population arrays and pension defaults stay intact.
let rxActualYear=2025;
const RX_SCHEMA='yuejian-study/1',RX_STORE='yuejian-public-studies-v45';
const rxFinite=Number.isFinite;
const rxNum=(v,d=1)=>rxFinite(v)?n(v,d):'未取得';
const rxLink=(url,label)=>url?`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`:'来源未取得';
function rxActual(id){
 if(id==='ALL')return rxActual(province().modelId);
 if(id==='PRD'){
  const rs=cities().map(c=>rxActual(c.id)),complete=rs.every(v=>rxFinite(v.b));
  return {id,name:province().scope+'合计',province:S.province,a:sum(rs.map(v=>v.a)),b:complete?sum(rs.map(v=>v.b)):null,source2020:rs[0].source2020,source2025:null,sources2025:rs.map(v=>v.source2025).filter(Boolean),weak:rs.some(v=>v.weak)};
 }
 const c=REGISTRY.cities.find(c=>c.id===id),p=Object.values(REGISTRY.provinces).find(p=>p.modelId===id);
 if(c)return {id,name:c.name,province:c.province,a:c.actual2020,b:RESEARCH_ACTUAL.records[id]?.population??c.actual2025??null,source2020:c.province==='GD'?REGISTRY.provinces.GD.actualSource:c.province==='GX'?REGISTRY.sources.gxcensus.url:REGISTRY.sources.hnpop.url,source2025:RESEARCH_ACTUAL.records[id]?.source||REGISTRY.sources[c.actual2025Source]?.url||null,weak:c.province==='GD'&&c.id==='Zhaoqing'};
 if(p)return {id,name:p.name+'全省',province:p.code==='440000'?'GD':p.code==='430000'?'HN':'GX',a:p.actual2020,b:p.actual2025??null,source2020:p.actualSource||REGISTRY.sources.hnpop.url,source2025:REGISTRY.sources[p.source]?.url||null,weak:false};
 return null;
}
function rxCalibration(id,f=S.f,m=S.m){
 const a=rxActual(id);if(!a)return null;
 const observed=RESEARCH_ACTUAL.records[id];if(observed){a.b=observed.population;a.source2025=observed.source;}
 const raw2020=ages(id,2020,f,m),raw2025=ages(id,2025,f,m),base=raw2020?sum(raw2020):null,factor=a.a>0&&base>0?a.a/base:null;
 const raw=raw2025?sum(raw2025):null,anchored=factor!==null&&raw!==null?raw*factor:null;
 const error=value=>a.b>0&&value!==null?(value/a.b-1)*100:null;
 return {...a,f,m,factor,raw2020:base,raw2025:raw,anchored2025:anchored,rawError:error(raw),anchoredError:error(anchored),stages:YEARS.map(y=>{const z=stats(id,y,f,m);return {year:y,raw:z.total,anchored:factor===null?null:z.total*factor,oldShare:z.senior/z.total*100};})};
}
function rxPopRows(){return [];}
function rxCalibrationPage(){if(gxFull(S.city))return gxModelValidation();if(gdFull(S.city))return gdModelPage();if(S.province==='HN'&&S.city==='ALL')return hnModelPage();
 const d=rxCalibration(S.city),all=rxPopRows(),eligible=all.filter(v=>v.rawError!==null&&!v.weak),better=eligible.filter(v=>Math.abs(v.anchoredError)<Math.abs(v.rawError)).length;
 return `<section class="rx-section" id="rxCalibration"><div class="section-head"><div><small>人口校准实验 · 2020用于锚定，2025仅检验</small><h2>修正总量起点后，偏差真的变小了吗？</h2></div><button data-rx-export="true">导出本省校准与验证</button></div><p class="rx-lead">${esc(d.name)}：${d.rawError===null?'2025同口径实际数未接入，暂不能判断是否改善。':`2025年总量误差由 ${signed(d.rawError)}% 变为 ${signed(d.anchoredError)}%，${Math.abs(d.anchoredError)<Math.abs(d.rawError)?'总量锚定后误差缩小':'总量锚定后未改善'}${d.weak?'；实际数含待原站核实转载，不作强结论':''}。`}</p><div class="rx-facts"><div><span>2020普查总人口</span><b>${rxNum(d.a/1e4)}万人</b></div><div><span>2020原研究总人口</span><b>${rxNum(d.raw2020/1e4)}万人</b></div><div><span>总量锚定系数</span><b>${rxNum(d.factor,4)}倍</b></div></div><p>锚定结果＝原情景各年人数 ×（2020普查总量 ÷ 原情景2020总量）。2025实际数没有进入系数；年龄比例完全不变，不能据此认为年龄结构已校准。</p><div class="rx-table"><table><thead><tr><th>${esc(d.name)} · 万人</th><th>2026</th><th>2036</th><th>2046</th><th>2056</th></tr></thead><tbody><tr><th>原研究情景</th>${d.stages.map(v=>`<td>${rxNum(v.raw/1e4)}</td>`).join('')}</tr><tr><th>2020总量锚定实验</th>${d.stages.map(v=>`<td>${rxNum(v.anchored===null?null:v.anchored/1e4)}</td>`).join('')}</tr><tr><th>60+占比（两者相同）</th>${d.stages.map(v=>`<td>${rxNum(v.oldShare)}%</td>`).join('')}</tr></tbody></table></div>${S.province==='HN'?'<p class="hint">2025年14市州公布数合计6492.08万人，全省公布6492万人，相差800人。保留各来源公布精度，不强行调平；差异成因未进一步核实，不能解释为迁移量。新增实际总量用于本核验表，原版本偏差记录保留原有核验范围。</p>':''}<p class="hint">两种结果并列保存。总量锚定实验未自动替换主图或养老金模型；单一比例修正不能纠正迁移、生育和年龄结构。原研究本身可能使用历史期信息，这里的留出仅指本次锚定不使用2025，不冒称原研究严格样本外预测。</p><details><summary>查看本省全部城市及全省的2025检验 · 已有强度较高数据${eligible.length}项，其中${better}项改善</summary><div class="rx-table"><table><thead><tr><th>地区</th><th>2025实际·万人</th><th>原情景·万人</th><th>锚定实验·万人</th><th>原误差</th><th>锚定误差</th><th>证据</th></tr></thead><tbody>${all.map(v=>`<tr><th>${esc(v.name)}</th><td>${rxNum(v.b===null?null:v.b/1e4)}</td><td>${rxNum(v.raw2025/1e4)}</td><td>${rxNum(v.anchored2025===null?null:v.anchored2025/1e4)}</td><td>${v.rawError===null?'未计算':signed(v.rawError)+'%'}</td><td>${v.anchoredError===null?'未计算':signed(v.anchoredError)+'%'}</td><td>${rxLink(v.source2020,'2020普查')}；${v.sources2025?.length?v.sources2025.map((url,i)=>rxLink(url,'城市来源'+(i+1))).join('；'):rxLink(v.source2025,v.weak?'2025转载·待原站核实':'2025实际')}</td></tr>`).join('')}</tbody></table></div><p>误差＝（情景－实际）÷实际。全省与覆盖城市不能当作独立样本统计精度；“改善项数”仅为清单描述。未接入的市州2025实际继续标缺，不按省级人口分摊。</p></details></section>`;
}

// Freeze 2016–2019 before reading any holdout observations. Missing input blocks its end.
function rxHoldout(prov,key,id='fixed'){
 const rs=phRecords(prov,key),train=[2016,2017,2018,2019].map(y=>rs.find(r=>r.year===y)),a=train[0],b=train[3],preset=PENSION_PRESETS[id];
 const comparable=r=>r&&r.scope==='全省'&&r.series&&r.series===a?.series;
 const fits={};
 for(const [amount,count]of [['fee','payers'],['benefit','recipients']]){
  const valid=train.every(r=>comparable(r)&&rxFinite(r[count])&&r[count]>0&&rxFinite(r[amount])&&r[amount]>0);
  fits[amount]=valid?{count,countRate:(b[count]/a[count])**(1/3)-1,baseCount:b[count],baseAmount:b[amount]}:null;
 }
 const rows=Array.from({length:6},(_,i)=>2020+i).map(y=>{
  const actual=rs.find(r=>r.year===y),t=y-2019,out={year:y,actual:actual||null,impact:phIntervalImpact(prov,key,y-1,y)};
  for(const [amount,g]of [['fee',preset.feeGrowth],['benefit',preset.benefitGrowth]]){
   const fit=fits[amount];if(!fit){out[amount]=null;continue;}
   const predictedCount=fit.baseCount*(1+fit.countRate)**t,predicted=fit.baseAmount*(1+fit.countRate)**t*(1+g/100)**t;
   const countActual=comparable(actual)&&rxFinite(actual[fit.count])?actual[fit.count]:null,amountActual=comparable(actual)&&rxFinite(actual[amount])?actual[amount]:null;
   out[amount]={predictedCount,predicted,actualCount:countActual,actual:amountActual,countAPE:countActual>0?Math.abs(predictedCount/countActual-1)*100:null,ape:amountActual>0?Math.abs(predicted/amountActual-1)*100:null,error:amountActual===null?null:predicted-amountActual};
  }return out;
 });
 const avg=values=>values.length?sum(values)/values.length:null,scores={};
 for(const amount of ['fee','benefit']){const vv=rows.map(r=>r[amount]?.ape).filter(rxFinite),cc=rows.map(r=>r[amount]?.countAPE).filter(rxFinite);scores[amount]={n:vv.length,mape:avg(vv),countN:cc.length,countMAPE:avg(cc)};}
 const joint=rows.filter(r=>rxFinite(r.fee?.ape)&&rxFinite(r.benefit?.ape));
 return {prov,key,id,fits,rows,scores,jointN:joint.length,jointMAPE:avg(joint.map(r=>(r.fee.ape+r.benefit.ape)/2)),trainSources:train.filter(Boolean).map(r=>({year:r.year,flow:r.flowSource,count:r.countSource,recipient:r.recipientSource||null}))};
}
function rxHoldoutPage(...args){return dnMark(dnRaw_rxHoldoutPage(...args),"mixed","历史实际值与回测模拟值分列；误差为计算结果，不能视为未来准确率。",{charts:true,tables:true,block:true});}
function dnRaw_rxHoldoutPage(){
 const key=pensionKey(),cards=['GD','HN'].map(prov=>{
  const ds=Object.keys(PENSION_PRESETS).map(id=>rxHoldout(prov,key,id)),good=ds.filter(d=>d.jointN>=2).sort((a,b)=>a.jointMAPE-b.jointMAPE),best=good.length?good.filter(d=>Math.abs(d.jointMAPE-good[0].jointMAPE)<1e-8):[],current=ds.find(d=>d.id===pbPreset)||ds[0];
  return `<article class="rx-holdout" data-rx-province="${prov}"><h3>${PENSION.provinces[prov].name} · ${PH_NAMES[key]}</h3><p class="rx-lead">${best.length===1?`${PENSION_PRESETS[best[0].id].name}在固定2019起点的${best[0].jointN}个留出年份中金额平均偏差较小：${rxNum(best[0].jointMAPE,2)}%。`:'共同有效留出年份不足，或最小值并列，不指定唯一参照。'}</p><p>缴费人数训练年化：${current.fits.fee?signed(current.fits.fee.countRate*100,2)+'%':'缺连续实缴数据，未拟合'}；领取人数训练年化：${current.fits.benefit?signed(current.fits.benefit.countRate*100,2)+'%':'缺连续领取数据，未拟合'}。</p><div class="rx-table"><table><thead><tr><th>预设</th><th>缴费金额MAPE／年数</th><th>待遇金额MAPE／年数</th><th>双端平均MAPE／共同年数</th></tr></thead><tbody>${ds.map(d=>`<tr><th>${PENSION_PRESETS[d.id].name}</th>${['fee','benefit'].map(k=>`<td>${rxNum(d.scores[k].mape,2)}${d.scores[k].mape===null?'':'%'}／${d.scores[k].n}</td>`).join('')}<td>${rxNum(d.jointMAPE,2)}${d.jointMAPE===null?'':'%'}／${d.jointN}</td></tr>`).join('')}</tbody></table></div><details><summary>逐年预测人数、金额、实际与偏差 · ${PENSION_PRESETS[current.id].name}</summary><p>下表预设跟随“历史条件回测”的回测预设，不改未来参数。</p><div class="rx-table"><table><thead><tr><th>验证年</th><th>缴费人数预测／实际·万人</th><th>领取人数预测／实际·万人</th><th>缴费预测／实际·亿元</th><th>待遇预测／实际·亿元</th></tr></thead><tbody>${current.rows.map(r=>`<tr><th>${r.year}</th><td>${rxNum(r.fee?.predictedCount)}／${rxNum(r.fee?.actualCount)}</td><td>${rxNum(r.benefit?.predictedCount)}／${rxNum(r.benefit?.actualCount)}</td><td>${rxNum(r.fee?.predicted)}／${rxNum(r.fee?.actual)}</td><td>${rxNum(r.benefit?.predicted)}／${rxNum(r.benefit?.actual)}</td></tr><tr><td colspan="5">${esc(r.impact)}；${r.actual?pbSources(r.actual):'未取得实际数'}</td></tr>`).join('')}</tbody></table></div><p>人数预测MAPE：缴费${rxNum(current.scores.fee.countMAPE,2)}${current.scores.fee.countMAPE===null?'':'%'}，领取${rxNum(current.scores.benefit.countMAPE,2)}${current.scores.benefit.countMAPE===null?'':'%'}；缺失项不参与平均。</p><p>训练来源：${current.trainSources.map(r=>`${r.year} ${phSrc(r.flow)}；${phSrc(r.count)}${r.recipient?'；'+phSrc(r.recipient):''}`).join(' / ')}</p></details></article>`;
 });
 return `<section class="rx-section" id="rxHoldout"><div class="section-head"><div><small>固定训练期2016—2019 · 留出2020—2025</small><h2>不给模型看目标年人数，它还能算准吗？</h2></div><button data-rx-export="true">导出验证证据</button></div><p>本检验与旧的“给定目标年实际人数”的条件回测分开。只用2016和2019端点拟合人数年增长，并要求2016—2019四年同财务序列、同范围连续正值齐备；逐年从2019起点外推人数，再乘三种预先固定的人均金额假设。验证期实际人数只评分，不输入预测。</p><div class="rx-pair">${cards.join('')}</div><p class="hint">这是固定规则的留出检验，不是专业退休精算，也不是历史时点可获取数据版本的实时回测。现有历史台账可能含后续修订；2020减免、补缴、清算和制度变化不剔除。选出误差较小预设使用了验证结果，未来仍需新的未参与选择的数据验证，不自动替换四阶段默认情景。</p></section>`;
}

function rxValidationSummary(){
 const key=pensionKey();return `<section class="rx-section rx-validation-summary"><h2>先核查：把人数也留给模型预测，结论会变吗？</h2><div class="rx-pair">${['GD','HN'].map(prov=>{
  const ds=Object.keys(PENSION_PRESETS).map(id=>rxHoldout(prov,key,id)).filter(d=>d.jointN>=2).sort((a,b)=>a.jointMAPE-b.jointMAPE),best=ds.length?ds.filter(d=>Math.abs(d.jointMAPE-ds[0].jointMAPE)<1e-8):[],old=['employee','resident'].includes(key)?reviewedHistory(prov,key).conditionalReference:null;
  return `<article><h3>${PENSION.provinces[prov].name} · ${PH_NAMES[key]}</h3><p>${best.length===1?`固定2016—2019训练、2020—2025留出：${PENSION_PRESETS[best[0].id].name}金额偏差较小，双端MAPE ${rxNum(best[0].jointMAPE,2)}%。${old&&old!==best[0].id?'与旧条件回测参照不同，两种检验的人数处理及预测跨度不同，排序不一致；不能指定唯一未来参照。':'仍不能据此指定未来最可能情景。'}`:'连续实际人数和金额训练条件不足，或误差最小并列；完整留出检验不指定唯一参照。'}</p></article>`;
 }).join('')}</div><p class="hint">旧条件回测给定目标年实际人数；新检验只用2019及以前记录拟合人数，并从固定起点外推。检验规则不同，误差不宜直接比大小。均不能证明未来可持续性，四阶段仍是压力实验。</p><button data-ux-open="fund-holdout">查看训练数据、逐年预测和偏差 ↓</button></section>`;
}

function rxPeoplePage(){return qaPeoplePage();}

function rxBridgeData(prov=S.province,key=pensionKey(),year=S.year,cfg=pensionConfig(prov,key)){
 const d=pensionModel(prov,key,year,cfg),items=[['缴费',d.fee],['财政',d.fiscal],['投资',d.investment],['其他收入',d.other],['待遇',-d.benefit],['其他支出',-d.otherOut]];
 return {d,items,balance:sum(items.map(v=>v[1]))};
}
function rxWaterfall(...args){return dnMark(dnRaw_rxWaterfall(...args),"future","各项为当前情景资金路径；补充资金并非已承诺拨款，最终缺口未知。",{charts:true});}
function dnRaw_rxWaterfall(data){
 let at=0;const items=data.items.map(([label,delta])=>{const start=at;at+=delta;return {label,delta,start,end:at};});items.push({label:'列示收支差',delta:at,start:0,end:at,total:true});
 const low=Math.min(0,...items.map(v=>Math.min(v.start,v.end))),high=Math.max(1,...items.map(v=>Math.max(v.start,v.end))),range=high-low||1,y=v=>190-(v-low)/range*150;
 return `<svg class="rx-waterfall" viewBox="0 0 840 245" role="img" aria-label="缴费、财政、投资与其他收入，扣除待遇与其他支出后的年度收支差，单位亿元"><text x="8" y="15">亿元／年 · ${data.d.year}压力实验</text><line x1="10" x2="830" y1="${y(0)}" y2="${y(0)}" stroke="#b5c1d0"/>${items.map((v,i)=>{const x=15+i*117,top=y(Math.max(v.start,v.end)),height=Math.abs(y(v.start)-y(v.end));return `<rect x="${x}" y="${top}" width="93" height="${Math.max(height,.8)}" fill="${v.total?'#31445e':v.delta>=0?'#2b63a1':'#c58249'}"><title>${v.label} ${rxNum(v.delta,2)}亿元；累计${rxNum(v.end,2)}亿元</title></rect><text x="${x+46}" y="${Math.max(30,top-7)}" text-anchor="middle">${rxNum(v.delta,1)}</text><text x="${x+46}" y="220" text-anchor="middle">${v.label}</text>`;}).join('')}</svg>`;
}
function rxDecomposition(prov,key,start,end,cfg=pensionConfig(prov,key),f=S.f,m=S.m){
 const a=pensionModel(prov,key,start,cfg,f,m),b=pensionModel(prov,key,end,cfg,f,m),base=pensionBase(prov,key),t=start-pensionClock(prov),u=end-pensionClock(prov);
 const split=(amount,age0,age1,cg,ug)=>{const c0=(1+cg/100)**t,c1=(1+cg/100)**u,p0=(1+ug/100)**t,p1=(1+ug/100)**u;return [amount*(age1-age0)*c0*p0,amount*age1*(c1-c0)*p0,amount*age1*c1*(p1-p0)];};
 const fee=split(base.fee,a.W,b.W,cfg.payerGrowth,cfg.feeGrowth),benefit=split(base.benefit,a.O,b.O,cfg.recipientGrowth,cfg.benefitGrowth);
 const parts=[['年龄基数变化',benefit[0]-fee[0]],['覆盖系数假设',benefit[1]-fee[1]],['人均金额假设',benefit[2]-fee[2]],['其他基金支出',b.otherOut-a.otherOut],['财政、投资及其他收入路径',-(b.fiscal+b.investment+b.other-a.fiscal-a.investment-a.other)]];
 return {start,end,parts,change:(b.outflow-b.listed)-(a.outflow-a.listed),residual:(b.outflow-b.listed)-(a.outflow-a.listed)-sum(parts.map(p=>p[1]))};
}
function rxFundingPage(...args){return dnMark(dnRaw_rxFundingPage(...args),"future","本节覆盖率、补充资金和每十年压力贡献均为情景模拟，最终缺口未知。",{charts:true,tables:true,block:true});}
function dnRaw_rxFundingPage(){
 const prov=S.province,key=pensionKey(),cfg=pensionConfig(),data=rxBridgeData(),d=data.d,parts=YEARS.slice(1).map((y,i)=>rxDecomposition(prov,key,YEARS[i],y,cfg));
 const drivers=parts.map(v=>{const p=[...v.parts].sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0];return `${v.start}—${v.end}：列示后待平衡原值变化${signed(v.change)}亿元，绝对贡献最大为${p[0]}（${signed(p[1])}亿元）`;});
 return `<section class="rx-section" id="rxFunding"><div class="section-head"><div><small>${province().name}全省 · ${pensionBase().name} · ${S.year}</small><h2>缴费差多少，列示的补充从哪里来？</h2></div><button data-rx-export="true">导出资金桥梁与十年分解</button></div><p class="rx-lead">缴费覆盖待遇 ${rxNum(d.benefitCoverage)}%（${d.benefitCoverage>=100?'足够':'不足'}）；覆盖基金总支出 ${rxNum(d.coverage)}%（${d.coverage>=100?'足够':'不足'}）。${d.nonFeeNeed>0?'需非缴费补充'+rxNum(d.nonFeeNeed)+'亿元／年。':'缴费相对总支出有余量'+rxNum(d.feeMargin)+'亿元／年。'}</p>${rxWaterfall(data)}<p>财政 ${rxNum(d.fiscal)} ＋ 投资 ${rxNum(d.investment)} ＋ 未细分其他收入 ${rxNum(d.other)} 亿元／年，${d.listedMargin>=0?'列示后年度余量':'列示后待平衡'} ${rxNum(Math.abs(d.listedMargin))} 亿元／年。${d.extra===null?'额外补充未设置。':`另设额外补充${rxNum(d.extra)}亿元／年，计入后待平衡${rxNum(d.afterExtra)}亿元／年。`}最终资金缺口仍未知。</p><p class="hint">收入路径是基年与增长假设，不是未来财政拨款承诺。其他收入为残差，不等于已核实全国统筹净调入。图中正负收支差为当年流量，不是可用累计结余；不据此推出耗尽年份。${key==='resident'?'居民基础养老金有财政责任，不能将个人缴费不能覆盖全部待遇简单称为制度失效。':''}</p><div class="rx-table"><table data-rx-funding><thead><tr><th>年度 · 亿元／年</th><th>缴费</th><th>待遇</th><th>基金总支出</th><th>财政＋投资＋其他</th><th>列示后待平衡</th><th>最终缺口</th></tr></thead><tbody>${YEARS.map(y=>{const v=pensionModel(prov,key,y,cfg);return `<tr><th>${y} · 假设</th><td>${rxNum(v.fee)}</td><td>${rxNum(v.benefit)}</td><td>${rxNum(v.outflow)}</td><td>${rxNum(v.fiscal+v.investment+v.other)}</td><td>${rxNum(v.afterListed)}</td><td>未知</td></tr>`;}).join('')}</tbody></table></div><h3>每十年，压力为什么变化？</h3><p>${drivers.join('；')}。</p><details><summary>展开变化分解 · 加总可回到原模型</summary><div class="rx-table"><table><thead><tr><th>贡献 · 亿元／年之差</th>${parts.map(v=>`<th>${v.start}—${v.end}</th>`).join('')}</tr></thead><tbody>${parts[0].parts.map(([label],i)=>`<tr><th>${label}</th>${parts.map(v=>`<td>${signed(v.parts[i][1])}</td>`).join('')}</tr>`).join('')}<tr><th>待平衡原值变化合计</th>${parts.map(v=>`<td>${signed(v.change)}</td>`).join('')}</tr></tbody></table></div><p>原值＝基金总支出－全部列示收入，可为负；正贡献表示压力增加，负贡献表示减压。采用“先年龄、再覆盖、再单价”的顺序分解，交互影响分配随顺序改变。额外补充另列，不参与本表。它解释模型计算关系，不能识别现实因果；就业变化、补缴、减免和退休制度作用仍缺独立证据。</p></details></section>`;
}

function rxExportRows(){return dnExport(dnRaw_rxExportRows());}
function dnRaw_rxExportRows(){if(S.province==='GX')return gxResearchRows();
 const rows=[['模块','省份','地区或制度','年份或区间','指标','值','单位','性质与限制','来源']];
 for(const v of rxPopRows()){
  const note='仅2020总量锚定；2025未用于系数；年龄比例未校准；不替换主图；生育'+S.f+'／迁移'+S.m;
  for(const [k,val,unit]of [['2020实际',v.a,'人'],['2020原模型',v.raw2020,'人'],['锚定系数',v.factor,'倍'],['2025实际',v.b,'人'],['2025原模型',v.raw2025,'人'],['2025锚定',v.anchored2025,'人'],['原误差',v.rawError,'%'],['锚定误差',v.anchoredError,'%']])rows.push(['人口校准',S.province,v.name,k.includes('2020')||k==='锚定系数'?2020:2025,k,val===null?'未取得':val,unit,note+(v.weak?'；2025转载待核':''),[REGISTRY.sources.paper.url,v.source2020,v.source2025,...(v.sources2025||[])].filter(Boolean).join(' ; ')]);
  for(const z of v.stages)for(const k of ['raw','anchored','oldShare'])rows.push(['人口校准',S.province,v.name,z.year,k,z[k]===null?'未取得':z[k],k==='oldShare'?'%':'人',note,REGISTRY.sources.paper.url+' ; '+v.source2020]);
 }
 for(const prov of ['GD','HN'])for(const id of Object.keys(PENSION_PRESETS)){
  const h=rxHoldout(prov,pensionKey(),id),src=h.trainSources.flatMap(v=>[v.flow,v.count,v.recipient]).filter(Boolean).map(k=>PENSION_HISTORY.sources[k]?.url).filter(Boolean).join(' ; ');
  for(const r of h.rows)for(const k of ['fee','benefit'])for(const field of ['predictedCount','actualCount','predicted','actual','error','ape'])rows.push(['固定训练留出验证',prov,PH_NAMES[pensionKey()],r.year,id+'_'+k+'_'+field,rxFinite(r[k]?.[field])?r[k][field]:'未计算',field.includes('Count')?'万人':field==='ape'?'%':'亿元','固定2016—2019训练；2020—2025只评分；'+r.impact,src+' ; '+(r.actual?[r.actual.flowSource,r.actual.countSource,r.actual.recipientSource].filter(Boolean).map(k=>PENSION_HISTORY.sources[k]?.url).filter(Boolean).join(' ; '):'')]);
 }
 const prov=S.province,key=pensionKey(),src=pensionBase().sources.map(k=>PENSION.sources[k].url).join(' ; ')+' ; '+pensionPopulationSource(prov),config=JSON.stringify(pensionConfig())+'；生育'+S.f+'／迁移'+S.m;
 const actual=pbRow(prov,key,pbYear);for(const field of ['payers','recipients','fee','benefit'])rows.push(['人数实际证据',prov,PH_NAMES[key],pbYear,field,rxFinite(actual[field])?actual[field]:'未取得',['payers','recipients'].includes(field)?'万人':'亿元',actual.note,[actual.flowSource,actual.countSource,actual.recipientSource].filter(Boolean).map(k=>PENSION_HISTORY.sources[k]?.url).filter(Boolean).join(' ; ')]);
 for(const y of YEARS){const b=rxBridgeData(prov,key,y);for(const [label,value]of [...b.items,['列示收支差',b.balance],['最终资金缺口',null]])rows.push(['资金桥梁',prov,PH_NAMES[key],y,label,value===null?'未知':value,'亿元／年','压力实验；'+config,src]);}
 for(let i=0;i<3;i++){const d=rxDecomposition(prov,key,YEARS[i],YEARS[i+1]);for(const [label,value]of [...d.parts,['变化合计',d.change],['加总残差',d.residual]])rows.push(['压力分解',prov,PH_NAMES[key],d.start+'—'+d.end,label,value,'亿元／年之差','顺序分解非现实因果；不含额外补充；'+config,src]);}
 return [...rows,...rxReadinessRows(),...qaRows()];
}

function rxBundle(){
 return {dataNature:{population:'未来情景模拟；各记录带性质',pension:'未来情景模拟；实际基年见登记与资金证据',fineAgeInput:'2025细年龄为重建估计',unknown:'未知不按零'},population:['Guangdong','Hunan','Guangxi'].flatMap(id=>YEARS.map(y=>{const d=stats(id,y);return {id,year:y,dataNature:'未来情景模拟',inputNature:['Guangdong','Hunan','Guangxi'].includes(id)?'2025实际边际约束的细年龄重建':'市州旧研究，未完成最新校准',total:d.total,bands:d.bands,old:d.old,oldest:d.oldest};})),pension:['GD','HN'].flatMap(prov=>Object.keys(PH_NAMES).flatMap(key=>YEARS.map(y=>({prov,key,dataNature:'未来情景模拟',data:pensionModel(prov,key,y)})))),commonPension:['GD','HN'].flatMap(prov=>YEARS.map(y=>({prov,year:y,dataNature:'未来情景模拟',data:pensionModel(prov,pensionKey(),y,pensionConfig())}))),pageExport:uxExportForPage(),research:rxExportRows()};
}
function rxCapture(name='研究方案'){
 return {schema:RX_SCHEMA,app:'人口与养老金V45-public',name:String(name).slice(0,60),created:new Date().toISOString(),fingerprint:RESEARCH_MANIFEST.fingerprint,manifest:RESEARCH_MANIFEST.files,state:{S:{...S},UX:{line:UX.line,level:UX.level,left:UX.left,right:UX.right,open:[...UX.open]},cityMemory:{...cityMemory},pensionSystem,pensionEmployee,pensionDrafts:Object.fromEntries(['GD','HN'].flatMap(p=>Object.keys(PH_NAMES).map(k=>[p+'/'+k,pensionConfig(p,k)]))),rxActualYear:pbYear,pbYear,pbPreset,pbWindow,reviewedPreset,reviewedSystem,sensitivityPreset,pensionHistorySystem},results:rxBundle()};
}
function rxValidate(doc){
 if(!doc||doc.schema!==RX_SCHEMA||doc.app!=='人口与养老金V45-public'||doc.fingerprint!==RESEARCH_MANIFEST.fingerprint)throw Error('方案版本或数据／模型指纹不一致，未恢复；请使用同版APP。');
 const scan=(o,depth=0)=>{if(depth>30)throw Error('文件层级过深');if(o&&typeof o==='object')for(const k of Object.keys(o)){if(['__proto__','constructor','prototype'].includes(k))throw Error('方案含不允许的字段');scan(o[k],depth+1);}};scan(doc);
 if(typeof doc.name!=='string'||doc.name.length>60||!doc.state||!doc.results)throw Error('方案内容不完整');
 const st=doc.state,s=st.S,u=st.UX,check=(ok,msg)=>{if(!ok)throw Error(msg);},one=(v,values)=>values.includes(v),num=(v,min,max)=>typeof v==='number'&&rxFinite(v)&&v>=min&&v<=max;
 check(s&&u&&one(s.province,['GD','HN','GX']),'省份无效');
 const routes=['map','population','care','compare','lab','vital','sources','services'];check(one(s.route,routes)&&one(s.year,YEARS)&&one(s.f,Object.keys(FERTILITY))&&one(s.m,Object.keys(MIGRATION)),'页面／年份／情景无效');
 check(s.city==='ALL'||s.city==='PRD'&&s.province==='GD'||REGISTRY.cities.some(c=>c.id===s.city&&c.province===s.province),'城市与省份不匹配');
 check(one(s.period,[0,1,2])&&one(s.metric,['oldPP','needDelta'])&&one(s.unit,['count','share'])&&one(s.view,['scenario','actual']),'人口视图设置无效');
 check(one(s.tab,['overview','how','money','supply','outlook'])&&one(s.how,['home','community','institution']),'辅助设置无效');
 check(typeof s.mapCode==='string'&&Object.values(REGISTRY.provinces).some(p=>p.code===s.mapCode),'地图选择无效');
 check(Number.isInteger(s.from)&&Number.isInteger(s.to)&&s.from>=1949&&s.to<=2026&&s.from<=s.to&&one(s.vitalBasis,['resident','hukou','unspecified'])&&one(s.vitalMetric,['count','rate']),'出生死亡筛选无效');
 check(typeof s.vitalRegion==='string'&&(['PROVINCE','ALL'].includes(s.vitalRegion)||REGISTRY.cities.some(c=>c.id===s.vitalRegion&&c.province===s.province)),'出生死亡地区无效');
 check(one(u.line,['population','pension'])&&u.level==='province','比较设置无效');
 const ids=u.level==='province'?['Guangdong','Hunan','Guangxi']:REGISTRY.cities.map(c=>c.id);check(ids.includes(u.left)&&ids.includes(u.right),'比较地区无效');check(Array.isArray(u.open)&&u.open.length<=40&&u.open.every(v=>typeof v==='string'&&v.length<80),'展开状态无效');
 check(st.cityMemory&&['GD','HN'].every(p=>st.cityMemory[p]==='ALL'||p==='GD'&&st.cityMemory[p]==='PRD'||REGISTRY.cities.some(c=>c.id===st.cityMemory[p]&&c.province===p)),'城市记忆无效');
 check(one(st.pensionSystem,['employee','resident'])&&one(st.pensionEmployee,['employee','enterprise','government']),'养老金制度无效');
 for(const p of ['GD','HN'])for(const key of Object.keys(PH_NAMES)){
  const cfg=st.pensionDrafts?.[p+'/'+key];check(cfg&&Object.keys(cfg).length===Object.keys(PDEFAULT).length,'养老金参数不完整');
  for(const field of Object.keys(PDEFAULT)){const v=cfg[field];check(field==='extra'?v===null||num(v,0,100000):field==='payerEnd'?one(v,[59,64]):field==='recipientStart'?one(v,[60,65]):num(v,-5,10),'养老金参数超出允许范围：'+field);}
 }
 check(st.rxActualYear===st.pbYear&&[st.rxActualYear,st.pbYear].every(v=>Number.isInteger(v)&&v>=2016&&v<=2025)&&one(st.pbPreset,Object.keys(PENSION_PRESETS))&&one(st.pbWindow,['recent','all']),'历史验证设置无效');
 check(one(st.reviewedPreset,Object.keys(PENSION_PRESETS))&&one(st.sensitivityPreset,Object.keys(PENSION_PRESETS))&&one(st.reviewedSystem,['employee','resident'])&&one(st.pensionHistorySystem,Object.keys(PH_NAMES)),'核查参照设置无效');
 return st;
}
function rxAssign(st){Object.assign(S,st.S);Object.assign(UX,{...st.UX,open:new Set(st.UX.open)});Object.assign(cityMemory,st.cityMemory);for(const k of Object.keys(pensionDrafts))delete pensionDrafts[k];for(const [k,v]of Object.entries(st.pensionDrafts))pensionDrafts[k]={...v};pensionSystem=st.pensionSystem;pensionEmployee=st.pensionEmployee;rxActualYear=st.rxActualYear;pbYear=st.pbYear;pbPreset=st.pbPreset;pbWindow=st.pbWindow;reviewedPreset=st.reviewedPreset;reviewedSystem=st.reviewedSystem;sensitivityPreset=st.sensitivityPreset;pensionHistorySystem=st.pensionHistorySystem;}
function rxRestore(doc){
 const st=rxValidate(doc),before=rxCapture('恢复前');
 try{rxAssign(st);const results=rxBundle();if(JSON.stringify(results)!==JSON.stringify(doc.results))throw Error('方案结果与当前计算不一致，未恢复；文件可能被修改。');localStorage.setItem('yuejian-public-pension-v45',JSON.stringify(pensionDrafts));}
 catch(error){rxAssign(before.state);throw error;}
 location.hash=S.route;render();return true;
}
function rxSaved(){try{const list=JSON.parse(localStorage.getItem(RX_STORE)||'[]');return Array.isArray(list)?list.filter(v=>v&&v.schema===RX_SCHEMA&&typeof v.name==='string').slice(0,5):[];}catch(_){return [];}}
function rxDownload(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value)],{type:'application/json;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function rxSnapshotDialog(){
 const dlg=document.querySelector('#sourceDialog');dlg.querySelector('.dialog-head h2').textContent='研究方案 · 保存与恢复';document.querySelector('#dialogBody').innerHTML=`<section class="rx-section"><h2>保存并复现这次研究</h2><p>保存省市、四阶段、制度、生育迁移、全部养老金参数、历史验证选择、数据／引擎指纹和计算结果。恢复前逐项重算校验；照护个人预算不在本研究方案范围。</p><label>方案名称<input id="rxName" maxlength="60" value="${esc(province().name+'-'+(uxPension()?PH_NAMES[pensionKey()]:'人口')+'-'+S.year)}"></label><div class="rx-actions"><button id="rxSave">保存到本机</button><button id="rxDownload">导出JSON方案</button><label class="rx-file">导入同版方案<input id="rxImport" type="file" accept=".json,application/json"></label></div><p id="rxStatus" role="status"></p><h3>本机最近5个方案</h3><div id="rxSavedList">${rxSaved().map((d,i)=>`<p><b>${esc(d.name)}</b> · ${esc(d.created||'')} <button data-rx-load="${i}">恢复此方案</button></p>`).join('')||'<p>尚未保存方案。</p>'}</div><small>数据／模型指纹：${esc(RESEARCH_MANIFEST.fingerprint)}。本机保存受浏览器存储限制，重要方案请导出文件；不上传服务器。</small></section>`;if(!dlg.open)dlg.showModal();
}
function rxBindStatus(message){const el=document.querySelector('#rxStatus');if(el)el.textContent=message;else toast(message);}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 try{
  if(b.id==='sourceBtn')document.querySelector('#sourceDialog .dialog-head h2').textContent='来源、年份与覆盖范围';
  if(b.id==='rxStudies'){rxSnapshotDialog();return;}
  if(b.id==='rxSave'){const d=rxCapture(document.querySelector('#rxName')?.value||'研究方案');localStorage.setItem(RX_STORE,JSON.stringify([d,...rxSaved()].slice(0,5)));rxSnapshotDialog();rxBindStatus('已保存；含全部参数、版本和计算结果。');}
  if(b.id==='rxDownload')rxDownload(rxCapture(document.querySelector('#rxName')?.value||'研究方案'),'人口与养老金V45-公开版研究方案.json');
  if(b.dataset.rxLoad!==undefined){const doc=rxSaved()[Number(b.dataset.rxLoad)];rxRestore(doc);document.querySelector('#sourceDialog').close();toast('方案已恢复，图表、结论和导出使用同一组条件');}
  if(b.dataset.rxExport)csvDownload(rxExportRows(),province().name+'_校准_留出验证_人数与资金解释.csv');
 }catch(error){rxBindStatus('操作未完成：'+error.message);}
});
document.addEventListener('change',async e=>{
 if(e.target.id==='rxActualYear'){rxActualYear=pbYear=Number(e.target.value);render();}
 if(e.target.id==='rxImport')try{
  const file=e.target.files?.[0];if(!file)return;if(file.size>4*1024*1024)throw Error('文件超过4MB，未读取');const text=await file.text(),doc=JSON.parse(text);rxRestore(doc);document.querySelector('#sourceDialog').close();toast('方案指纹与结果校验通过，已恢复');
 }catch(error){rxBindStatus('导入失败，原研究状态保留：'+error.message);e.target.value='';}
});
