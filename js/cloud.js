// Supabase Auth + PostgREST, with no external JS dependency and no privileged keys.
const getConfig=()=>globalThis.STUDYOS_CONFIG||{};
const tokenStorageKey='studyos_auth_session_v1';
export class CloudClient {
 constructor(){this.config=getConfig();this.url=String(this.config.supabaseUrl||'').replace(/\/$/,'');this.anonKey=this.config.supabaseAnonKey||'';this.session=null;this.user=null;this.refreshPromise=null}
 get configured(){return /^https:\/\//.test(this.url)&&this.anonKey.length>15}
 async request(endpoint,{method='GET',body,authenticated=true,headers={}}={}){
   if(!this.configured)throw Error('سرویس ابری هنوز تنظیم نشده است');
   const url=this.url+endpoint;
   const h={'apikey':this.anonKey,'Content-Type':'application/json',...headers};
   if(authenticated){await this.ensureAccess();if(!this.session?.access_token)throw Error('برای ادامه وارد حسابت شو');h.Authorization=`Bearer ${this.session.access_token}`}
   const res=await fetch(url,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
   let result;const content=await res.text();try{result=content?JSON.parse(content):null}catch{result=content}
   if(!res.ok){const err=new Error(result?.msg||result?.message||result?.error_description||result?.error||`خطای سرویس (${res.status})`);err.code=result?.code||'';err.status=res.status;throw err}
   return result;
 }
 setSession(session){this.session=session;try{if(session)localStorage.setItem(tokenStorageKey,JSON.stringify(session));else localStorage.removeItem(tokenStorageKey)}catch{}}
 async restore(){if(!this.configured)return null;
   const hash=new URLSearchParams(location.hash.replace(/^#/,''));
   if(hash.has('access_token')&&hash.has('refresh_token')){
     this.setSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600)});
     history.replaceState({},'',location.pathname+location.search);
   }else{try{this.session=JSON.parse(localStorage.getItem(tokenStorageKey)||'null')}catch{this.session=null}}
   if(!this.session)return null;
   try{this.user=await this.request('/auth/v1/user');return this.user}catch{
     if(!navigator.onLine&&this.session?.access_token){
       try{const base=this.session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const payload=JSON.parse(atob(base));if(payload.sub){this.user={id:payload.sub,email:payload.email||''};return this.user}}catch{}
     }
     this.setSession(null);this.user=null;return null}
 }
 async ensureAccess(){if(!this.session)return;
   if(!this.session.expires_at||this.session.expires_at*1000>Date.now()+90000)return;
   if(!this.refreshPromise)this.refreshPromise=this.refresh().finally(()=>this.refreshPromise=null);
   await this.refreshPromise
 }
 async refresh(){const refreshToken=this.session?.refresh_token;if(!refreshToken)throw Error('نشست منقضی شده؛ دوباره وارد شو');
   const raw=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',authenticated:false,body:{refresh_token:refreshToken}});
   this.setSession({access_token:raw.access_token,refresh_token:raw.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(raw.expires_in||3600)})
 }
 async sendEmail(email){return await this.request('/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',authenticated:false,body:{email,create_user:true}})}
 async signOut(){try{await this.request('/auth/v1/logout',{method:'POST'})}catch{}this.setSession(null);this.user=null}
 async loadWorkspace(){if(!this.user)throw Error('لطفاً وارد شوید');const list=await this.request(`/rest/v1/study_workspaces?user_id=eq.${encodeURIComponent(this.user.id)}&select=version,data`);return list?.[0]||{version:0,data:null}}
 async saveWorkspace(data,expectedVersion){return await this.request('/rest/v1/rpc/sync_study_workspace',{method:'POST',body:{p_data:data,p_expected_version:expectedVersion}})}
}
