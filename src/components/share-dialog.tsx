"use client";
import { useState } from "react";
import { Check, Copy, Globe2, LockKeyhole, ExternalLink } from "lucide-react";
import { Modal } from "./modal";
import type { Meeting } from "@/lib/domain";
import type { MeetingState } from "@/lib/state";
export function ShareDialog({meeting,state,changeVisibility,close}:{meeting:Meeting;state:MeetingState;changeVisibility:(value:MeetingState["sharing"])=>void;close:()=>void}){
  const [link,setLink]=useState("");
  const [expires,setExpires]=useState(0);
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState("");
  async function copy(){
    if(state.sharing==="restricted")return;
    setBusy(true);setError("");
    try{
      let url=link;
      if(!url){
        const response=await fetch("/api/shares",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({meetingId:meeting.id,visibility:state.sharing,state})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error??"Could not create the share link.");
        url=`${window.location.origin}${result.path}`;setLink(url);setExpires(result.expiresAt);
      }
      try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setError("Link created. Clipboard access is unavailable; select and copy the link below.");}
    }catch(error){setError(error instanceof Error?error.message:"Could not create the link. Try again.");}
    finally{setBusy(false);}
  }
  return <Modal title="Share Recording" close={close}><p className="modal-description">Share a read-only snapshot of <strong>{meeting.title}</strong>, including your current actions and highlights.</p><div className="share-subheading">PEOPLE WITH ACCESS</div><div className="share-owner"><span className="avatar">D</span><div><p>Demo workspace owner</p><small>Fictional workspace · this browser</small></div><small>Owner</small></div><div className="share-access">{state.sharing==="unlisted"?<Globe2 size={20}/>:<LockKeyhole size={20}/>}<div><select aria-label="Share link access" value={state.sharing} disabled={busy} onChange={e=>{changeVisibility(e.target.value as MeetingState["sharing"]);setLink("");setExpires(0);setCopied(false);setError("");}}><option value="unlisted">Anyone with the link can view</option><option value="restricted">Only the owner · restricted</option></select><p>{state.sharing==="unlisted"?"Unlisted · No account needed · Expires in 24 hours":"Guest link creation is disabled. Invitations are not available in this demo."}</p></div></div><div className="share-boundary"><LockKeyhole size={12}/><p>Links are independent, encrypted snapshots. Restricting future sharing does not revoke an existing snapshot; it expires after 24 hours. The fictional demo workspace itself is public.</p></div>{link&&<><div className="share-link"><input aria-label="Shareable recording link" value={link} readOnly onFocus={e=>e.currentTarget.select()}/></div><a className="share-preview" href={link} target="_blank" rel="noreferrer">Open read-only viewer <ExternalLink size={12}/></a><small>Expires {new Date(expires).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"})}</small></>}{error&&<p className="form-error" role="alert">{error}</p>}<div className="modal-footer"><button className="secondary-button" onClick={close}>Done</button><button className="primary-button" disabled={busy||state.sharing==="restricted"} onClick={copy}>{copied?<Check size={13}/>:<Copy size={13}/>} {busy?"Creating link…":copied?"Link Copied":"Copy Link"}</button></div></Modal>;
}
