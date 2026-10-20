import {today,addDays,diffDays,parseDate,startWeek,isoDate,startMonth,endMonth,startYear,subjectSort,findById,weekdayIndex,safeNum} from './core.js';
export const activeItems=list=>(list||[]).filter(x=>!x.deletedAt);
export const orderedSubjects=data=>activeItems(data.subjects).filter(s=>!s.archived).sort(subjectSort);
export const inRange=(date,a,b)=>!!date&&date>=a&&date<=b;
export const sessionMinutes=s=>Math.max(0,Number(s.seconds||0)/60);
export function sessionsFor(data,subjectId='',from='0000-01-01',to='9999-12-31'){
 return activeItems(data.sessions).filter(s=>(!subjectId||s.subjectId===subjectId)&&inRange(s.date||isoDate(new Date(s.startedAt)),from,to));
}
export function totalStudyMinutes(data,subjectId='',from='0000-01-01',to='9999-12-31'){
 return sessionsFor(data,subjectId,from,to).reduce((n,s)=>n+sessionMinutes(s),0);
}
export function gradesFor(data,subjectId='',from='0000-01-01',to='9999-12-31'){
 return activeItems(data.grades).filter(g=>(!subjectId||g.subjectId===subjectId)&&inRange(g.date,from,to));
}
export function gradeAverage(data,subjectId='',from='0000-01-01',to='9999-12-31'){
 const grades=gradesFor(data,subjectId,from,to);if(!grades.length)return null;return grades.reduce((n,g)=>n+(Number(g.score)/Number(g.maxScore)*100),0)/grades.length;
}
export function metricValue(data,metric,subjectId='',from='0000-01-01',to='9999-12-31'){
 switch(metric){case 'hours':return totalStudyMinutes(data,subjectId,from,to)/60;
 case 'grade':{const v=gradeAverage(data,subjectId,from,to);return v==null?null:v}
 case 'tests':return sessionsFor(data,subjectId,from,to).filter(s=>s.activity==='test').reduce((n,s)=>n+(Number(s.questionCount)||0),0);
 case 'sessions':return sessionsFor(data,subjectId,from,to).length;
 case 'pages':return sessionsFor(data,subjectId,from,to).reduce((n,s)=>n+(Number(s.pageCount)||0),0);
 case 'topics':return activeItems(data.topics).filter(x=>(!subjectId||x.subjectId===subjectId)&&x.status==='done'&&inRange(x.completedAt||'',from,to)).length;
 case 'tasks':return activeItems(data.tasks).filter(x=>(!subjectId||x.subjectId===subjectId)&&x.status==='done'&&inRange(x.completedAt||'',from,to)).length;
 case 'focus':{const scored=sessionsFor(data,subjectId,from,to).filter(s=>Number(s.focusScore)>=1&&Number(s.focusScore)<=5);return scored.length?scored.reduce((n,s)=>n+Number(s.focusScore),0)/scored.length:null}
 case 'accuracy':{const graded=gradesFor(data,subjectId,from,to).filter(x=>x.questionCount>0);const total=graded.reduce((n,g)=>n+(Number(g.questionCount)||0),0);return total?100*graded.reduce((n,g)=>n+(Number(g.correctCount)||0),0)/total:null}
 
 default:return null;}
}
export function goalProgress(data,g){
 const from=g.startDate||'0000-01-01';const to=today();const computed=g.auto&&g.metric==='hours'?metricValue(data,'hours',g.subjectId,from,to):null;
 const value=computed==null?Number(g.currentValue||0):computed;return {value,target:Number(g.target||0),percent:g.target>0?Math.min(100,Math.max(0,100*value/g.target)):0};
}
export function studyByDay(data,base=today(),length=7,subjectId=''){
 return Array.from({length},(_,i)=>{const d=addDays(base,i-(length-1));return {date:d,minutes:totalStudyMinutes(data,subjectId,d,d)}});
}
export function scheduledMinutes(data,date){return activeItems(data.daily).filter(s=>s.date===date&&s.type!=='break'&&s.status!=='cancelled').reduce((n,x)=>n+Math.max(0,Number(x.end)-Number(x.start)),0)}
export function todaySchedule(data,date=today()){
 const assigned=activeItems(data.daily).filter(x=>x.date===date).sort((a,b)=>a.start-b.start);
 if(assigned.length)return assigned;
 return activeItems(data.weekly).filter(x=>Number(x.weekday)===weekdayIndex(date)).sort((a,b)=>a.start-b.start).map(x=>({...x,date,fromWeekly:true}));
}
export function advisorMessages(data,now=today()){
 const messages=[];const weekFrom=startWeek(now);const lastStart=addDays(weekFrom,-7);const lastEnd=addDays(weekFrom,-1);
 const thisWeek=totalStudyMinutes(data,'',weekFrom,now)/60;const previous=totalStudyMinutes(data,'',lastStart,lastEnd)/60;
 if(previous>=1){const change=(thisWeek-previous)/previous*100;if(change>15)messages.push({kind:'good',title:'رشد مطالعه',body:`زمان مطالعه ثبت‌شده این هفته ${Math.round(change)}٪ بیشتر از هفته قبل است. برای مقایسه منصفانه، روزهای سپری‌شده هر هفته را هم در نظر بگیر.`});if(change< -15)messages.push({kind:'warn',title:'کاهش ساعت مطالعه',body:`تا امروز، زمان ثبت‌شده این هفته ${Math.abs(Math.round(change))}٪ کمتر از کل هفته پیش است؛ بررسی کن آیا هنوز فرصت جبران داری.`})}
 const previousComparableEnd=addDays(lastStart,weekdayIndex(now));
 for(const subject of orderedSubjects(data)){
   const currentMin=totalStudyMinutes(data,subject.id,weekFrom,now);
   const previousMin=totalStudyMinutes(data,subject.id,lastStart,previousComparableEnd);
   if(previousMin>=30){const change=(currentMin-previousMin)/previousMin*100;
    if(change<-25)messages.push({kind:'warn',title:`کاهش مطالعه ${subject.name}`,body:`تا همین روز هفته، ${subject.name} حدود ${Math.abs(Math.round(change))}٪ کمتر از هفته قبل مطالعه شده است. این یک مقایسه زمان است، نه سنجش قطعی یادگیری.`});
    if(change>25)messages.push({kind:'good',title:`پیشرفت مطالعه ${subject.name}`,body:`تا همین روز هفته، مطالعه ${subject.name} حدود ${Math.round(change)}٪ بیشتر از هفته قبل است.`});
   }
   const gradeList=gradesFor(data,subject.id).sort((a,b)=>b.date.localeCompare(a.date));
   if(gradeList.length>=2){const change=100*gradeList[0].score/gradeList[0].maxScore-100*gradeList[1].score/gradeList[1].maxScore;
    if(change>=10)messages.push({kind:'good',title:`بهبود نتیجه ${subject.name}`,body:`درصد آخرین ارزیابی ${subject.name} نسبت به ارزیابی قبلی ${Math.round(change)} واحد درصد بیشتر شده است.`});
    else if(change<=-10)messages.push({kind:'warn',title:`افت نتیجه ${subject.name}`,body:`درصد آخرین ارزیابی ${subject.name} نسبت به ارزیابی قبلی ${Math.abs(Math.round(change))} واحد درصد کمتر شده؛ نوع و سختی آزمون‌ها را هم در نظر بگیر.`});
   }
 }
 if(!sessionsFor(data,'',addDays(now,-2),now).length)messages.push({kind:'info',title:'شروع دوباره',body:'در سه روز اخیر جلسه مطالعه‌ای ثبت نشده؛ اگر مطالعه کرده‌ای می‌توانی آن را دستی ثبت کنی.'});
 const soon=activeItems(data.tasks).filter(x=>x.status!=='done'&&x.dueDate&&inRange(x.dueDate,now,addDays(now,5))).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 if(soon.length)messages.push({kind:'warn',title:'موعد نزدیک',body:`«${soon[0].title}» در ${soon[0].dueDate===now?'امروز':`${diffDays(now,soon[0].dueDate)} روز آینده`} موعد دارد.`});
 const overdue=activeItems(data.tasks).filter(x=>x.status!=='done'&&x.dueDate&&x.dueDate<now).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 if(overdue.length)messages.push({kind:'warn',title:'تکلیف عقب‌افتاده',body:`«${overdue[0].title}» از تاریخ ${overdue[0].dueDate} انجام نشده؛ مهلت آن را بازبینی یا تکلیف را تکمیل کن.`});
 const exams=activeItems(data.exams).filter(x=>x.date>=now&&x.date<=addDays(now,7)).sort((a,b)=>a.date.localeCompare(b.date));
 if(exams.length)messages.push({kind:'info',title:'امتحان نزدیک',body:`امتحان «${exams[0].title}» ${diffDays(now,exams[0].date)} روز دیگر است. برای آن زمان تمرین و مرور در برنامه ثبت کن.`});

 for(const g of activeItems(data.goals).filter(g=>g.dueDate&&g.dueDate>=now&&!g.archived).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,2)){
 const p=goalProgress(data,g),days=Math.max(1,diffDays(now,g.dueDate));if(p.percent<100){const remain=Math.max(0,p.target-p.value);messages.push({kind:days<=7?'warn':'info',title:`هدف: ${g.title}`,body:`${Math.round(p.percent)}٪ انجام شده؛ حدود ${remain.toFixed(1)} واحد باقی مانده و ${days} روز تا موعد فرصت داری. میانگین لازم: ${(remain/days).toFixed(1)} واحد در روز.`});
 if(g.metric==='hours'){const observed=totalStudyMinutes(data,g.subjectId,addDays(now,-13),now)/60/14;const dailyNeed=remain/days;
 if(observed>0&&dailyNeed>observed*1.4)messages.push({kind:'warn',title:`احتمال عقب‌ماندگی از هدف «${g.title}»`,body:`میانگین مطالعه مرتبط در ۱۴ روز اخیر حدود ${observed.toFixed(1)} ساعت در روز بوده، اما برای رسیدن به این هدف حدود ${dailyNeed.toFixed(1)} ساعت در روز نیاز است. این برآورد تقریبی است.`});
 }
 }}
 const targets=safeNum(data.settings.weeklyTargetHours,0);if(targets>0&&thisWeek<targets&&weekdayIndex(now)>=4)messages.push({kind:'info',title:'پیشرفت هدف هفتگی',body:`از هدف ${targets} ساعت، ${thisWeek.toFixed(1)} ساعت ثبت شده. حدود ${Math.max(0,targets-thisWeek).toFixed(1)} ساعت باقی است.`});
 if(!messages.length)messages.push({kind:'good',title:'همه‌چیز آماده است',body:'برای دریافت تحلیل شخصی، چند جلسه مطالعه و هدف ثبت کن. توصیه‌ها بر اساس داده‌های واقعی ساخته می‌شوند.'});return messages;
}
export function studyTwin(data){const sessions=activeItems(data.sessions);if(sessions.length<5)return {ready:false,count:sessions.length};const periods=[{name:'صبح (۶ تا ۱۲)',from:6,to:12},{name:'ظهر (۱۲ تا ۱۷)',from:12,to:17},{name:'عصر (۱۷ تا ۲۱)',from:17,to:21},{name:'شب (۲۱ تا ۶)',from:21,to:30}];const scores=periods.map(p=>({...p,minutes:sessions.filter(s=>{let h=new Date(s.startedAt).getHours();if(h<p.from&&p.to===30)h+=24;return h>=p.from&&h<p.to}).reduce((n,s)=>n+sessionMinutes(s),0)})).sort((a,b)=>b.minutes-a.minutes);return {ready:true,best:scores[0],periods:scores};}
export function compareMetrics(data,metric,subjectId,periodA,periodB){const a=metricValue(data,metric,subjectId,...periodA);const b=metricValue(data,metric,subjectId,...periodB);return {a,b,delta:a==null||b==null?null:a-b,percentage:a==null||b==null||b===0?null:(a-b)/b*100}}
export function collision(block,all){return activeItems(all).some(x=>x.id!==block.id&&x.weekday===block.weekday&&block.start<x.end&&block.end>x.start)}

