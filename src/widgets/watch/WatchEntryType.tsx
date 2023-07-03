import { DatastoreEntryType } from "../../utils/ScrutinyServer/datastore";
import { WatchEntryLocation } from "./WatchEntryLocation";

export type WatchEntryType = {
  type: "entry";
  fromLocation?: WatchEntryLocation;
  props: {
    entry_type: DatastoreEntryType;
    display_path: string;
    name?: string;
    isEditingLabel?: boolean;
    isEditingValue?: boolean;
  };
};
