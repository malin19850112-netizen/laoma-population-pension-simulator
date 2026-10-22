'use strict';
// Nature describes how a value was obtained, separately from the strength of its evidence.
const DN_NAMES={actual:'实际统计',derived:'据实际统计计算',rebuild:'重建估计',future:'未来情景模拟',backtest:'历史回测模拟',assumption:'假设参数',mixed:'混合资料 · 逐项辨别',unknown:'缺项／暂不能判断',source:'来源与说明'};
function dnTag(kind,detail=''){return `<span class="dn-tag dn-${kind}" data-nature="${kind}">${DN_NAMES[kind]}</span>${detail?`<span class="dn-detail">${esc(detail)}</span>`:''}`;}
function dnMark(html,kind,detail='',options={}){
 if(!html)return html;
 const label=DN_NAMES[kind]+'；'+detail;
 if(options.charts)html=html.replace(/<svg\b(?![^>]*data-nature)/g,`<figure class="dn-figure"><figcaption>${dnTag(kind,detail)}</figcaption><svg data-nature="${kind}"`).replace(/<\/svg>(?!<\/figure>)/g,'</svg></figure>').replace(/<title>(?!\[)/g,`<title>[${DN_NAMES[kind]}] `);
 if(options.tables)html=html.replace(/(<table\b[^>]*>)(?!\s*<caption)/g,`$1<caption class="dn-caption">${dnTag(kind,detail)}</caption>`);
 if(options.block)html=`<div class="dn-context" aria-label="${esc(label)}">${dnTag(kind,detail)}</div>`+html;
 return html;
}
function dnFutureDetail(){return '2026、2036、2046、2056均为模拟；2025细年龄为重建输入。市级未来数据未收录。';}

function dnResearchKind(r){
 const [module,prov,scope,year,metric,value,unit,note]=r,t=String(metric),s=String(note||'');
 if(['未知','未取得','未计算','未算'].includes(String(value))||value===null)return 'unknown';
 if(module==='审查关键结论')return Object.keys(DN_NAMES).find(k=>s.startsWith(DN_NAMES[k]))||'mixed';
 if(module==='结论证据分层'){
  if(/暂不能判断/.test(s))return 'unknown';
  if(/依赖假设/.test(s))return 'future';
  if(/历史验证/.test(t))return 'backtest';
  if(/覆盖|合计|计算/.test(t+s))return 'derived';
  return /实际数据支持/.test(s)?'actual':'mixed';
 }
 if(prov==='GD'&&Number(year)===2025&&/birth/i.test(t))return 'unknown';
 if(/历史事实|历史实际/.test(module))return /natural|residual|自然增减|残差/.test(t)?'derived':'actual';
 if(/最新基线队列/.test(module))return Number(year)===2025&&/总人口|人口及流量|总量与人口平衡/.test(t)?'actual':'future';
 if(/历史留出|固定训练留出/.test(module))return /(^actual|_actual(Count)?$)/.test(t)?'actual':/APE|error|ape/.test(t)?'derived':'backtest';
 if(module==='人口校准')return /实际/.test(t)?(/转载待核/.test(s)&&String(year)==='2025'?'unknown':'actual'):/原模型|^raw$|oldShare/.test(t)?'backtest':'derived';
 if(module==='人数转换对照')return /^base(Payers|Recipients)$/.test(t)?'actual':/^base.*Age|Coefficient/.test(t)?'rebuild':'future';
 if(/资金桥梁|压力分解/.test(module))return 'future';
 if(/最新实际/.test(module)&&/^暂不能判断/.test(s))return 'unknown';
 if(/最新实际|人数实际|就业参保实际|调查实际|原数版本/.test(module))return /相加|合计|覆盖|比值/.test(t)?'derived':'actual';
 return 'mixed';
}
function dnPensionKind(year,metric,value,note){
 const t=String(metric),core=t.split('（')[0],s=String(note||'');
 if(/来源/.test(String(year)))return 'source';
 if(value===null||['未知','未取得','未计算','未取得净化后数值'].includes(String(value)))return 'unknown';
 if(t.startsWith('假设 '))return 'assumption';
 if(/_actual(Count)?(?:（|$)/.test(t))return /覆盖率/.test(t)?'derived':'actual';
 if(/_predicted(?:Count)?|固定训练|预测/.test(t))return 'backtest';
 if(/_error|_ape|假设减历史/.test(t))return 'derived';
 if(Number(year)>=2026||/2026—2056/.test(String(year)))return /未知|不指定|无法确定/.test(String(value))?'unknown':'future';
 if(/比|覆盖|折算|减待遇|年增长|误差|差额|残差/.test(core))return 'derived';
 if(/职工合计/.test(s))return 'derived';
 if(/实际|披露|执行|决算|原数/.test(s)||/（实际／原数折算/.test(t))return 'actual';
 return 'mixed';
}
function dnExportRaw(rows){
 if(!rows?.length)return rows;
 if(rows[0].includes('数据性质')){const i=rows[0].indexOf('数据性质'),e=rows[0].indexOf('证据模块');return rows.map((r,j)=>{if(!j||r[i])return r;const a=[...r];a[i]=e>=0&&r[e]?DN_NAMES[dnResearchKind(r.slice(e,e+9))]:DN_NAMES.unknown;return a;});}
 const h=rows[0],e=h.indexOf('证据模块');
 const out=rows.slice(1).map(r=>{
  let kind='mixed',detail='按本行指标与原有性质、口径和来源说明读取；不因年份较早就视为实际统计。';
  if(e>=0&&r[e]){kind=dnResearchKind(r.slice(e,e+9));detail=String(r[e+7]||'');}
  else if(h[0]==='模块'){kind=dnResearchKind(r);detail=String(r[7]||'');}
  else if(h.includes('总人口_人')){kind='future';detail=String(r[h.indexOf('性质')]||'四阶段人口均为情景模拟');}
  else if(h.includes('常住人口_人')){kind='actual';detail='2020年11月1日零时普查；比例按公报精度。';}
  else if(h.includes('出生_万人')){
   kind=!r[h.indexOf('来源')]?'unknown':r[h.indexOf('原文待核')]==='是'||r[h.indexOf('来源等级')]==='secondary'?'unknown':r[h.indexOf('原表推算')]==='是'?'derived':'actual';
   if(r.some(v=>String(v).includes('出生人数存在来源冲突')))kind='unknown';
   detail=kind==='derived'?'出生／死亡人数为来源原表公式推算，非逐人统计；出生减死亡为算术计算。':'已公布历史记录按常住／户籍等原口径列示；出生减死亡为算术计算；媒体转述及待核状态见原列。';
  }
  else if(h.includes('全省险种')){kind=dnPensionKind(r[2],r[3],r[4],r[6]);detail=String(r[6]||'');}
  else if(h.includes('起始年')&&h.includes('预设')){kind=dnPensionKind(r[3],r[6],r[7],r[4]+'；'+r[9]);detail=String(r[9]||'');}
  else if(h.includes('阶段起点'))kind=dnPensionKind(r[3],r[5],r[6],r[8]);
  else if(h.includes('实际／假设与口径'))kind=dnPensionKind(r[2],r[4],r[5],r[7]);
  else if(h.includes('性质与口径')&&h.includes('地区')){kind=r[h.indexOf('值')]==='未知'?'unknown':'future';detail=String(r[h.indexOf('性质与口径')]||'');}
  else if(h.includes('年份／区间')&&h.includes('资金来源')){kind=dnPensionKind(r[2],r[3],r[4],r[6]);detail=String(r[6]||'');}
  else if(h.includes('可信性质与边界'))kind='mixed';
  else if(h.includes('链接')||h.includes('URL')&&h.includes('来源'))kind='source';
  // Reuse the existing year, source and limitations columns; do not duplicate long notes in saved studies.
  return [...r,DN_NAMES[kind]];
 });
 return [[...h,'数据性质'],...out];
}

const RELEASE_AUDIT_NOTE="V45公开准备版 情景模拟器；未来不是官方预测，未知不按零。职工离退休登记仅为领取规模代理，详见原表口径。广东2025出生人数存在来源冲突：省政府官网2026-01-30转载统计局经济运行简况、统计局政务账号2026-02-06均写100.3万人，已核原文，非凭空倒算；2026-03-31公报PDF第2页仍写103.3万人，与死亡71.3万人、自然增加29万人不闭合。暂采用100.3万人作为模型输入，保留103.3原数及双来源，未找到官方更正，不认定冲突已解决。 本公开包不含地图素材和旧研究预测数组；市级未来未提供；来源原文附件未分发。署名：老马；非商业源码许可，商业使用须事先取得作者明确书面授权；源码按非商业许可公开。";
function dnExport(rows){const out=dnExportRaw(rows);if(!out?.length||out[0].includes("审查边界"))return out;return out.map((r,i)=>[...r,i?RELEASE_AUDIT_NOTE:"审查边界"]);}