// Optional plan suggestions: never write anything without explicit user acceptance.
export function suggestWeeklyStudyBlocks(data){
 const subjects=orderedSubjects(data);if(!subjects.length)return [];
 const s=data.settings||{},start=Math.max(0,Number((s.dayStart||'07:00').slice(0,2))*60+Number((s.dayStart||'07:00').slice(3,5))),end=Math.min(1440,Number((s.dayEnd||'23:00').slice(0,2))*60+Number((s.dayEnd||'23:00').slice(3,5)));
 const step=Math.min(120,Math.max(15,Number(s.gridMinutes)||60)),target=Math.min(7*24,Math.max(0,Number(s.weeklyTargetHours)||0))*60;
 const quotaMinutes=Math.ceil(target/step)*step;if(!quotaMinutes||end<=start)return [];
 const existing=activeItems(data.weekly);
 const timeSlots=[];
 for(let offset=0;offset<Math.ceil((end-start)/step);offset++){
  const begin=start+offset*step;if(begin+step>end)continue;
  for(let weekday=0;weekday<7;weekday++){
   if(existing.some(x=>x.weekday===weekday&&begin<x.end&&begin+step>x.start))continue;
   timeSlots.push({weekday,start:begin,end:begin+step});
  }
 }
 const timeQuota=new Map(subjects.map(sub=>[sub.id,0]));
 const urgent=new Map(subjects.map(sub=>{const next=activeItems(data.exams).filter(x=>x.subjectId===sub.id&&x.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0];return [sub.id,next?Math.max(0,14-diffDays(today(),next.date))/14:0]}));
 const weights=new Map(subjects.map(s=>[s.id,Math.max(0.25,Number(s.coefficient)||1)*(1+0.6*urgent.get(s.id))]));
 const results=[],total=Math.min(timeSlots.length,Math.ceil(quotaMinutes/step));let previous='';
 for(let i=0;i<total;i++){
   let eligible=subjects.slice().sort((a,b)=>{
    let ar=timeQuota.get(a.id)/weights.get(a.id)+(a.id===previous?0.75:0),br=timeQuota.get(b.id)/weights.get(b.id)+(b.id===previous?0.75:0);
    return ar-br||a.name.localeCompare(b.name,'fa');
   });
   let sub=eligible[0];let slot=timeSlots[i];results.push({...slot,subjectId:sub.id,title:'',type:'study'});timeQuota.set(sub.id,timeQuota.get(sub.id)+step);previous=sub.id;
 }
 return results;
}
export function findCatchupSlot(block,daily,days=14){
 for(let n=1;n<=days;n++){
  const date=addDays(block.date,n);
  for(let offset=0;offset<=240;offset+=30){
   const start=Number(block.start)+offset,end=start+(Number(block.end)-Number(block.start));
   if(end>1440)break;
   if(!activeItems(daily).some(x=>x.date===date&&x.status!=='cancelled'&&start<x.end&&end>x.start))return {date,start,end,subjectId:block.subjectId,title:block.title,type:block.type,status:'planned'};
  }
 }
 return null;
}
export function dueReviews(data,now=today()){
 const steps=[1,3,7,14,30];return activeItems(data.topics).filter(x=>x.status==='done'&&x.lastReviewed).map(x=>{
  const next=addDays(x.lastReviewed,steps[Math.min(steps.length-1,Math.max(0,(x.reviewCount||1)-1))]);return {...x,nextReview:next};
 }).filter(x=>x.nextReview<=now).sort((a,b)=>a.nextReview.localeCompare(b.nextReview));
}
