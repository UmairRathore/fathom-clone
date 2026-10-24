import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, isDemoEmail } from "./auth";
import { getPool } from "./db";
import { ensureWorkspace, listOwnedMeetings, type Owner } from "./workspace-store";
export const currentSession = cache(async () =>
  getAuth().api.getSession({ headers: await headers() }),
);
export function ownerFor(session: NonNullable<Awaited<ReturnType<typeof currentSession>>>): Owner {
  return {
    userId: session.user.id,
    sessionId: session.session.id,
    demo: isDemoEmail(session.user.email),
  };
}
export const requireWorkspace = cache(async () => {
  const session = await currentSession();
  if (!session) redirect("/users/sign_in");
  const owner = ownerFor(session);
  await ensureWorkspace(getPool(), owner);
  const saved = await listOwnedMeetings(getPool(), owner);
  return {
    owner,
    saved,
    profile: {
      name: session.user.name,
      email: owner.demo ? "Public demo" : session.user.email,
      demo: owner.demo,
      expiresAt: session.session.expiresAt.toISOString(),
    },
  };
});
