import { useEffect, useState } from "react";
import { useScrutinyDatastore } from ".";
import { DatastoreEntryPointer } from "./DatastoreEntryPointer";
import { DatastoreEntry, DatastoreEntryType } from "./datastore";
import { useEventManager } from "../EventManager";

export function useScrutinyDatastoreEntry({
  display_path,
  entry_type,
}: DatastoreEntryPointer) {
  const datastore = useScrutinyDatastore();
  const [entry, setEntry] = useState<null | DatastoreEntry>(null);
  const { listen } = useEventManager();

  useEffect(() => {
    if (datastore.is_ready(entry_type)) {
      setEntry(datastore.get_entry(entry_type, display_path));
    } else {
      return listen(
        "scrutiny.datastore.ready",
        (data: { entry_type: DatastoreEntryType }) => {
          if (data.entry_type === entry_type)
            setEntry(datastore.get_entry(entry_type, display_path));
        }
      );
    }
  }, [datastore, listen, setEntry, entry_type, display_path]);
  return entry;
}
