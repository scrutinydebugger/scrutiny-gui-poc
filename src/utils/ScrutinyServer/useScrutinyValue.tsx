import { useCallback, useEffect, useState } from "react";
import { DatastoreEntryType } from "./datastore";
import { useScrutiny } from "./ScrutinyServer";
import { useScrutinyDatastoreEntry } from "./useScrutinyDatastoreEntry";
import { useWatcher } from "./useWatcher";

export function useScrutinyValue(props: {
  entry_type: DatastoreEntryType;
  display_path: string;
}) {
  const { entry_type, display_path } = props;
  const [value, setValue] = useState<undefined | any>();
  const { serverConnection, datastore } = useScrutiny();
  const entry = useScrutinyDatastoreEntry({
    display_path,
    entry_type,
  });
  const watcherId = useWatcher();
  useEffect(() => {
    if (!entry) return;

    datastore.watch(entry_type, entry, watcherId, setValue);
    return () => datastore.unwatch_all(watcherId);
  }, [entry, datastore, entry_type, watcherId, setValue]);

  const updateValue = useCallback(
    (newValue: number) => {
      if (!entry) throw new Error("cannot set value");
      serverConnection.send_request("write_watchable", {
        updates: [{ watchable: entry.server_id, value: newValue }],
      });
    },
    [entry, serverConnection]
  );

  return [value, updateValue, entry];
}
