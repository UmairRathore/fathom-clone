// Only explicitly created fictional fixture accounts/objects are expired by this operator test.
import nextEnv from "@next/env";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import {put,get,del} from "@vercel/blob";
import {createTemporaryAccount} from "../src/lib/temporary-accounts";
import {getAuth} from "../src/lib/auth";
import {getPool} from "../src/lib/db";
import {ensureWorkspace,getOwnedMeeting,saveOwnedMeeting} from "../src/lib/workspace-store";
import {createClipShare} from "../src/lib/clip-shares";
import {extractWav} from "../src/lib/clip-media";
nextEnv.loadEnvConfig(process.cwd());
const pool=getPool();let checks=0;function check(ok:unknown,label:string){assert(ok,label);checks++;console.log("PASS "+label);}
try{
 const account=await createTemporaryAccount(pool,{name:"Explicit disposable cleanup fixture"});
 const signed=await getAuth().api.signInEmail({body:{email:account.loginId,password:account.password},asResponse:true});
 const cookie=signed.headers.getSetCookie().map(v=>v.split(";")[0]).join("; ");
 const session=await getAuth().api.getSession({headers:new Headers({cookie})});assert(session);
 const owner={userId:session.user.id,sessionId:session.session.id,demo:false};await ensureWorkspace(pool,owner);
 const bytes=extractWav(await readFile("public/media/atlas-review.wav"),0,0.1);
 const recordingId=randomUUID(),key=`recordings/${recordingId}/original.wav`;
 await put(key,bytes,{access:"private",addRandomSuffix:false,allowOverwrite:false,contentType:"audio/wav"});
 await pool.query("INSERT INTO sounding_recording(id,owner_id,workspace_id,request_key,title,filename,mime_type,size_bytes,media_key,status) VALUES($1,$2,$3,$4,'Explicit cleanup fixture','fixture.wav','audio/wav',$5,$6,'uploaded')",[recordingId,owner.userId,`user:${owner.userId}`,randomUUID(),bytes.length,key]);
 const saved=(await getOwnedMeeting(pool,owner,"atlas-launch"))!,clip={id:randomUUID(),title:"Explicit cleanup clip fixture",start:0,end:0.1};
 await saveOwnedMeeting(pool,owner,"atlas-launch",{...saved.state,clips:[clip]},saved.revision);
 let artifact="";
 await createClipShare(pool,owner,"atlas-launch",clip,async(_m,_c,id)=>{artifact=`clips/${id}.wav`;await put(artifact,bytes,{access:"private",addRandomSuffix:false,allowOverwrite:false,contentType:"audio/wav"});return artifact;},async path=>{await del(path);});
 check((await get(key,{access:"private",useCache:false}))?.statusCode===200&&(await get(artifact,{access:"private",useCache:false}))?.statusCode===200,"fictional original and derived private objects exist before cleanup");
 // Never target any pre-existing account: expiry applies only to the ID returned above.
 await pool.query("UPDATE sounding_temporary_account SET created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' WHERE user_id=$1",[account.id]);
 check(await getAuth().api.getSession({headers:new Headers({cookie})})===null,"expired fixture cannot resolve a server session");
 const run=await fetch("https://sounding-preview-cleanup.vercel.app/api/cleanup",{headers:{authorization:"Bearer "+process.env.TEMPORARY_CLEANUP_SECRET}});
 check(run.ok,"deployed cleanup job processes the explicit expired fixture");
 check((await pool.query('SELECT 1 FROM "user" WHERE id=$1',[account.id])).rowCount===0,"expired fixture credentials and user row are deleted");
 check((await pool.query("SELECT 1 FROM sounding_recording WHERE owner_id=$1",[account.id])).rowCount===0,"expired fixture workspace and recording records cascade");
 check(!(await get(key,{access:"private",useCache:false}))&&!(await get(artifact,{access:"private",useCache:false})),"actual private original and derived objects are deleted");
 const permanent=await pool.query('SELECT count(*)::int AS count FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM sounding_temporary_account t WHERE t.user_id=u.id)');check(permanent.rows[0].count>0,"established permanent accounts remain present");
 console.log(`${checks} deployed storage-cleanup fixture checks passed; no private source recording used.`);
}catch{console.error("Explicit cleanup fixture verification failed; sensitive details suppressed.");process.exitCode=1;}finally{await pool.end();}
