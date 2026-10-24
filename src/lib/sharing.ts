import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { z } from "zod";
import { stateSchema } from "./state";
export const shareRequestSchema=z.object({meetingId:z.string().min(1).max(100),visibility:z.enum(["unlisted","restricted"]),state:stateSchema});
const payloadSchema=z.object({version:z.literal(1),meetingId:z.string().min(1).max(100),visibility:z.enum(["unlisted","restricted"]),issuedAt:z.number().int(),expiresAt:z.number().int(),state:stateSchema.optional()});
export type SharePayload=z.infer<typeof payloadSchema>;
export const SHARE_TTL=24*60*60*1000;
function key(secret:string){if(secret.length<32)throw new Error("SHARE_SECRET must contain at least 32 characters");return createHash("sha256").update(secret).digest();}
export function sealShare(input:SharePayload,secret:string):string{
  const payload=payloadSchema.parse(input);
  if(payload.visibility==="restricted")delete payload.state;
  const serialized=JSON.stringify(payload);
  if(Buffer.byteLength(serialized)>60000)throw new Error("This snapshot is too large. Reduce custom actions or highlights.");
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(secret),iv);
  const compressed=deflateRawSync(Buffer.from(serialized));
  const ciphertext=Buffer.concat([cipher.update(compressed),cipher.final()]);
  const token=`v1.${Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString("base64url")}`;
  if(token.length>14000)throw new Error("This snapshot is too large for a share link.");
  return token;
}
export function openShare(token:string,secret:string,now=Date.now()):SharePayload|null{
  try{
    if(!/^v1\.[A-Za-z0-9_-]{40,14000}$/.test(token))return null;
    const bytes=Buffer.from(token.slice(3),"base64url");
    const decipher=createDecipheriv("aes-256-gcm",key(secret),bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    const compressed=Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]);
    const plain=inflateRawSync(compressed,{maxOutputLength:60000});
    const parsed=payloadSchema.safeParse(JSON.parse(plain.toString("utf8")));
    if(!parsed.success)return null;
    const p=parsed.data;
    if(p.expiresAt<=now||p.issuedAt>now+60000||p.expiresAt-p.issuedAt>SHARE_TTL||p.expiresAt<=p.issuedAt)return null;
    return p;
  }catch{return null;}
}
