import { NextRequest, NextResponse } from "next/server";
import { getMeeting } from "@/lib/data";
import { restoreState } from "@/lib/state";
import { sealShare, shareRequestSchema, SHARE_TTL } from "@/lib/sharing";
export const runtime="nodejs";
export async function POST(request:NextRequest){
  const origin=request.headers.get("origin");
  if(origin){try{if(new URL(origin).host!==request.headers.get("host"))return NextResponse.json({error:"Cross-origin sharing requests are not allowed."},{status:403});}catch{return NextResponse.json({error:"Invalid request origin."},{status:403});}}
  const secret=process.env.SHARE_SECRET;
  if(!secret||secret.length<32)return NextResponse.json({error:"Sharing is not configured. Add a 32-character SHARE_SECRET to the deployment."},{status:503});
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw)>64000)return NextResponse.json({error:"The share snapshot is too large."},{status:413});
    const parsed=shareRequestSchema.safeParse(JSON.parse(raw));
    if(!parsed.success)return NextResponse.json({error:"Invalid meeting snapshot."},{status:400});
    const {meetingId,visibility,state}=parsed.data;
    const meeting=getMeeting(meetingId);
    if(!meeting)return NextResponse.json({error:"Meeting not found."},{status:404});
    const restored=restoreState(JSON.stringify(state),meeting);
    if(JSON.stringify(restored)!==JSON.stringify(state))return NextResponse.json({error:"The snapshot has invalid timestamps or participants."},{status:400});
    const issuedAt=Date.now(),expiresAt=issuedAt+SHARE_TTL;
    const token=sealShare({version:1,meetingId,visibility,issuedAt,expiresAt,state:visibility==="unlisted"?state:undefined},secret);
    return NextResponse.json({path:`/share/${token}`,expiresAt,visibility},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Could not create a share snapshot. Check its size and try again."},{status:400});}
}


