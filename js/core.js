export const WEEKDAYS=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
export const STAGES={elementary:'دبستان',middle:'راهنمایی',high:'دبیرستان',bachelor:'کارشناسی',master:'کارشناسی ارشد',phd:'دکتری'};
export const HORIZONS={short:'کوتاه‌مدت',medium:'میان‌مدت',long:'بلندمدت'};
export const ACTIVITIES={study:'مطالعه',test:'تست',practice:'تمرین',review:'مرور',project:'پروژه',class:'کلاس'};
export const METRICS={hours:'ساعت مطالعه',grade:'نمره',tests:'تعداد تست',pages:'تعداد صفحه',topics:'مبحث تکمیل‌شده',focus:'تمرکز (۱ تا ۵)',accuracy:'دقت تست (درصد)',tasks:'تکالیف انجام‌شده',custom:'معیار دلخواه'};
export const TYPE_LABELS={study:'مطالعه',class:'کلاس',review:'مرور',break:'استراحت',exam:'امتحان',other:'فعالیت'};
export const nf=new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1});
export const number=x=>nf.format(Number(x)||0);
export const safeNum=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export const pad=n=>String(n).padStart(2,'0');
export const uid=()=>globalThis.crypto?.randomUUID?.()||('s'+Date.now().toString(36)+Math.random().toString(36).slice(2));
export const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const attr=esc;
export const clean=s=>String(s??'').trim();
export const isoDate=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const parseDate=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y||2000,(m||1)-1,d||1,12,0,0)};
export const addDays=(day,n)=>{const d=typeof day==='string'?parseDate(day):new Date(day);d.setDate(d.getDate()+n);return isoDate(d)};
export const diffDays=(a,b)=>Math.round((parseDate(b)-parseDate(a))/86400000);
export const weekdayIndex=date=>(parseDate(date).getDay()+1)%7;
export const startWeek=date=>addDays(date,-weekdayIndex(date));
export const endWeek=date=>addDays(startWeek(date),6);
export const startMonth=date=>date.slice(0,7)+'-01';
export const endMonth=date=>{const d=parseDate(startMonth(date));d.setMonth(d.getMonth()+1);d.setDate(0);return isoDate(d)};
export const startYear=date=>date.slice(0,4)+'-01-01';
export const fmtDate=date=>{if(!date)return '—';try{return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric'}).format(parseDate(date))}catch{return date}};
export const fmtShort=date=>{if(!date)return '';try{return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{month:'short',day:'numeric'}).format(parseDate(date))}catch{return date}};
export const today=()=>isoDate();
export const minutesToClock=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;
export const clockToMinutes=t=>{const a=String(t||'').split(':').map(Number);return (a[0]||0)*60+(a[1]||0)};
export const durationText=mins=>`${number(Math.floor(mins/60))} ساعت و ${number(Math.round(mins%60))} دقیقه`;
export const parsePersianNumber=x=>String(x??'').replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)).replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632));
export const findById=(list,id)=>list?.find(x=>x.id===id);
export const subjectName=(data,id)=>findById(data.subjects,id)?.name||'بدون درس';
export const subjectSort=(a,b)=>Number(b.coefficient||0)-Number(a.coefficient||0)||a.name.localeCompare(b.name,'fa');
export function defaultData(){return {schema:1,profile:null,periods:[],folders:[],subjects:[],topics:[],weekly:[],daily:[],sessions:[],goals:[],milestones:[],grades:[],tasks:[],exams:[],settings:{dayStart:'07:00',dayEnd:'23:00',gridMinutes:60,weeklyTargetHours:20,notify:true,theme:'light',focusGoal:45},timer:null,updatedAt:new Date().toISOString()}}
export function validateProfile(p){if(!clean(p?.name))return 'نام الزامی است';if(!['student','university'].includes(p.role))return 'نوع تحصیل نامعتبر است';if(p.role==='student'){
 if(!['elementary','middle','high'].includes(p.stage))return 'مقطع دانش‌آموز نامعتبر است';
 const allowed=p.stage==='elementary'?[1,2,3,4,5,6]:p.stage==='middle'?[7,8,9]:[10,11,12];if(!allowed.includes(Number(p.grade)))return 'پایه نامعتبر است';
 if(p.stage==='high'&&!clean(p.track))return 'رشته دبیرستان الزامی است';
 }else{if(!['bachelor','master','phd'].includes(p.stage))return 'مقطع دانشگاهی نامعتبر است';if(Number(p.semester)<1||(p.stage==='bachelor'&&Number(p.semester)>8))return 'ترم نامعتبر است';if(!clean(p.major))return 'رشته دانشگاهی الزامی است'}return null}
export const getRange=(type,date=today())=>type==='day'?[date,date]:type==='week'?[startWeek(date),endWeek(date)]:type==='month'?[startMonth(date),endMonth(date)]:type==='year'?[startYear(date),date]:[date,date];
export function jalaliParts(date){let d=typeof date==='string'?parseDate(date):date;try{let x=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric'}).formatToParts(d);const v=k=>Number(x.find(z=>z.type===k)?.value||0);return {y:v('year'),m:v('month'),d:v('day')}}catch{return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()}}}
export function jalaliMonthGrid(anchor=today()){
 const a=jalaliParts(anchor);let first=anchor;for(let j=0;j<35;j++){const prev=addDays(first,-1);const p=jalaliParts(prev);if(p.m!==a.m||p.y!==a.y)break;first=prev}
 let last=first;for(let j=0;j<32;j++){const next=addDays(last,1);const p=jalaliParts(next);if(p.m!==a.m||p.y!==a.y)break;last=next}
 const leading=weekdayIndex(first),cells=[];for(let i=-leading;i<42-leading;i++){const date=addDays(first,i);cells.push({date,...jalaliParts(date),inMonth:date>=first&&date<=last})}
 const monthName=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{month:'long',year:'numeric'}).format(parseDate(anchor));return {label:monthName,first,last,cells,prev:addDays(first,-1),next:addDays(last,1)}
}
