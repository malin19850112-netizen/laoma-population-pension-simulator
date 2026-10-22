'use strict';
// Guangdong instance of the V42 audited cohort algorithm. Five-year inputs and 2024 constraints are explicit differences; Hunan code is preserved.
const GD_FERTILITY={'1':{label:'较低生育敏感性',target:.75},'2':{label:'维持2025经验生育水平',target:1},'3':{label:'生育水平提高25%',target:1.25},'4':{label:'生育水平提高50%',target:1.5},'5':{label:'生育水平提高75%',target:1.75}};
const GD_MOVEMENT={'1':{label:'延续2025残差',annual:500000},'2':{label:'零净调整对照',annual:0},'3':{label:'延续近五年平均残差',annual:49220}};
const gdSum=a=>a.reduce((s,v)=>s+v,0),gdCount=s=>gdSum(s.male)+gdSum(s.female);
const gdClone=s=>({male:[...s.male],female:[...s.female]});
const gdTotal=s=>s.male.map((v,i)=>v+s.female[i]);
const gdMaleShare=GD_DATA.census2020.censusMaleBirths/GD_DATA.census2020.censusBirths;
const gdGroupEdges=[0,1,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,101];
function gdMortalityShape(){
 const out={male:[],female:[]},c=GD_DATA.census2020;
 for(const sex of ['male','female'])for(let i=0;i<gdGroupEdges.length-1;i++){
  const lo=gdGroupEdges[i],hi=gdGroupEdges[i+1],death=sex==='female'?c.femaleDeaths[i]:c.deaths[i]-c.femaleDeaths[i],exposure=gdSum(c[sex].slice(lo,hi));
  for(let age=lo;age<hi;age++)out[sex][age]=death/exposure;
 }return out;
}
const GD_Q_SHAPE=gdMortalityShape();
function gdQ(scale){return Object.fromEntries(['male','female'].map(s=>[s,GD_Q_SHAPE[s].map(q=>Math.min(.999,q*scale))]));}
function gdDeathTotal(s,births,q){
 return gdSum(['male','female'].map(sex=>gdSum(s[sex].map((v,a)=>v*q[sex][a]))+births*(sex==='male'?gdMaleShare:1-gdMaleShare)*q[sex][0]/2));
}
function gdFitMortality(s,births,target){
 let lo=0,hi=1;while(gdDeathTotal(s,births,gdQ(hi))<target){hi*=2;if(hi>1024)throw Error('死亡校准目标超出可行范围');}
 for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(gdDeathTotal(s,births,gdQ(mid))<target)lo=mid;else hi=mid;}
 const scale=(lo+hi)/2;return {scale,q:gdQ(scale)};
}
function gdFitFertility(s,births){
 const base=gdSum(GD_DATA.census2020.asfr2020.map((v,i)=>v/1000*s.female[i+15]));
 return GD_DATA.census2020.asfr2020.map(v=>v/1000*births/base);
}
function gdAnnualStep(s,births,q,adjustment=0,allocation='proportional'){
 const next={male:Array(101).fill(0),female:Array(101).fill(0)},deaths=gdDeathTotal(s,births,q);
 for(const sex of ['male','female']){
  next[sex][0]=births*(sex==='male'?gdMaleShare:1-gdMaleShare)*(1-q[sex][0]/2);
  for(let a=0;a<=100;a++)next[sex][Math.min(a+1,100)]+=s[sex][a]*(1-q[sex][a]);
 }
 const eligible=(sex,a)=>allocation==='young'?(a>=20&&a<50?next[sex][a]:0):next[sex][a],weight=gdSum(['male','female'].map(sex=>gdSum(next[sex].map((_,a)=>eligible(sex,a)))));
 if(adjustment<0&&-adjustment>=weight)throw Error('净调整假设超出相应年龄人口');
 for(const sex of ['male','female'])for(let a=0;a<=100;a++)next[sex][a]+=adjustment*eligible(sex,a)/weight;
 const balance=gdCount(next)-gdCount(s)-births+deaths-adjustment;
 if(Math.abs(balance)>.00001)throw Error('人口平衡未闭合');
 return {state:next,births,deaths,adjustment,balance,total:gdCount(next)};
}
function gdNormalize(s,total){const ratio=total/gdCount(s);return Object.fromEntries(['male','female'].map(sex=>[sex,s[sex].map(v=>v*ratio)]));}
function gdRake(s,a){
 const out=gdClone(s),edges=a.bandsEdges;
 for(let iter=0;iter<120;iter++){
  for(let i=0;i<a.bands.length;i++){
   const count=gdSum(['male','female'].map(sex=>gdSum(out[sex].slice(edges[i],edges[i+1])))),ratio=a.bands[i]/count;
   for(const sex of ['male','female'])for(let age=edges[i];age<edges[i+1];age++)out[sex][age]*=ratio;
  }
  for(const sex of ['male','female']){const ratio=a[sex]/gdSum(out[sex]);out[sex]=out[sex].map(v=>v*ratio);}
 }
 return out;
}
function gdReconstruct(){
 const c=GD_DATA.census2020,year2020=GD_DATA.history.find(r=>r.year===2020),start=gdNormalize({male:c.male,female:c.female},year2020.population);
 // Census is Nov 1, annual ledger Dec 31: this normalization is an explicit within-year approximation.
 let state=start,state2024=null;const ledger=[];
 for(const h of GD_DATA.history.filter(r=>r.year>2020)){
  const fit=gdFitMortality(state,h.births,h.deaths),step=gdAnnualStep(state,h.births,fit.q,h.residual);
  ledger.push({year:h.year,total:step.total,births:h.births,deaths:h.deaths,adjustment:h.residual,mortalityScale:fit.scale});state=step.state;if(h.year===2024){state=gdRake(state,GD_DATA.actual2024);state2024=gdClone(state);}
 }
 const before=gdTotal(state),raked=gdRake(state,GD_DATA.actual2025),after=gdTotal(raked),edges=GD_DATA.actual2025.bandsEdges;
 return {state:raked,state2024,ledger,marginAdjustments:GD_DATA.actual2025.bands.map((v,i)=>({lo:edges[i],hi:edges[i+1],before:gdSum(before.slice(edges[i],edges[i+1])),target:v,after:gdSum(after.slice(edges[i],edges[i+1]))}))};
}
const GD_RECONSTRUCTION=gdReconstruct(),GD_BASE=GD_RECONSTRUCTION.state;
const GD_ASFR=gdFitFertility(GD_BASE,GD_DATA.actual2025.births),GD_MORTALITY=gdFitMortality(GD_BASE,GD_DATA.actual2025.births,GD_DATA.actual2025.deaths);
const GD_PATH_CACHE=new Map();
function gdPath(f='2',m='3',allocation='proportional'){
 const key=f+'/'+m+'/'+allocation;if(GD_PATH_CACHE.has(key))return GD_PATH_CACHE.get(key);
 if(!GD_FERTILITY[f]||!GD_MOVEMENT[m])throw Error('广东情景无效');
 let state=gdClone(GD_BASE);const rows=[{year:2025,state:gdClone(state),total:gdCount(state),births:null,deaths:null,adjustment:null,balance:0,kind:'官方大组约束的细年龄重建'}];
 for(let year=2026;year<=2056;year++){
  const factor=1+(GD_FERTILITY[f].target-1)*Math.min(1,(year-2025)/11),births=gdSum(GD_ASFR.map((v,i)=>state.female[i+15]*v))*factor,step=gdAnnualStep(state,births,GD_MORTALITY.q,GD_MOVEMENT[m].annual,allocation);
  state=step.state;rows.push({...step,year,fertilityFactor:factor,kind:'最新基线队列情景'});
 }
 GD_PATH_CACHE.set(key,rows);return rows;
}
function gdAges(year,f='2',m='3'){
 if(Number(year)===2020)return [...GD_DATA.census2020.total];if(Number(year)===2024)return gdTotal(GD_RECONSTRUCTION.state2024);
 const row=gdPath(f,m).find(r=>r.year===Number(year));return row?gdTotal(row.state):null;
}
function gdHoldout(){
 const c=GD_DATA.census2020,h=GD_DATA.history.find(r=>r.year===2020),start=gdNormalize({male:c.male,female:c.female},h.population),asfr=gdFitFertility(start,h.births),q=gdFitMortality(start,h.births,h.deaths).q;
 let state=start;const rows=[];
 for(let year=2021;year<=2025;year++){
  const births=gdSum(asfr.map((v,i)=>state.female[i+15]*v)),step=gdAnnualStep(state,births,q,h.residual),actual=GD_DATA.history.find(r=>r.year===year);
  state=step.state;rows.push({year,predicted:step.total,actual:actual.population,populationAPE:Math.abs(step.total/actual.population-1)*100,predictedBirths:births,actualBirths:actual.births,birthAPE:Math.abs(births/actual.births-1)*100,predictedDeaths:step.deaths,actualDeaths:actual.deaths,deathAPE:Math.abs(step.deaths/actual.deaths-1)*100});
 }
 return {rows,populationMAPE:gdSum(rows.map(r=>r.populationAPE))/rows.length,birthMAPE:gdSum(rows.map(r=>r.birthAPE))/rows.length,deathMAPE:gdSum(rows.map(r=>r.deathAPE))/rows.length,trainThrough:2020,validationThrough:2025,used2025Margins:false};
}
