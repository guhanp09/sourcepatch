import { parseWorkspace, type Workspace } from "./model";
export const STORAGE_KEY = "sourcepatch.workspace.v1";

export async function loadWorkspace(
  storage: Pick<Storage, "getItem">,
): Promise<Workspace | null> {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? parseWorkspace(raw) : null;
}
export function persistWorkspace(
  workspace: Workspace,
  storage: Pick<Storage, "setItem">,
): string | null {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return null;
  } catch {
    return "Browser storage is unavailable or full. Changes are in memory only. Export a workspace backup before closing this tab.";
  }
}
