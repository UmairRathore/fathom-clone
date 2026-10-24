import { requireWorkspace } from "@/lib/workspace";
import { WorkspaceProvider } from "./workspace-provider";
export async function ProtectedWorkspace({ children }: { children: React.ReactNode }) {
  const { saved, profile, owner } = await requireWorkspace();
  return (
    <WorkspaceProvider
      key={owner.demo ? owner.sessionId : owner.userId}
      saved={saved}
      profile={profile}
    >
      {children}
    </WorkspaceProvider>
  );
}
