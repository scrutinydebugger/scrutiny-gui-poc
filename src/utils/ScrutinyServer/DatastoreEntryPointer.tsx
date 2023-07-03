import { DatastoreEntry } from "./datastore";

export type DatastoreEntryPointer = Pick<
  DatastoreEntry,
  "entry_type" | "display_path"
>;
