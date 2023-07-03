import {
  DatastoreEntryType,
  DatastoreEntryWithName,
  SubfolderDescription,
} from "../../utils/ScrutinyServer/datastore";
import { useCallback, useEffect, useState } from "react";
import { useEventManager } from "../../utils/EventManager";
import { useEntryType } from "./useEntryType";
import { useScrutinyDatastore } from "../../utils/ScrutinyServer";

export function useFolderChildren(
  displayPath: string,
  onChange?: { (): void }
) {
  const datastore = useScrutinyDatastore();
  const entryType = useEntryType();
  const [subfolders, setSubfolders] = useState<SubfolderDescription[]>([]);
  const [entries, setEntries] = useState<DatastoreEntryWithName[]>([]);
  const { listenMany } = useEventManager();
  // here to force a refresh when needed
  const [loadSalt, setLoadSalt] = useState(0);
  const handleReload = useCallback(
    (eventName: string) => (data: { entry_type: DatastoreEntryType }) => {
      if (data.entry_type === entryType) {
        setLoadSalt(loadSalt + 1);
      }
    },
    [entryType, loadSalt, setLoadSalt]
  );

  useEffect(() => {
    try {
      const { entries, subfolders } = datastore.get_children(
        entryType,
        displayPath
      );
      setEntries(entries[entryType]);
      setSubfolders(subfolders);
    } catch (err) {
      console.warn("err get_children", err);
    }
    return listenMany(
      ["scrutiny.datastore.clear", "scrutiny.datastore.ready"].map(
        (eventName) => [eventName, handleReload(eventName)]
      )
    );
  }, [datastore, entryType, displayPath, listenMany, setEntries, handleReload]);

  return { entries, subfolders };
}
