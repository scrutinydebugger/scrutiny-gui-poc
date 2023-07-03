import { createContext, useContext } from "react";
import { DatastoreEntryType } from "../../utils/ScrutinyServer/datastore";

export const EntryTypeContext = createContext<DatastoreEntryType | null>(null);

export function useEntryType() {
  const entryType = useContext(EntryTypeContext);
  if (entryType === null)
    throw new Error("useentryType called not within a valid EntryTypeContext");

  return entryType;
}
