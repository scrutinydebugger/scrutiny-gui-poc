import { ScrutinyFirmwareDescription } from "../utils/ScrutinyServer/server_api";
import { useManagedListLocalStorage } from "./useManagedListLocalStorage";

interface DashboardEntry {
  name: string;
  data: string;
  sfd: ScrutinyFirmwareDescription | null;
}

export function useDashboardStorage() {
  return useManagedListLocalStorage(
    "local",
    "dashboard",
    (entry: DashboardEntry) => {
      const { name, sfd } = entry;
      let sfdDesc = "N/A";
      if (sfd) {
        sfdDesc = sfd.metadata.project_name + " " + sfd.metadata.version;
      }
      return { name, sfdDesc };
    }
  );
}
