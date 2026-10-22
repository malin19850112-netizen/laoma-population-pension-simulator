'use strict';
// Guangxong instance of the V42 audited cohort algorithm. Five-year inputs and 2024 constraints are explicit differences; Hunan code is preserved.
const GX_FERTILITY={'1':{label:'较低生育敏感性',target:.75},'2':{label:'维持2025经验生育水平',target:1},'3':{label:'生育水平提高25%',target:1.25},'4':{label:'生育水平提高50%',target:1.5},'5':{label:'生育水平提高75%',target:1.75}};
const GX_MOVEMENT={'1':{label:'延续2025残差',annual:-195000},'2':{label:'零净调整对照',annual:0},'3':{label:'延续近五年平均残差',annual:-109800.0}};
const gxSum=a=>a.reduce((s,v)=>s+v,0),gxCount=s=>gxSum(s.male)+gxSum(s.female);
const gxClone=s=>({male:[...s.male],female:[...s.female]});
const gxTotal=s=>s.male.map((v,i)=>v+s.female[i]);
const gxMaleShare=GX_DATA.census2020.censusMaleBirths/GX_DATA.census2020.censusBirths;
const gxGroupEdges=[0,1,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,101];
function gxMortalityShape(){
 const out={male:[],female:[]},c=GX_DATA.census2020;
 for(const sex of ['male','female'])for(let i=0;i<gxGroupEdges.length-1;i++){
  const lo=gxGroupEdges[i],hi=gxGroupEdges[i+1],death=sex==='female'?c.femaleDeaths[i]:c.deaths[i]-c.femaleDeaths[i],exposure=gxSum(c[sex].slice(lo,hi));
  for(let age=lo;age<hi;age++)out[sex][age]=death/exposure;
 }return out;
}
const GX_Q_SHAPE=gxMortalityShape();
function gxQ(scale){return Object.fromEntries(['male','female'].map(s=>[s,GX_Q_SHAPE[s].map(q=>Math.min(.999,q*scale))]));}
function gxDeathTotal(s,births,q){
 return gxSum(['male','female'].map(sex=>gxSum(s[sex].map((v,a)=>v*q[sex][a]))+births*(sex==='male'?gxMaleShare:1-gxMaleShare)*q[sex][0]/2));
}
function gxFitMortality(s,births,target){
 let lo=0,hi=1;while(gxDeathTotal(s,births,gxQ(hi))<target){hi*=2;if(hi>1024)throw Error('死亡校准目标超出可行范围');}
 for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(gxDeathTotal(s,births,gxQ(mid))<target)lo=mid;else hi=mid;}
 const scale=(lo+hi)/2;return {scale,q:gxQ(scale)};
}
function gxFitFertility(s,births){
 const base=gxSum(GX_DATA.census2020.asfr2020.map((v,i)=>v/1000*s.female[i+15]));
 return GX_DATA.census2020.asfr2020.map(v=>v/1000*births/base);
}
function gxAnnualStep(s,births,q,adjustment=0,allocation='proportional'){
 const next={male:Array(101).fill(0),female:Array(101).fill(0)},deaths=gxDeathTotal(s,births,q);
 for(const sex of ['male','female']){
  next[sex][0]=births*(sex==='male'?gxMaleShare:1-gxMaleShare)*(1-q[sex][0]/2);
  for(let a=0;a<=100;a++)next[sex][Math.min(a+1,100)]+=s[sex][a]*(1-q[sex][a]);
 }
 const eligible=(sex,a)=>allocation==='young'?(a>=20&&a<50?next[sex][a]:0):next[sex][a],weight=gxSum(['male','female'].map(sex=>gxSum(next[sex].map((_,a)=>eligible(sex,a)))));
 if(adjustment<0&&-adjustment>=weight)throw Error('净调整假设超出相应年龄人口');
 for(const sex of ['male','female'])for(let a=0;a<=100;a++)next[sex][a]+=adjustment*eligible(sex,a)/weight;
 const balance=gxCount(next)-gxCount(s)-births+deaths-adjustment;
 if(Math.abs(balance)>.00001)throw Error('人口平衡未闭合');
 return {state:next,births,deaths,adjustment,balance,total:gxCount(next)};
}
function gxNormalize(s,total){const ratio=total/gxCount(s);return Object.fromEntries(['male','female'].map(sex=>[sex,s[sex].map(v=>v*ratio)]));}
function gxRake(s,a){
 const out=gxClone(s),edges=a.bandsEdges;
 for(let iter=0;iter<120;iter++){
  for(let i=0;i<a.bands.length;i++){
   const count=gxSum(['male','female'].map(sex=>gxSum(out[sex].slice(edges[i],edges[i+1])))),ratio=a.bands[i]/count;
   for(const sex of ['male','female'])for(let age=edges[i];age<edges[i+1];age++)out[sex][age]*=ratio;
  }
  for(const sex of ['male','female']){const ratio=a[sex]/gxSum(out[sex]);out[sex]=out[sex].map(v=>v*ratio);}
 }
 return out;
}
function gxReconstruct(){
 const c=GX_DATA.census2020,year2020=GX_DATA.history.find(r=>r.year===2020),start=gxNormalize({male:c.male,female:c.female},year2020.population);
 // Census is Nov 1, annual ledger Dec 31: this normalization is an explicit within-year approximation.
 let state=start,state2024=null;const ledger=[];
 for(const h of GX_DATA.history.filter(r=>r.year>2020)){
  const fit=gxFitMortality(state,h.births,h.deaths),step=gxAnnualStep(state,h.births,fit.q,h.residual);
  ledger.push({year:h.year,total:step.total,births:h.births,deaths:h.deaths,adjustment:h.residual,mortalityScale:fit.scale});state=step.state;if(h.year===2024){state=gxRake(state,GX_DATA.actual2024);state2024=gxClone(state);}
 }
 const before=gxTotal(state),raked=gxRake(state,GX_DATA.actual2025),after=gxTotal(raked),edges=GX_DATA.actual2025.bandsEdges;
 return {state:raked,state2024,ledger,marginAdjustments:GX_DATA.actual2025.bands.map((v,i)=>({lo:edges[i],hi:edges[i+1],before:gxSum(before.slice(edges[i],edges[i+1])),target:v,after:gxSum(after.slice(edges[i],edges[i+1]))}))};
}
const GX_RECONSTRUCTION=gxReconstruct(),GX_BASE=GX_RECONSTRUCTION.state;
const GX_ASFR=gxFitFertility(GX_BASE,GX_DATA.actual2025.births),GX_MORTALITY=gxFitMortality(GX_BASE,GX_DATA.actual2025.births,GX_DATA.actual2025.deaths);
const GX_PATH_CACHE=new Map();
function gxPath(f='2',m='3',allocation='proportional'){
 const key=f+'/'+m+'/'+allocation;if(GX_PATH_CACHE.has(key))return GX_PATH_CACHE.get(key);
 if(!GX_FERTILITY[f]||!GX_MOVEMENT[m])throw Error('广西情景无效');
 let state=gxClone(GX_BASE);const rows=[{year:2025,state:gxClone(state),total:gxCount(state),births:null,deaths:null,adjustment:null,balance:0,kind:'官方大组约束的细年龄重建'}];
 for(let year=2026;year<=2056;year++){
  const factor=1+(GX_FERTILITY[f].target-1)*Math.min(1,(year-2025)/11),births=gxSum(GX_ASFR.map((v,i)=>state.female[i+15]*v))*factor,step=gxAnnualStep(state,births,GX_MORTALITY.q,GX_MOVEMENT[m].annual,allocation);
  state=step.state;rows.push({...step,year,fertilityFactor:factor,kind:'最新基线队列情景'});
 }
 GX_PATH_CACHE.set(key,rows);return rows;
}
function gxAges(year,f='2',m='3'){
 if(Number(year)===2020)return [...GX_DATA.census2020.total];if(Number(year)===2024)return gxTotal(GX_RECONSTRUCTION.state2024);
 const row=gxPath(f,m).find(r=>r.year===Number(year));return row?gxTotal(row.state):null;
}
function gxHoldout(){
 const c=GX_DATA.census2020,h=GX_DATA.history.find(r=>r.year===2020),start=gxNormalize({male:c.male,female:c.female},h.population),asfr=gxFitFertility(start,h.births),q=gxFitMortality(start,h.births,h.deaths).q;
 let state=start;const rows=[];
 for(let year=2021;year<=2025;year++){
  const births=gxSum(asfr.map((v,i)=>state.female[i+15]*v)),step=gxAnnualStep(state,births,q,h.residual),actual=GX_DATA.history.find(r=>r.year===year);
  state=step.state;rows.push({year,predicted:step.total,actual:actual.population,populationAPE:Math.abs(step.total/actual.population-1)*100,predictedBirths:births,actualBirths:actual.births,birthAPE:Math.abs(births/actual.births-1)*100,predictedDeaths:step.deaths,actualDeaths:actual.deaths,deathAPE:Math.abs(step.deaths/actual.deaths-1)*100});
 }
 return {rows,populationMAPE:gxSum(rows.map(r=>r.populationAPE))/rows.length,birthMAPE:gxSum(rows.map(r=>r.birthAPE))/rows.length,deathMAPE:gxSum(rows.map(r=>r.deathAPE))/rows.length,trainThrough:2020,validationThrough:2025,used2025Margins:false};
}
