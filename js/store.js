import {defaultData,uid} from './core.js';
const prefix='studyos_workspace_v1_';
export function loadLocal(owner='demo'){
 try{const raw=localStorage.getItem(prefix+owner);if(!raw)return defaultData();const obj=JSON.parse(raw);return {...defaultData(),...obj,settings:{...defaultData().settings,...obj.settings}}}catch{return defaultData()}
}
export function saveLocal(data,owner='demo'){localStorage.setItem(prefix+owner,JSON.stringify(data))}
export function patchEntity(data,key,entity){const arr=data[key];if(!Array.isArray(arr))throw Error('Unknown entity '+key);const now=new Date().toISOString();const item={...entity,id:entity.id||uid(),updatedAt:now};const idx=arr.findIndex(x=>x.id===item.id);if(idx>=0)arr[idx]=item;else arr.push(item);return item}
export function removeEntity(data,key,id){let item=data[key].find(x=>x.id===id);if(!item)return false;item.deletedAt=new Date().toISOString();item.updatedAt=item.deletedAt;return true}
export function exportData(data){return JSON.stringify({format:'STUDY_OS_BACKUP',version:1,exportedAt:new Date().toISOString(),data},null,2)}
export function importData(raw){const wrapper=JSON.parse(raw);if(wrapper?.format!=='STUDY_OS_BACKUP'||wrapper?.version!==1||!wrapper?.data||!Array.isArray(wrapper.data.subjects)||!Array.isArray(wrapper.data.sessions))throw new Error('فایل پشتیبان معتبر STUDY OS نیست');return {...defaultData(),...wrapper.data,settings:{...defaultData().settings,...wrapper.data.settings}}}
export function mergeData(local,remote){const result=structuredClone(remote);for(const key of ['folders','subjects','topics','weekly','daily','sessions','goals','milestones','grades','tasks','exams','periods']){
 const merged=new Map([...(remote[key]||[]),...(local[key]||[])].map(x=>[x.id,x]));for(const item of remote[key]||[]){const l=(local[key]||[]).find(x=>x.id===item.id);if(l&&Date.parse(l.updatedAt||0)<Date.parse(item.updatedAt||0))merged.set(item.id,item)}result[key]=[...merged.values()]}
 result.profile=(Date.parse(local.profile?.updatedAt||0)>Date.parse(remote.profile?.updatedAt||0))?local.profile:remote.profile;
 result.settings=(Date.parse(local.updatedAt||0)>Date.parse(remote.updatedAt||0))?local.settings:remote.settings;
 return result
}
