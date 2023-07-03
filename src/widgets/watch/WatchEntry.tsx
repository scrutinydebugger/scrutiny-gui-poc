import { EntryRow } from "./EntryRow";
import { WatchEntryType } from "./WatchEntryType";
import { WatchFolderType } from "./WatchFolderType";
import { FolderRow } from "./FolderRow";
import { NestedStateFolder, useNestedState } from "../shared/useNestedState";
import { useCallback } from "react";

export function WatchEntry({
  entry,
  index,
}: {
  entry: WatchEntryType | WatchFolderType;
  index: number;
}) {
  const [entries, setEntries] = useNestedState(
    "widget",
    "entries",
    [] as Array<WatchEntryType | WatchFolderType | null>
  );
  const removeEntry = useCallback(() => {
    entries.splice(index, 1, null);
    console.debug("splicing null at", index, "should be removed soon");
    setEntries([...entries]);
  }, [index, entries, setEntries]);
  const addEntry = useCallback(
    (entry: WatchEntryType | WatchFolderType) => {
      entries.splice(index + 1, 0, entry);
      console.debug("adding entry at", index + 1);
      setEntries([...entries]);
    },
    [index, entries, setEntries]
  );
  // cleanup null entries
  const nonNull = entries.filter((e) => e !== null);
  if (nonNull.length < entries.length) {
    console.debug("removing null entries");
    setEntries(nonNull);
  }
  return (
    <NestedStateFolder name={`entries/${index}`}>
      {entry.type === "entry" ? (
        <EntryRow
          key={index}
          removeEntry={removeEntry}
          addEntry={addEntry}
          {...entry.props}
        ></EntryRow>
      ) : (
        <FolderRow key={index} removeEntry={removeEntry}></FolderRow>
      )}
    </NestedStateFolder>
  );
}
