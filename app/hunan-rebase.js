'use strict';
// Hunan only. Official margins are observations; reconstructed fine ages and future rates are estimates.
const HN_FERTILITY={'1':{label:'较低生育敏感性',target:.75},'2':{label:'维持2025经验生育水平',target:1},'3':{label:'生育水平提高25%',target:1.25},'4':{label:'生育水平提高50%',target:1.5},'5':{label:'生育水平提高75%',target:1.75}};
const HN_MOVEMENT={'1':{label:'延续2025残差',annual:-183000},'2':{label:'零净调整对照',annual:0},'3':{label:'延续近五年平均残差',annual:-123120}};
const hnSum=a=>a.reduce((s,v)=>s+v,0),hnCount=s=>hnSum(s.male)+hnSum(s.female);
const hnClone=s=>({male:[...s.male],female:[...s.female]});
const hnTotal=s=>s.male.map((v,i)=>v+s.female[i]);
const hnMaleShare=HN_DATA.census2020.censusMaleBirths/HN_DATA.census2020.censusBirths;
const hnGroupEdges=[0,1,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,101];
function hnMortalityShape(){
 const out={male:[],female:[]},c=HN_DATA.census2020;
 for(const sex of ['male','female'])for(let i=0;i<hnGroupEdges.length-1;i++){
  const lo=hnGroupEdges[i],hi=hnGroupEdges[i+1],death=sex==='female'?c.femaleDeaths[i]:c.deaths[i]-c.femaleDeaths[i],exposure=hnSum(c[sex].slice(lo,hi));
  for(let age=lo;age<hi;age++)out[sex][age]=death/exposure;
 }return out;
}
const HN_Q_SHAPE=hnMortalityShape();
function hnQ(scale){return Object.fromEntries(['male','female'].map(s=>[s,HN_Q_SHAPE[s].map(q=>Math.min(.999,q*scale))]));}
function hnDeathTotal(s,births,q){
 return hnSum(['male','female'].map(sex=>hnSum(s[sex].map((v,a)=>v*q[sex][a]))+births*(sex==='male'?hnMaleShare:1-hnMaleShare)*q[sex][0]/2));
}
function hnFitMortality(s,births,target){
 let lo=0,hi=1;while(hnDeathTotal(s,births,hnQ(hi))<target){hi*=2;if(hi>1024)throw Error('死亡校准目标超出可行范围');}
 for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(hnDeathTotal(s,births,hnQ(mid))<target)lo=mid;else hi=mid;}
 const scale=(lo+hi)/2;return {scale,q:hnQ(scale)};
}
function hnFitFertility(s,births){
 const base=hnSum(HN_DATA.census2020.asfr2020.map((v,i)=>v/1000*s.female[i+15]));
 return HN_DATA.census2020.asfr2020.map(v=>v/1000*births/base);
}
function hnAnnualStep(s,births,q,adjustment=0,allocation='proportional'){
 const next={male:Array(101).fill(0),female:Array(101).fill(0)},deaths=hnDeathTotal(s,births,q);
 for(const sex of ['male','female']){
  next[sex][0]=births*(sex==='male'?hnMaleShare:1-hnMaleShare)*(1-q[sex][0]/2);
  for(let a=0;a<=100;a++)next[sex][Math.min(a+1,100)]+=s[sex][a]*(1-q[sex][a]);
 }
 const eligible=(sex,a)=>allocation==='young'?(a>=20&&a<50?next[sex][a]:0):next[sex][a],weight=hnSum(['male','female'].map(sex=>hnSum(next[sex].map((_,a)=>eligible(sex,a)))));
 if(adjustment<0&&-adjustment>=weight)throw Error('净调整假设超出相应年龄人口');
 for(const sex of ['male','female'])for(let a=0;a<=100;a++)next[sex][a]+=adjustment*eligible(sex,a)/weight;
 const balance=hnCount(next)-hnCount(s)-births+deaths-adjustment;
 if(Math.abs(balance)>.00001)throw Error('人口平衡未闭合');
 return {state:next,births,deaths,adjustment,balance,total:hnCount(next)};
}
function hnNormalize(s,total){const ratio=total/hnCount(s);return Object.fromEntries(['male','female'].map(sex=>[sex,s[sex].map(v=>v*ratio)]));}
function hnRake2025(s){
 const out=hnClone(s),a=HN_DATA.actual2025,edges=a.bandsEdges;
 for(let iter=0;iter<120;iter++){
  for(let i=0;i<4;i++){
   const count=hnSum(['male','female'].map(sex=>hnSum(out[sex].slice(edges[i],edges[i+1])))),ratio=a.bands[i]/count;
   for(const sex of ['male','female'])for(let age=edges[i];age<edges[i+1];age++)out[sex][age]*=ratio;
  }
  for(const sex of ['male','female']){const ratio=a[sex]/hnSum(out[sex]);out[sex]=out[sex].map(v=>v*ratio);}
 }
 return out;
}
function hnReconstruct(){
 const c=HN_DATA.census2020,year2020=HN_DATA.history.find(r=>r.year===2020),start=hnNormalize({male:c.male,female:c.female},year2020.population);
 // Census is Nov 1, annual ledger Dec 31: this normalization is an explicit within-year approximation.
 let state=start;const ledger=[];
 for(const h of HN_DATA.history.filter(r=>r.year>2020)){
  const fit=hnFitMortality(state,h.births,h.deaths),step=hnAnnualStep(state,h.births,fit.q,h.residual);
  ledger.push({year:h.year,total:step.total,births:h.births,deaths:h.deaths,adjustment:h.residual,mortalityScale:fit.scale});state=step.state;
 }
 const before=hnTotal(state),raked=hnRake2025(state),after=hnTotal(raked),edges=HN_DATA.actual2025.bandsEdges;
 return {state:raked,ledger,marginAdjustments:HN_DATA.actual2025.bands.map((v,i)=>({lo:edges[i],hi:edges[i+1],before:hnSum(before.slice(edges[i],edges[i+1])),target:v,after:hnSum(after.slice(edges[i],edges[i+1]))}))};
}
const HN_RECONSTRUCTION=hnReconstruct(),HN_BASE=HN_RECONSTRUCTION.state;
const HN_ASFR=hnFitFertility(HN_BASE,HN_DATA.actual2025.births),HN_MORTALITY=hnFitMortality(HN_BASE,HN_DATA.actual2025.births,HN_DATA.actual2025.deaths);
const HN_PATH_CACHE=new Map();
function hnPath(f='2',m='3',allocation='proportional'){
 const key=f+'/'+m+'/'+allocation;if(HN_PATH_CACHE.has(key))return HN_PATH_CACHE.get(key);
 if(!HN_FERTILITY[f]||!HN_MOVEMENT[m])throw Error('湖南情景无效');
 let state=hnClone(HN_BASE);const rows=[{year:2025,state:hnClone(state),total:hnCount(state),births:null,deaths:null,adjustment:null,balance:0,kind:'官方大组约束的细年龄重建'}];
 for(let year=2026;year<=2056;year++){
  const factor=1+(HN_FERTILITY[f].target-1)*Math.min(1,(year-2025)/11),births=hnSum(HN_ASFR.map((v,i)=>state.female[i+15]*v))*factor,step=hnAnnualStep(state,births,HN_MORTALITY.q,HN_MOVEMENT[m].annual,allocation);
  state=step.state;rows.push({...step,year,fertilityFactor:factor,kind:'最新基线队列情景'});
 }
 HN_PATH_CACHE.set(key,rows);return rows;
}
function hnAges(year,f='2',m='3'){
 if(Number(year)===2020)return [...HN_DATA.census2020.total];
 const row=hnPath(f,m).find(r=>r.year===Number(year));return row?hnTotal(row.state):null;
}
function hnHoldout(){
 const c=HN_DATA.census2020,h=HN_DATA.history.find(r=>r.year===2020),start=hnNormalize({male:c.male,female:c.female},h.population),asfr=hnFitFertility(start,h.births),q=hnFitMortality(start,h.births,h.deaths).q;
 let state=start;const rows=[];
 for(let year=2021;year<=2025;year++){
  const births=hnSum(asfr.map((v,i)=>state.female[i+15]*v)),step=hnAnnualStep(state,births,q,h.residual),actual=HN_DATA.history.find(r=>r.year===year);
  state=step.state;rows.push({year,predicted:step.total,actual:actual.population,populationAPE:Math.abs(step.total/actual.population-1)*100,predictedBirths:births,actualBirths:actual.births,birthAPE:Math.abs(births/actual.births-1)*100,predictedDeaths:step.deaths,actualDeaths:actual.deaths,deathAPE:Math.abs(step.deaths/actual.deaths-1)*100});
 }
 return {rows,populationMAPE:hnSum(rows.map(r=>r.populationAPE))/rows.length,birthMAPE:hnSum(rows.map(r=>r.birthAPE))/rows.length,deathMAPE:hnSum(rows.map(r=>r.deathAPE))/rows.length,trainThrough:2020,validationThrough:2025,used2025Margins:false};
}
