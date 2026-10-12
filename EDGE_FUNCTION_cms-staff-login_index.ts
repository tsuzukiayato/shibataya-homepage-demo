// Supabase Edge Function: cms-staff-login
// Deploy with --no-verify-jwt (pre-login request). Restrict CORS and server-side attempts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const projectUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowedOrigin = Deno.env.get('OZ_ALLOWED_ORIGIN') || 'https://tsuzukiayato.github.io';
const headers = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'apikey,content-type', 'Vary':'Origin', 'Content-Type':'application/json', 'Cache-Control':'no-store' };
function result(status:number, body:unknown){return new Response(JSON.stringify(body),{status,headers});}
Deno.serve(async (req) => {
 const origin=req.headers.get('origin');
 if(origin && origin!==allowedOrigin) return result(403,{error:'アクセス元が許可されていません'});
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
 if(req.method!=='POST')return result(405,{error:'POSTのみ利用できます'});
 try {
  const body=await req.json();
  const staffId=String(body.staffId||'').trim().toUpperCase();
  const pin=String(body.pin||'');
  if(!/^[A-Z0-9-]{3,16}$/.test(staffId)|| !/^[0-9]{6,12}$/.test(pin))return result(400,{error:'入力形式が正しくありません'});
  const admin=createClient(projectUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:check,error:checkError}=await admin.rpc('cms_login_precheck',{p_staff_id:staffId});
  if(checkError)return result(503,{error:'認証サービスに接続できません'});
  if(!check?.allowed)return result(429,{error:'試行回数の上限です。15分後にお試しください'});
  let ok=false;let session=null;
  if(check.email){
   const auth=createClient(projectUrl,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await auth.auth.signInWithPassword({email:check.email,password:pin});
   if(!error&&data.session){ok=true;session=data.session;}
  }
  await admin.rpc('cms_login_finish',{p_staff_id:staffId,p_success:ok});
  if(!ok||!session)return result(401,{error:'スタッフ番号またはパスコードが正しくありません'});
  return result(200,{access_token:session.access_token,refresh_token:session.refresh_token});
 } catch(_e){return result(400,{error:'ログイン処理を完了できませんでした'});}
});
